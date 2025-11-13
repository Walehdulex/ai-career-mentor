from database import SessionLocal, JobPosting
from job_api_service import JobAPIService
from datetime import datetime, timedelta

print("=" * 70)
print("🔧 FIXING JOBS DATABASE")
print("=" * 70)

db = SessionLocal()
service = JobAPIService()

try:
    # Step 1: Check current jobs
    print("\n📊 Step 1: Current database status...")
    total_jobs = db.query(JobPosting).count()
    active_jobs = db.query(JobPosting).filter(JobPosting.is_active == True).count()
    print(f"   Total jobs: {total_jobs}")
    print(f"   Active jobs: {active_jobs}")
    
    # Step 2: Deactivate old jobs (older than 30 days)
    print("\n🧹 Step 2: Cleaning up old jobs...")
    cutoff_date = datetime.now() - timedelta(days=30)
    old_jobs = db.query(JobPosting).filter(
        JobPosting.posted_date < cutoff_date
    ).update({"is_active": False})
    db.commit()
    print(f"   ✅ Deactivated {old_jobs} old jobs (>30 days)")
    
    # Step 3: Fetch fresh jobs from Adzuna
    print("\n📥 Step 3: Fetching fresh jobs from Adzuna...")
    
    # Fetch multiple searches to get more variety
    search_queries = [
        "software developer",
        "frontend developer", 
        "backend developer",
        "full stack developer",
        "python developer",
        "javascript developer",
        "react developer",
        "node developer"
    ]
    
    total_fetched = 0
    for query in search_queries:
        print(f"   Searching: {query}...")
        jobs = service.fetch_and_store_jobs(query, "UK", results_per_page=50)
        total_fetched += len(jobs)
        print(f"   ✅ Found {len(jobs)} jobs")
    
    print(f"\n   Total jobs fetched: {total_fetched}")
    
    # Step 4: Final status
    print("\n📊 Step 4: Final database status...")
    new_total = db.query(JobPosting).count()
    new_active = db.query(JobPosting).filter(JobPosting.is_active == True).count()
    recent_jobs = db.query(JobPosting).filter(
        JobPosting.posted_date >= datetime.now() - timedelta(days=7)
    ).count()
    
    print(f"   Total jobs: {new_total}")
    print(f"   Active jobs: {new_active}")
    print(f"   Jobs from last 7 days: {recent_jobs}")
    
    print("\n" + "=" * 70)
    print("✅ JOB DATABASE UPDATED SUCCESSFULLY!")
    print("=" * 70)
    print("\nNext steps:")
    print("  1. Restart backend: python main.py")
    print("  2. Refresh your browser at http://localhost:3000/dashboard/jobs")
    print("  3. You should see fresh jobs now!")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
    
finally:
    db.close()