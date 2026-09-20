import logging
from typing import Dict, List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import JobPosting
from backend.job_api_service import JobAPIService

logger = logging.getLogger(__name__)

# Single place to edit the search terms. Every query costs one API call per
# enabled source, so trim this list if you hit rate limits.
JOB_QUERIES = [
    "software developer",
    "frontend developer",
    "backend developer",
    "full stack developer",
    "python developer",
    "junior developer",
    "senior developer",
    "data analyst",
    "junior data analyst",
    "senior data analyst",
    "business analyst",
    "data scientist",
    "machine learning engineer",
    "AI engineer",
    "data engineer",
]

_service = JobAPIService()  # only used for skill extraction

_COLUMNS = {c.name for c in JobPosting.__table__.columns}
# Never let API data overwrite internal tracking fields
_PROTECTED = {"id", "created_at", "updated_at", "view_count", "application_count", "is_featured"}
_INT_FIELDS = ("salary_min", "salary_max")
# Fields refreshed on jobs we already have
_REFRESH_FIELDS = (
    "description",
    "requirements",
    "apply_url",
    "salary_min",
    "salary_max",
    "salary_currency",
)


def extract_experience_level(title: str, description: str = "") -> str:
    """
    Extract experience level from job title and description
    Returns: 'Junior', 'Mid', or 'Senior'
    """
    text = (title + " " + description).lower()

    senior_keywords = [
        'senior', 'sr.', 'lead', 'principal', 'staff', 'architect',
        'head of', 'director', 'manager', 'expert', 'specialist',
        '5+ years', '5-', '6+ years', '7+ years', '8+ years',
        'experienced', 'advanced'
    ]
    junior_keywords = [
        'junior', 'jr.', 'entry', 'graduate', 'intern',
        'associate', 'trainee', '0-2 years', '1-2 years',
        'early career', 'beginner', 'starter'
    ]

    for keyword in senior_keywords:
        if keyword in text:
            return 'Senior'
    for keyword in junior_keywords:
        if keyword in text:
            return 'Junior'
    return 'Mid'


def _to_int(value) -> Optional[int]:
    """APIs return salaries as floats (45000.0); the column is Integer."""
    try:
        return int(round(float(value))) if value is not None else None
    except (TypeError, ValueError):
        return None


def _clean(job: Dict) -> Dict:
    data = {k: v for k, v in job.items() if k in _COLUMNS and k not in _PROTECTED}
    for field in _INT_FIELDS:
        if field in data:
            data[field] = _to_int(data[field])
    return data


def _refresh(existing: JobPosting, data: Dict) -> None:
    for field in _REFRESH_FIELDS:
        if data.get(field) is not None:
            setattr(existing, field, data[field])
    existing.experience_level = extract_experience_level(
        existing.title or "", existing.description or ""
    )
    if not existing.dedupe_key:
        existing.dedupe_key = data["dedupe_key"]


def upsert_jobs(db: Session, jobs: List[Dict]) -> Dict[str, int]:
    """
    - Same (source, external_id)  -> refresh a few fields. is_active is left
      alone so jobs your cleanup deactivated don't flap back to active.
    - Same job from another source -> skipped via dedupe_key.
    - Otherwise                    -> inserted.

    Existing rows are looked up in two batched queries (not one per job) to
    keep round trips to Supabase low, which matters for the cron timeout.
    """
    stats = {"inserted": 0, "updated": 0, "duplicates": 0, "invalid": 0, "errors": 0}

    valid: List[Dict] = []
    for job in jobs:
        if not job.get("title") or not job.get("external_id") or not job.get("source"):
            stats["invalid"] += 1
            continue
        data = _clean(job)
        data["dedupe_key"] = job.get("dedupe_key") or JobAPIService.build_dedupe_key(job)
        valid.append(data)

    if not valid:
        return stats

    external_ids = {d["external_id"] for d in valid}
    dedupe_keys = {d["dedupe_key"] for d in valid}

    existing_by_id = {
        (row.source, row.external_id): row
        for row in db.query(JobPosting).filter(JobPosting.external_id.in_(list(external_ids))).all()
    }
    known_keys = {
        key
        for (key,) in db.query(JobPosting.dedupe_key)
        .filter(JobPosting.dedupe_key.in_(list(dedupe_keys)))
        .all()
    }

    to_insert: List[Dict] = []
    seen_ids = set()

    for data in valid:
        ident = (data["source"], data["external_id"])
        if ident in seen_ids:
            stats["duplicates"] += 1
            continue
        seen_ids.add(ident)

        existing = existing_by_id.get(ident)
        if existing:
            _refresh(existing, data)
            stats["updated"] += 1
            continue

        if data["dedupe_key"] in known_keys:
            stats["duplicates"] += 1
            continue
        known_keys.add(data["dedupe_key"])

        description = data.get("description") or ""
        data["salary_currency"] = data.get("salary_currency") or "GBP"
        data["experience_level"] = data.get("experience_level") or extract_experience_level(
            data["title"], description
        )
        data["required_skills"] = data.get("required_skills") or _service.extract_skills_from_description(
            description
        )
        to_insert.append(data)

    # Persist refreshes first so a failed insert can't undo them
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to commit refreshed jobs")
        stats["errors"] += stats["updated"]
        stats["updated"] = 0

    if to_insert:
        try:
            db.add_all([JobPosting(**d) for d in to_insert])
            db.commit()
            stats["inserted"] += len(to_insert)
        except IntegrityError:
            # Something collided (e.g. old global unique index on external_id).
            # Fall back to row-by-row so one bad job doesn't sink the batch.
            db.rollback()
            for d in to_insert:
                try:
                    with db.begin_nested():
                        db.add(JobPosting(**d))
                    stats["inserted"] += 1
                except IntegrityError:
                    stats["duplicates"] += 1
                except Exception:
                    logger.exception("Failed to save job %s/%s", d.get("source"), d.get("external_id"))
                    stats["errors"] += 1
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to save %d new jobs", len(to_insert))
            stats["errors"] += len(to_insert)

    return stats


def fetch_and_save_jobs(
    db: Session,
    service: JobAPIService,
    queries: Optional[List[str]] = None,
    location: str = "United Kingdom",
    per_query: int = 20,
) -> Dict[str, int]:
    """Fetch every query from all enabled sources and save the results."""
    totals = {
        "fetched": 0,
        "inserted": 0,
        "updated": 0,
        "duplicates": 0,
        "invalid": 0,
        "errors": 0,
        "failed_queries": 0,
    }

    for query in queries or JOB_QUERIES:
        try:
            jobs = service.fetch_and_store_jobs(query, location, per_query)
            stats = upsert_jobs(db, jobs)
        except Exception:
            db.rollback()
            logger.exception("Query %r failed", query)
            totals["failed_queries"] += 1
            continue

        totals["fetched"] += len(jobs)
        for key, value in stats.items():
            totals[key] += value
        logger.info("%s: fetched %d -> %s", query, len(jobs), stats)

    logger.info("Job fetch complete: %s", totals)
    return totals


def backfill_dedupe_keys(db: Session, batch_size: int = 500) -> int:
    """One-off: give existing rows a dedupe_key so new sources can match against them."""
    updated = 0
    while True:
        rows = (
            db.query(JobPosting)
            .filter(JobPosting.dedupe_key.is_(None))
            .limit(batch_size)
            .all()
        )
        if not rows:
            break
        for row in rows:
            row.dedupe_key = JobAPIService.build_dedupe_key(
                {
                    "source": row.source,
                    "external_id": row.external_id,
                    "title": row.title,
                    "company_name": row.company_name,
                    "location": row.location,
                }
            )
        db.commit()
        updated += len(rows)
    logger.info("Backfilled dedupe_key on %d rows", updated)
    return updated