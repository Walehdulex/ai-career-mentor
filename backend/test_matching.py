from database import SessionLocal, JobPosting, User, UserProfile, UserJobPreferences
from job_matching import JobMatchingEngine
from datetime import datetime, timedelta

print("=" * 70)
print("🔍 TESTING JOB MATCHING ENGINE")
print("=" * 70)

db = SessionLocal()

try:
    # Step 1: Check database jobs
    print("\n📊 Step 1: Checking database...")
    total_active = db.query(JobPosting).filter(JobPosting.is_active == True).count()
    print(f"   ✅ Total active jobs: {total_active}")
    
    recent_jobs = db.query(JobPosting).filter(
        JobPosting.created_at >= datetime.now() - timedelta(days=7)
    ).count()
    print(f"   ✅ Jobs added in last 7 days: {recent_jobs}")
    
    # Step 2: Show sample jobs
    print("\n📋 Step 2: Sample jobs from database:")
    sample_jobs = db.query(JobPosting).filter(JobPosting.is_active == True).limit(5).all()
    for i, job in enumerate(sample_jobs, 1):
        print(f"   {i}. {job.title} at {job.company_name}")
        print(f"      Location: {job.location}")
        print(f"      Posted: {job.posted_date}")
        print()
    
    # Step 3: Test matching engine
    print("\n🎯 Step 3: Testing matching engine...")
    matching_engine = JobMatchingEngine()
    
    # Get first user (or specify your user_id)
    user = db.query(User).first()
    if not user:
        print("   ⚠️  No users found. Please create a user account first.")
    else:
        print(f"   Testing for user: {user.email}")
        
        # Test with min_score=0 (should show ALL jobs)
        matches = matching_engine.find_matching_jobs(
            user.id, 
            db, 
            limit=20, 
            min_score=0.0
        )
        
        print(f"\n   ✅ Found {len(matches)} job matches with min_score=0.0")
        
        if matches:
            print("\n📊 Step 4: Top 5 job matches:")
            print("-" * 70)
            for i, (job, scores) in enumerate(matches[:5], 1):
                print(f"\n   {i}. {job.title}")
                print(f"      Company: {job.company_name}")
                print(f"      Location: {job.location}")
                print(f"      Match Score: {scores['overall_score']:.1f}%")
                print(f"      Breakdown:")
                print(f"        - Skills: {scores['skills_score']:.1f}%")
                print(f"        - Experience: {scores['experience_score']:.1f}%")
                print(f"        - Location: {scores['location_score']:.1f}%")
                print(f"        - Salary: {scores['salary_score']:.1f}%")
                print(f"        - Company: {scores['company_score']:.1f}%")
        else:
            print("\n   ⚠️  No matches found!")
            print("   This might indicate an issue with the matching algorithm.")
    
    print("\n" + "=" * 70)
    print("✅ TEST COMPLETE")
    print("=" * 70)
    
    if total_active > 0 and len(matches) > 0:
        print("\n🎉 SUCCESS! Everything is working correctly!")
        print("\nNext steps:")
        print("  1. Start backend: cd backend && python main.py")
        print("  2. Start frontend: cd frontend && npm run dev")
        print("  3. Visit: http://localhost:3000/jobs")
        print("  4. You should see all jobs with match scores!")
    elif total_active > 0 and len(matches) == 0:
        print("\n⚠️  ISSUE: Jobs exist but no matches found")
        print("   Check if user has a profile created")
    else:
        print("\n⚠️  ISSUE: No jobs in database")
        print("   Run: python job_api_service.py to fetch jobs")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

finally:
    db.close()