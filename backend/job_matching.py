from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from database import User, JobPosting, JobMatch, UserJobPreferences, UserProfile
import json

class JobMatchingEngine:
    """Intelligent job matching algorithm"""
    
    def calculate_match_score(
        self,
        user: User,
        job: JobPosting,
        user_profile: UserProfile,
        user_preferences: UserJobPreferences
    ) -> Tuple[float, Dict]:
        """
        Calculate overall match score between user and job
        Returns: (overall_score, detailed_scores)
        """
        
        # Initialize scores
        skills_score = self._calculate_skills_score(user_profile, job)
        experience_score = self._calculate_experience_score(user_profile, job)
        location_score = self._calculate_location_score(user_preferences, job)
        salary_score = self._calculate_salary_score(user_preferences, job)
        company_score = self._calculate_company_score(user_preferences, job)
        
        # Weighted average (customize weights based on importance)
        weights = {
            'skills': 0.35,
            'experience': 0.25,
            'location': 0.15,
            'salary': 0.15,
            'company': 0.10
        }
        
        overall_score = (
            skills_score * weights['skills'] +
            experience_score * weights['experience'] +
            location_score * weights['location'] +
            salary_score * weights['salary'] +
            company_score * weights['company']
        )
        
        detailed_scores = {
            'skills_score': skills_score,
            'experience_score': experience_score,
            'location_score': location_score,
            'salary_score': salary_score,
            'company_score': company_score,
            'overall_score': overall_score
        }
        
        return overall_score, detailed_scores
    
    def _calculate_skills_score(self, user_profile: UserProfile, job: JobPosting) -> float:
        """Calculate how well user's skills match job requirements"""
        if not user_profile or not user_profile.technical_skills:
            return 0.0
        
        try:
            user_skills = set(json.loads(user_profile.technical_skills))
        except:
            user_skills = set()
        
        # Get job required and preferred skills
        job_required = set(job.required_skills or [])
        job_preferred = set(job.preferred_skills or [])
        job_tech = set(job.technologies or [])
        
        all_job_skills = job_required | job_preferred | job_tech
        
        if not all_job_skills:
            return 50.0  # Neutral score if no skills specified
        
        # Calculate matches
        matching_skills = user_skills & all_job_skills
        required_matches = user_skills & job_required
        
        # Score calculation
        if job_required:
            required_score = (len(required_matches) / len(job_required)) * 100
        else:
            required_score = 100
        
        overall_match_rate = (len(matching_skills) / len(all_job_skills)) * 100
        
        # Weighted combination (required skills are more important)
        score = (required_score * 0.7) + (overall_match_rate * 0.3)
        
        return min(score, 100.0)
    
    def _calculate_experience_score(self, user_profile: UserProfile, job: JobPosting) -> float:
        """Calculate experience level match"""
        if not user_profile or not user_profile.experience_level:
            return 50.0
        
        user_level = user_profile.experience_level.lower()
        job_level = (job.experience_level or "").lower()
        
        # Experience level hierarchy
        levels = {'junior': 1, 'mid': 2, 'senior': 3, 'lead': 4, 'executive': 5}
        
        user_level_num = levels.get(user_level, 2)
        job_level_num = levels.get(job_level, 2)
        
        # Perfect match = 100
        # One level difference = 70
        # Two+ levels difference = 40
        difference = abs(user_level_num - job_level_num)
        
        if difference == 0:
            return 100.0
        elif difference == 1:
            return 70.0
        elif difference == 2:
            return 40.0
        else:
            return 20.0
    
    def _calculate_location_score(self, user_preferences: UserJobPreferences, job: JobPosting) -> float:
        """Calculate location compatibility"""
        if not user_preferences:
            return 50.0
        
        # Remote work preference
        if user_preferences.remote_preference == "remote_only" and job.remote_type == "remote":
            return 100.0
        elif user_preferences.remote_preference == "remote_only" and job.remote_type != "remote":
            return 10.0
        elif user_preferences.remote_preference == "flexible":
            return 80.0
        
        # Check if job location is in preferred locations
        if user_preferences.preferred_locations:
            try:
                preferred_locs = json.loads(user_preferences.preferred_locations)
                if any(loc.lower() in job.location.lower() for loc in preferred_locs):
                    return 100.0
            except:
                pass
        
        # Willing to relocate
        if user_preferences.willing_to_relocate:
            return 60.0
        
        return 30.0
    
    def _calculate_salary_score(self, user_preferences: UserJobPreferences, job: JobPosting) -> float:
        """Calculate salary compatibility"""
        if not user_preferences or not user_preferences.minimum_salary:
            return 50.0
        
        if not job.salary_min and not job.salary_max:
            return 50.0  # No salary info available
        
        user_min = user_preferences.minimum_salary
        job_max = job.salary_max or job.salary_min
        
        if not job_max:
            return 50.0
        
        if job_max >= user_min:
            # Calculate how much above minimum
            excess_percentage = ((job_max - user_min) / user_min) * 100
            score = min(100, 70 + (excess_percentage / 2))
            return score
        else:
            # Below minimum - lower score
            shortfall_percentage = ((user_min - job_max) / user_min) * 100
            score = max(0, 70 - shortfall_percentage)
            return score
    
    def _calculate_company_score(self, user_preferences: UserJobPreferences, job: JobPosting) -> float:
        """Calculate company preference match"""
        if not user_preferences:
            return 50.0
        
        score = 50.0
        
        # Check preferred companies
        if user_preferences.preferred_companies:
            try:
                preferred_companies = json.loads(user_preferences.preferred_companies)
                if any(comp.lower() in job.company_name.lower() for comp in preferred_companies):
                    score += 30.0
            except:
                pass
        
        # Check company size preference
        if user_preferences.company_sizes and job.company_size:
            try:
                preferred_sizes = json.loads(user_preferences.company_sizes)
                if job.company_size in preferred_sizes:
                    score += 20.0
            except:
                pass
        
        return min(score, 100.0)
    
    def find_matching_jobs(
        self,
        user_id: int,
        db: Session,
        limit: int = 20,
        min_score: float = 0.0
    ) -> List[Tuple[JobPosting, Dict]]:
        """Find and score jobs for a user"""
        
        # Get user data
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        user_preferences = db.query(UserJobPreferences).filter(UserJobPreferences.user_id == user_id).first()
        
        
        # Get active jobs
        jobs = db.query(JobPosting).filter(JobPosting.is_active == True).all()
        
        # Score each job
        job_scores = []
        for job in jobs:
            overall_score, detailed_scores = self.calculate_match_score(
                user, job, user_profile, user_preferences
            )
            
            if overall_score >= min_score:
                job_scores.append((job, detailed_scores, overall_score))
        
        # Sort by score (highest first)
        job_scores.sort(key=lambda x: x[2], reverse=True)
        
        # Return top matches
        return [(job, scores) for job, scores, _ in job_scores[:limit]]