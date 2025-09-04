from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
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