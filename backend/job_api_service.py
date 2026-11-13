import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

DEFAULT_SOURCES = "adzuna,reed,jsearch"

COUNTRY_WIDE_LOCATIONS = {"united kingdom", "uk", "gb", "great britain", "england", ""}

# Adzuna country code -> salary currency (unknown codes get None rather than a wrong guess)
ADZUNA_CURRENCIES = {"gb": "GBP", "us": "USD", "ca": "CAD", "au": "AUD", "nz": "NZD", "in": "INR"}


class JobAPIService:
    """Service to fetch jobs from multiple APIs"""

    def __init__(self):
        # API keys from environment variables
        self.adzuna_app_id = os.getenv("ADZUNA_APP_ID")
        self.adzuna_api_key = os.getenv("ADZUNA_API_KEY")
        self.reed_api_key = os.getenv("REED_API_KEY")
        self.jsearch_api_key = os.getenv("JSEARCH_API_KEY")

        raw_sources = os.getenv("JOB_SOURCES", DEFAULT_SOURCES)
        self.enabled_sources = [s.strip().lower() for s in raw_sources.split(",") if s.strip()]

    # Small helpers
 
    @staticmethod
    def _utcnow() -> datetime:
        """Naive UTC 'now' (keeps datetimes consistent with what the DB already stores)."""
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def _to_naive_utc(dt: datetime) -> datetime:
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt

    def _parse_iso_date(self, value) -> Optional[datetime]:
        if not value:
            return None
        try:
            return self._to_naive_utc(datetime.fromisoformat(str(value).replace("Z", "+00:00")))
        except ValueError:
            return None

    @staticmethod
    def _guess_employment_type(text: str, default: str = "full-time") -> str:
        text = (text or "").lower()
        if "part-time" in text or "part time" in text:
            return "part-time"
        if "contract" in text or "freelance" in text:
            return "contract"
        if "internship" in text or "placement" in text:
            return "internship"
        return default

   
    # Adzuna
   
    def fetch_adzuna_jobs(
        self,
        query: str,
        location: str = "gb",
        results_per_page: int = 20,
        page: int = 1,
    ) -> List[Dict]:
        """
        Fetch jobs from Adzuna API
        Free tier: 250 calls/month
        Docs: https://developer.adzuna.com/overview
        """
        if not self.adzuna_app_id or not self.adzuna_api_key:
            logger.warning("Adzuna API credentials not configured")
            return []

        try:
            url = f"https://api.adzuna.com/v1/api/jobs/{location}/search/{page}"
            params = {
                "app_id": self.adzuna_app_id,
                "app_key": self.adzuna_api_key,
                "results_per_page": results_per_page,
                "what": query,
            }

            # NOTE: deliberately not logging params - they contain the API key.
            logger.info("Calling Adzuna (query=%r, page=%s)", query, page)
            response = requests.get(url, params=params, timeout=30)
            logger.info("Adzuna status: %s", response.status_code)
            response.raise_for_status()

            data = response.json()
            jobs = []

            for job in data.get("results", []):
                posted_date = self._parse_iso_date(job.get("created")) or self._utcnow()

                company = job.get("company")
                company_name = (
                    company.get("display_name", "Unknown")
                    if isinstance(company, dict)
                    else str(company or "Unknown")
                )

                loc = job.get("location")
                location_name = (
                    loc.get("display_name", "") if isinstance(loc, dict) else str(loc or "")
                )

                description = job.get("description", "") or ""

                jobs.append(
                    {
                        "title": job.get("title"),
                        "company_name": company_name,
                        "location": location_name,
                        "description": description,
                        "salary_min": job.get("salary_min"),
                        "salary_max": job.get("salary_max"),
                        "salary_currency": ADZUNA_CURRENCIES.get(location),
                        "external_id": str(job.get("id", "")),
                        "source": "adzuna",
                        "apply_url": job.get("redirect_url"),
                        "posted_date": posted_date,
                        "remote_type": self._detect_remote_type(description),
                        "employment_type": str(job.get("contract_type", "full-time")).lower(),
                        "is_active": True,
                    }
                )

            logger.info("Fetched %d jobs from Adzuna", len(jobs))
            return jobs

        except requests.exceptions.HTTPError as e:
            body = e.response.text[:200] if e.response is not None else "No response"
            logger.error("Adzuna HTTP error: %s | %s", e, body)
            return []
        except Exception:
            logger.exception("Error fetching Adzuna jobs")
            return []


    # Reed
   
    def fetch_reed_jobs(
        self,
        query: str,
        location: str = "United Kingdom",
        results_to_take: int = 20,
    ) -> List[Dict]:
        """
        Fetch jobs from Reed API (UK-focused)
        Docs: https://www.reed.co.uk/developers/jobseeker
        Auth: API key as the basic-auth username, blank password.
        Note: search results only include a snippet of the description.
        """
        if not self.reed_api_key:
            logger.warning("Reed API key not configured")
            return []

        try:
            params = {
                "keywords": query,
                "resultsToTake": min(results_to_take, 100),
            }
            # Reed's locationName expects a town/city; skip it for country-wide searches.
            if location and location.strip().lower() not in COUNTRY_WIDE_LOCATIONS:
                params["locationName"] = location

            logger.info("Calling Reed (query=%r)", query)
            response = requests.get(
                "https://www.reed.co.uk/api/1.0/search",
                params=params,
                auth=(self.reed_api_key, ""),
                timeout=30,
            )
            logger.info("Reed status: %s", response.status_code)
            response.raise_for_status()

            data = response.json()
            jobs = []

            for job in data.get("results", []):
                # Reed dates come back as dd/mm/yyyy
                posted_date = None
                raw_date = job.get("date")
                if raw_date:
                    try:
                        posted_date = datetime.strptime(raw_date, "%d/%m/%Y")
                    except ValueError:
                        posted_date = None
                posted_date = posted_date or self._utcnow()

                title = job.get("jobTitle") or ""
                description = job.get("jobDescription") or ""
                sal_min = job.get("minimumSalary")
                sal_max = job.get("maximumSalary")
                employment_type = self._guess_employment_type(f"{title} {description}")
                if max(sal_min or 0, sal_max or 0) < 5000:
                    if sal_min or sal_max:
                        employment_type = "contract"
                    sal_min = sal_max = None

                jobs.append(
                    {
                        "title": title,
                        "company_name": job.get("employerName") or "Unknown",
                        "location": job.get("locationName") or "",
                        "description": description,
                        "salary_min": sal_min,
                        "salary_max": sal_max,
                        "salary_currency": job.get("currency") or "GBP",
                        "external_id": str(job.get("jobId", "")),
                        "source": "reed",
                        "apply_url": job.get("jobUrl"),
                        "posted_date": posted_date,
                        "remote_type": self._detect_remote_type(f"{title} {description}"),
                        "employment_type": employment_type,
                        "is_active": True,
                    }
                )

            logger.info("Fetched %d jobs from Reed", len(jobs))
            return jobs

        except requests.exceptions.HTTPError as e:
            body = e.response.text[:200] if e.response is not None else "No response"
            logger.error("Reed HTTP error: %s | %s", e, body)
            return []
        except Exception:
            logger.exception("Error fetching Reed jobs")
            return []

   
    # JSearch
  
    def fetch_jsearch_jobs(
        self,
        query: str,
        location: str = "United Kingdom",
        num_pages: int = 1,
    ) -> List[Dict]:
        """
        Fetch jobs from JSearch API (RapidAPI)
        Free tier: 100 requests/month
        Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
        """
        if not self.jsearch_api_key:
            logger.warning("JSearch API key not configured")
            return []

        try:
            url = "https://jsearch.p.rapidapi.com/search"
            headers = {
                "X-RapidAPI-Key": self.jsearch_api_key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            }
            params = {
                "query": f"{query} in {location}",
                "page": "1",
                "num_pages": str(num_pages),
            }

            logger.info("Calling JSearch (query=%r)", query)
            response = requests.get(url, headers=headers, params=params, timeout=20)
            response.raise_for_status()

            data = response.json()
            jobs = []

            for job in data.get("data", []):
                highlights = job.get("job_highlights") or {}

                posted_ts = job.get("job_posted_at_timestamp")
                posted_date = (
                    datetime.fromtimestamp(posted_ts, tz=timezone.utc).replace(tzinfo=None)
                    if posted_ts
                    else self._utcnow()
                )

                jobs.append(
                    {
                        "title": job.get("job_title"),
                        "company_name": job.get("employer_name") or "Unknown",
                        "company_logo_url": job.get("employer_logo"),
                        "location": job.get("job_city") or job.get("job_country") or "",
                        "description": job.get("job_description") or "",
                        "requirements": "\n".join(highlights.get("Qualifications") or []),
                        "salary_min": job.get("job_min_salary"),
                        "salary_max": job.get("job_max_salary"),
                        "salary_currency": job.get("job_salary_currency"),
                        "external_id": job.get("job_id"),
                        "source": "jsearch",
                        "apply_url": job.get("job_apply_link"),
                        "posted_date": posted_date,
                        "remote_type": "remote" if job.get("job_is_remote") else "onsite",
                        "employment_type": (job.get("job_employment_type") or "FULLTIME").lower(),
                        "is_active": True,
                    }
                )

            logger.info("Fetched %d jobs from JSearch", len(jobs))
            return jobs

        except requests.exceptions.HTTPError as e:
            body = e.response.text[:200] if e.response is not None else "No response"
            logger.error("JSearch HTTP error: %s | %s", e, body)
            return []
        except Exception:
            logger.exception("Error fetching JSearch jobs")
            return []

    
    # Detection helpers (unchanged behaviour)
   
    def _detect_remote_type(self, description: str) -> str:
        """Detect if job is remote, hybrid, or onsite from description"""
        description_lower = (description or "").lower()

        if any(word in description_lower for word in ["fully remote", "100% remote", "remote work", "work from home"]):
            return "remote"
        elif any(word in description_lower for word in ["hybrid", "flexible working", "remote option"]):
            return "hybrid"
        else:
            return "onsite"

    def extract_skills_from_description(self, description: str) -> List[str]:
        """Extract technical skills from job description"""
        tech_skills = [
            'python', 'java', 'javascript', 'typescript', 'react', 'angular',
            'vue', 'node.js', 'django', 'flask', 'fastapi', 'spring', 'sql',
            'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'gcp', 'docker',
            'kubernetes', 'git', 'ci/cd', 'agile', 'scrum', 'rest api', 'graphql'
        ]

        description_lower = (description or "").lower()
        return [skill for skill in tech_skills if skill in description_lower]

   
    # Orchestration
    
    @staticmethod
    def build_dedupe_key(job: Dict) -> str:
        """
        Cross-source duplicate key: title + company + primary location.
        Falls back to source + external_id when the company is unknown, so
        different jobs from unnamed employers don't get collapsed together.
        """

        def norm(value: Optional[str]) -> str:
            return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()

        company = norm(job.get("company_name"))
        if not company or company == "unknown":
            return f"{job.get('source')}:{job.get('external_id')}"

        primary_location = norm((job.get("location") or "").split(",")[0])
        return f"{norm(job.get('title'))}|{company}|{primary_location}"

    @staticmethod
    def _safe_fetch(name: str, fetcher: Callable[[], List[Dict]]) -> List[Dict]:
        """One provider blowing up should never take the whole run down."""
        try:
            return fetcher() or []
        except Exception:
            logger.exception("Source %s failed", name)
            return []

    def fetch_and_store_jobs(
        self,
        query: str,
        location: str = "United Kingdom",
        max_jobs: int = 50,
    ) -> List[Dict]:
        """
        Fetch jobs from all enabled sources (see JOB_SOURCES env var),
        in parallel, then dedupe across sources.
        Source order matters: earlier sources win when duplicates are found.
        """
        fetchers: Dict[str, Callable[[], List[Dict]]] = {
            "adzuna": lambda: self.fetch_adzuna_jobs(
                query, location="gb", results_per_page=min(max_jobs, 20)
            ),
            "reed": lambda: self.fetch_reed_jobs(
                query, location=location, results_to_take=min(max_jobs, 20)
            ),
            "jsearch": lambda: self.fetch_jsearch_jobs(query, location=location),
        }

        unknown = [s for s in self.enabled_sources if s not in fetchers]
        if unknown:
            logger.warning("Ignoring unknown job sources in JOB_SOURCES: %s", unknown)

        active = [s for s in self.enabled_sources if s in fetchers]
        if not active:
            logger.warning("No valid job sources enabled")
            return []

        # Run providers in parallel so total time is roughly the slowest one
        # (helps with the cron-job.org timeout on Render cold starts).
        with ThreadPoolExecutor(max_workers=len(active)) as pool:
            futures = [(name, pool.submit(self._safe_fetch, name, fetchers[name])) for name in active]
            results = [(name, future.result()) for name, future in futures]

        all_jobs: List[Dict] = []
        seen = set()
        duplicates = 0

        for name, jobs in results:
            kept = 0
            for job in jobs[:max_jobs]:
                key = self.build_dedupe_key(job)
                if key in seen:
                    duplicates += 1
                    continue
                seen.add(key)
                job["dedupe_key"] = key
                all_jobs.append(job)
                kept += 1
            logger.info("Source %s: fetched %d, kept %d", name, len(jobs), kept)

        logger.info("Total %d jobs (%d cross-source duplicates dropped)", len(all_jobs), duplicates)
        return all_jobs