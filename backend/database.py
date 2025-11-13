from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

#Database Setup
DATABASE_URL = "sqlite:///./career_mentor.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# User Management Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="job_seeker")  # job_seeker, recruiter, admin
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Usage tracking
    resume_analyses_count = Column(Integer, default=0)
    cover_letters_count = Column(Integer, default=0)
    optimizations_count = Column(Integer, default=0)
    chat_messages_count = Column(Integer, default=0)
    
    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    resume_analyses = relationship("ResumeAnalysis", back_populates="user", cascade="all, delete-orphan")
    user_profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    job_preferences = relationship("UserJobPreferences", back_populates="user", uselist=False)
    applications = relationship("JobApplication", back_populates="user")
    saved_jobs = relationship("SavedJob", back_populates="user")
    job_matches = relationship("JobMatch", back_populates="user")
    job_alerts = relationship("JobAlert", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Professional Information
    current_title = Column(String)
    experience_level = Column(String)  # junior, mid, senior, lead, executive
    industry = Column(String)
    location = Column(String)
    salary_range = Column(String)
    
    # Skills and Preferences
    technical_skills = Column(Text)  # JSON string
    soft_skills = Column(Text)  # JSON string
    certifications = Column(Text)  # JSON string
    languages = Column(Text)  # JSON string
    
    # Job Preferences
    preferred_roles = Column(Text)  # JSON string
    preferred_companies = Column(Text)  # JSON string
    remote_preference = Column(String)  # remote, hybrid, onsite, flexible
    willing_to_relocate = Column(Boolean, default=False)
    
    # Social Links
    linkedin_url = Column(String)
    github_url = Column(String)
    portfolio_url = Column(String)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="user_profile")


#Models
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for backward compatibility
    session_id = Column(String, unique=True, index=True)
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    #Relationship to messages
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.session_id"))
    role = Column(String)  # 'user' or 'ai'
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    #Relationship to session
    session = relationship("ChatSession", back_populates="messages")

class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for backward compatibility
    filename = Column(String)
    
    # Contact Information
    email = Column(String)
    phone = Column(String)
    linkedin = Column(String)
    github = Column(String)
    portfolio = Column(String)

    # Analysis Results
    skills_data = Column(Text)  # JSON string of skills
    education_data = Column(Text)  # JSON string of education
    experience_data = Column(Text)  # JSON string of experience
    certifications_data = Column(Text)  # JSON string of certifications
    
    # Metrics
    experience_years = Column(Integer)
    word_count = Column(Integer)
    resume_score = Column(Float)
    
    # AI Analysis
    analysis_result = Column(Text)
    optimization_suggestions = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="resume_analyses")

# Usage Analytics Model
class UserActivity(Base):
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String)  # resume_analysis, cover_letter, optimization, chat_message
    details = Column(Text)  # JSON string with activity details
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Metrics
    processing_time = Column(Float)  # seconds
    tokens_used = Column(Integer)
    
    # Relationship
    user = relationship("User")

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)

    # Basic job information
    title = Column(String, index=True)
    company_name = Column(String, index=True)
    company_logo_url = Column(String)
    location = Column(String)
    remote_type = Column(String)  # remote, hybrid, onsite

    # Job details
    description = Column(Text)
    requirements = Column(Text)
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    salary_currency = Column(String, default="USD")
    experience_level = Column(String)  # junior, mid, senior, lead, executive
    employment_type = Column(String)  # full-time, part-time, contract, internship

    # Technical requirements
    required_skills = Column(JSON)  # List of required skills
    preferred_skills = Column(JSON)  # List of preferred skills
    technologies = Column(JSON)  # Programming languages, frameworks, tools
    industry = Column(String)
    company_size = Column(String)  # startup, small, medium, large, enterprise

    # External data
    external_id = Column(String, unique=True, index=True)  # ID from job board API
    source = Column(String)  # adzuna, indeed, linkedin, etc.
    apply_url = Column(String)
    posted_date = Column(DateTime)
    expires_date = Column(DateTime)

    # Internal tracking
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    application_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    applications = relationship("JobApplication", back_populates="job")
    saved_jobs = relationship("SavedJob", back_populates="job")
    job_matches = relationship("JobMatch", back_populates="job")


class UserJobPreferences(Base):
    __tablename__ = "user_job_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Job search preferences
    preferred_titles = Column(JSON)  # List of preferred job titles
    preferred_companies = Column(JSON)  # List of preferred companies
    preferred_industries = Column(JSON)  # List of preferred industries
    preferred_locations = Column(JSON)  # List of preferred locations
    remote_preference = Column(String)  # remote_only, hybrid, onsite, flexible

    # Salary preferences
    minimum_salary = Column(Integer)
    maximum_salary = Column(Integer)
    salary_currency = Column(String, default="USD")
    
    # Experience and role preferences
    experience_levels = Column(JSON)  # junior, mid, senior, etc.
    employment_types = Column(JSON)  # full-time, contract, etc.
    company_sizes = Column(JSON)  # startup, enterprise, etc.

    # Skills and technologies
    must_have_skills = Column(JSON)  # Required skills for recommendations
    nice_to_have_skills = Column(JSON)  # Preferred but not required
    avoid_technologies = Column(JSON)  # Technologies to avoid
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    notification_frequency = Column(String, default="daily")  # daily, weekly, instant
    max_recommendations_per_day = Column(Integer, default=5)

    # Search behavior
    last_search_query = Column(String)
    search_radius_miles = Column(Integer, default=25)
    willing_to_relocate = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="job_preferences")

class JobApplication(Base):
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(Integer, ForeignKey("job_postings.id"))
    
    # Application details
    status = Column(String, default="applied")  # applied, screening, interview, offer, rejected, withdrawn
    applied_date = Column(DateTime, default=datetime.utcnow)
    cover_letter_used = Column(Text)
    resume_version_used = Column(Text)

    # Tracking information
    application_method = Column(String)  # direct, platform, referral
    referral_source = Column(String)
    external_application_id = Column(String)
    
    # Interview tracking
    interview_scheduled = Column(DateTime)
    interview_completed = Column(DateTime)
    interview_feedback = Column(Text)
    
    # Follow-up tracking
    last_follow_up = Column(DateTime)
    next_follow_up_due = Column(DateTime)
    follow_up_count = Column(Integer, default=0)
    
    # Outcome tracking
    rejection_reason = Column(String)
    offer_amount = Column(Integer)
    offer_currency = Column(String)
    offer_accepted = Column(Boolean)
    
    # Notes and feedback
    user_notes = Column(Text)
    ai_suggestions = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    job = relationship("JobPosting", back_populates="applications")

class SavedJob(Base):
    __tablename__ = "saved_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(Integer, ForeignKey("job_postings.id"))
    
    # Save details
    saved_date = Column(DateTime, default=datetime.utcnow)
    save_reason = Column(String)  # interested, backup, research
    user_notes = Column(Text)

    # Engagement tracking
    view_count = Column(Integer, default=1)
    last_viewed = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    job = relationship("JobPosting", back_populates="saved_jobs")

class JobMatch(Base):
    __tablename__ = "job_matches"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(Integer, ForeignKey("job_postings.id"))
    
    # Matching scores
    overall_score = Column(Float)  # 0-100 overall match score
    skills_score = Column(Float)  # How well skills match
    experience_score = Column(Float)  # Experience level match
    location_score = Column(Float)  # Location preference match
    salary_score = Column(Float)  # Salary expectation match
    company_score = Column(Float)  # Company preference match

    # Matching details
    matching_skills = Column(JSON)  # Skills that matched
    missing_skills = Column(JSON)  # Skills user lacks
    matching_keywords = Column(JSON)  # Keywords that matched
    
    # Recommendation tracking
    shown_to_user = Column(Boolean, default=False)
    user_feedback = Column(String)  # interested, not_interested, applied
    feedback_date = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    job = relationship("JobPosting", back_populates="job_matches")

class JobAlert(Base):
    __tablename__ = "job_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    email = Column(String)
    is_active = Column(Boolean, default=True)
    min_match_score = Column(Integer, default=80)
    last_sent = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")

class Resume(Base):
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    file_name = Column(String)
    file_path = Column(String)
    is_default = Column(Boolean, default=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")         

# Creating Tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()