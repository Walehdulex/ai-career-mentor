import requests
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json

class JobAPIService:
    """Service to fetch jobs from multiple APIs"""
    
    def __init__(self):
        # API keys from environment variables
        self.adzuna_app_id = os.getenv("ADZUNA_APP_ID")
        self.adzuna_api_key = os.getenv("ADZUNA_API_KEY")
        self.jsearch_api_key = os.getenv("JSEARCH_API_KEY")

    
    def fetch_adzuna_jobs(
        self, 
        query: str, 
        location: str = "gb",
        results_per_page: int = 20,
        page: int = 1
    ) -> List[Dict]:
        """  
        Fetch jobs from Adzuna API
        Free tier: 250 calls/month
        Docs: https://developer.adzuna.com/overview
        """
        if not self.adzuna_app_id or not self.adzuna_api_key:
            print("Adzuna API credentials not configured")
            return []
        
        try:
            # Correct Adzuna API URL format
            url = f"https://api.adzuna.com/v1/api/jobs/{location}/search/{page}"
            
            params = {
                "app_id": self.adzuna_app_id,
                "app_key": self.adzuna_api_key,
                "results_per_page": results_per_page,
                "what": query
                # Removed content-type from params
            }
            
            print(f"Calling Adzuna: {url}")
            print(f"Params: {params}")
            
            response = requests.get(url, params=params, timeout=30)
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:200]}")  # First 200 chars
            
            response.raise_for_status()
            
            data = response.json()
            jobs = []
            
            for job in data.get("results", []):
                # Parse job created date properly
                posted_date = None
                if job.get("created"):
                    try:
                        posted_date = datetime.strptime(job.get("created"), "%Y-%m-%dT%H:%M:%SZ")
                    except:
                        try:
                            # Try alternative format
                            posted_date = datetime.fromisoformat(job.get("created").replace("Z", "+00:00"))
                        except:
                            posted_date = datetime.utcnow()
                
                parsed_job = {
                    "title": job.get("title"),
                    "company_name": job.get("company", {}).get("display_name", "Unknown") if isinstance(job.get("company"), dict) else str(job.get("company", "Unknown")),
                    "location": job.get("location", {}).get("display_name", "") if isinstance(job.get("location"), dict) else str(job.get("location", "")),
                    "description": job.get("description", ""),
                    "salary_min": job.get("salary_min"),
                    "salary_max": job.get("salary_max"),
                    "external_id": str(job.get("id", "")),
                    "source": "adzuna",
                    "apply_url": job.get("redirect_url"),
                    "posted_date": posted_date,
                    "remote_type": self._detect_remote_type(job.get("description", "")),
                    "employment_type": str(job.get("contract_type", "full-time")).lower(),
                    "is_active": True
                }
                jobs.append(parsed_job)
            
            print(f"Successfully fetched {len(jobs)} jobs from Adzuna")
            return jobs
            
        except requests.exceptions.HTTPError as e:
            print(f"Adzuna HTTP Error: {e}")
            print(f"Response text: {e.response.text if hasattr(e, 'response') else 'No response'}")
            return []
        except Exception as e:
            print(f"Error fetching Adzuna jobs: {e}")
            import traceback
            traceback.print_exc()
            return []

    
    def fetch_jsearch_jobs(
        self,
        query: str,
        location: str = "United Kingdom",
        num_pages: int = 1
    ) -> List[Dict]:
        """
        Fetch jobs from JSearch API (RapidAPI)
        Free tier: 100 requests/month
        Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
        """
        if not self.jsearch_api_key:
            print("JSearch API key not configured")
            return []
        
        try:
            url = "https://jsearch.p.rapidapi.com/search"
            headers = {
                "X-RapidAPI-Key": self.jsearch_api_key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
            }
            params = {
                "query": f"{query} in {location}",
                "page": "1",
                "num_pages": str(num_pages)
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            jobs = []
            
            for job in data.get("data", []):
                parsed_job = {
                    "title": job.get("job_title"),
                    "company_name": job.get("employer_name", "Unknown"),
                    "company_logo_url": job.get("employer_logo"),
                    "location": job.get("job_city") or job.get("job_country", ""),
                    "description": job.get("job_description", ""),
                    "requirements": job.get("job_highlights", {}).get("Qualifications", []),
                    "salary_min": job.get("job_min_salary"),
                    "salary_max": job.get("job_max_salary"),
                    "external_id": job.get("job_id"),
                    "source": "jsearch",
                    "apply_url": job.get("job_apply_link"),
                    "posted_date": datetime.fromtimestamp(job.get("job_posted_at_timestamp")) if job.get("job_posted_at_timestamp") else None,
                    "remote_type": job.get("job_is_remote") and "remote" or "onsite",
                    "employment_type": job.get("job_employment_type", "FULLTIME").lower(),
                    "is_active": True
                }
                jobs.append(parsed_job)
            
            return jobs
            
        except Exception as e:
            print(f"Error fetching JSearch jobs: {e}")
            return []
        

    def _detect_remote_type(self, description: str) -> str:
        """Detect if job is remote, hybrid, or onsite from description"""
        description_lower = description.lower()
        
        if any(word in description_lower for word in ["fully remote", "100% remote", "remote work", "work from home"]):
            return "remote"
        elif any(word in description_lower for word in ["hybrid", "flexible working", "remote option"]):
            return "hybrid"
        else:
            return "onsite"
    
    def extract_skills_from_description(self, description: str) -> List[str]:
        """Extract technical skills from job description"""
        # Common tech skills to look for
        tech_skills = [
            'python', 'java', 'javascript', 'typescript', 'react', 'angular', 
            'vue', 'node.js', 'django', 'flask', 'fastapi', 'spring', 'sql',
            'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'gcp', 'docker',
            'kubernetes', 'git', 'ci/cd', 'agile', 'scrum', 'rest api', 'graphql'
        ]
        
        description_lower = description.lower()
        found_skills = []
        
        for skill in tech_skills:
            if skill in description_lower:
                found_skills.append(skill)
        
        return found_skills
    
    def fetch_and_store_jobs(
        self,
        query: str,
        location: str = "United Kingdom",
        max_jobs: int = 50
    ) -> List[Dict]:
        """Fetch jobs from all available sources"""
        all_jobs = []
        
        # Fetch from Adzuna
        adzuna_jobs = self.fetch_adzuna_jobs(query, location="gb", results_per_page=min(max_jobs, 20))
        all_jobs.extend(adzuna_jobs)
        
        # # Fetch from JSearch if needed
        # if len(all_jobs) < max_jobs and self.jsearch_api_key:
        #     jsearch_jobs = self.fetch_jsearch_jobs(query, location=location)
        #     all_jobs.extend(jsearch_jobs[:max_jobs - len(all_jobs)])
        
        return all_jobs