#!/usr/bin/env python3
"""
AI-Only Resume Schema
Defines the database schema for AI-extracted resume data with second validation pass
"""

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

class AIResume(SQLModel, table=True):
    """Main resume table with AI-extracted data"""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Candidate Identity
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    candidate_id: str = Field(unique=True, index=True, max_length=255)
    
    # Contact Information
    primary_email: Optional[str] = Field(default=None, max_length=255, index=True)
    secondary_email: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)
    alternative_phone: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = Field(default=None, max_length=500)
    
    # Work Authorization
    citizenship: Optional[str] = Field(default=None, max_length=100)
    work_authorization: Optional[str] = Field(default=None, max_length=100)
    
    # Industry Recommendations
    recommended_industries: Optional[str] = Field(default=None, max_length=1000)
    
    # Skills & Certifications
    technical_skills: Optional[str] = Field(default=None, max_length=2000)
    hands_on_skills: Optional[str] = Field(default=None, max_length=2000)
    certifications: Optional[str] = Field(default=None, max_length=1000)
    licenses: Optional[str] = Field(default=None, max_length=1000)
    
    # Compensation
    current_salary: Optional[str] = Field(default=None, max_length=100)
    expected_salary: Optional[str] = Field(default=None, max_length=100)
    
    # Work Preferences
    relocation: Optional[str] = Field(default=None, max_length=100)
    remote_work: Optional[str] = Field(default=None, max_length=100)
    homeowner_renter: Optional[str] = Field(default=None, max_length=100)
    preferred_locations: Optional[str] = Field(default=None, max_length=1000)
    restricted_locations: Optional[str] = Field(default=None, max_length=1000)
    
    # Job Search Information
    previous_positions: Optional[str] = Field(default=None, max_length=500)
    reason_for_leaving: Optional[str] = Field(default=None, max_length=1000)
    reason_for_looking: Optional[str] = Field(default=None, max_length=1000)
    
    # Recruiter Notes
    special_notes: Optional[str] = Field(default=None, max_length=2000)
    screening_comments: Optional[str] = Field(default=None, max_length=2000)
    candidate_concerns: Optional[str] = Field(default=None, max_length=2000)
    
    # File Information
    original_filename: Optional[str] = Field(default=None, max_length=255)
    resume_file_path: Optional[str] = Field(default=None, max_length=500)
    content_hash: Optional[str] = Field(default=None, max_length=64)
    version_number: int = Field(default=1)
    is_latest_version: bool = Field(default=True)
    
    # System Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # AI Processing
    ai_extraction_confidence: Optional[float] = Field(default=None)
    ai_validation_confidence: Optional[float] = Field(default=None)
    ai_extraction_model: Optional[str] = Field(default=None, max_length=100)
    ai_validation_model: Optional[str] = Field(default=None, max_length=100)
    extraction_notes: Optional[str] = Field(default=None, max_length=2000)
    validation_notes: Optional[str] = Field(default=None, max_length=2000)

class AIEducation(SQLModel, table=True):
    """Education records for AI-extracted resumes"""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    resume_id: int = Field(foreign_key="airesume.id")
    
    degree: Optional[str] = Field(default=None, max_length=100)
    field: Optional[str] = Field(default=None, max_length=200)
    institution: Optional[str] = Field(default=None, max_length=200)
    start_date: Optional[str] = Field(default=None, max_length=50)
    end_date: Optional[str] = Field(default=None, max_length=50)
    gpa: Optional[str] = Field(default=None, max_length=20)
    honors: Optional[str] = Field(default=None, max_length=500)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AIExperience(SQLModel, table=True):
    """Work experience records for AI-extracted resumes"""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    resume_id: int = Field(foreign_key="airesume.id")
    
    position: Optional[str] = Field(default=None, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    industry: Optional[str] = Field(default=None, max_length=200)
    location: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[str] = Field(default=None, max_length=50)
    end_date: Optional[str] = Field(default=None, max_length=50)
    functions: Optional[str] = Field(default=None, max_length=5000)
    soft_skills: Optional[str] = Field(default=None, max_length=1000)
    achievements: Optional[str] = Field(default=None, max_length=2000)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AIResumeCreate(SQLModel):
    """Schema for creating new AI-extracted resumes"""
    
    # Candidate Identity
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    candidate_id: str
    
    # Contact Information
    primary_email: Optional[str] = None
    secondary_email: Optional[str] = None
    phone: Optional[str] = None
    alternative_phone: Optional[str] = None
    address: Optional[str] = None
    
    # Work Authorization
    citizenship: Optional[str] = None
    work_authorization: Optional[str] = None
    
    # Industry Recommendations
    recommended_industries: Optional[str] = None
    
    # Skills & Certifications
    technical_skills: Optional[str] = None
    hands_on_skills: Optional[str] = None
    certifications: Optional[str] = None
    licenses: Optional[str] = None
    
    # Compensation
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    
    # Work Preferences
    relocation: Optional[str] = None
    remote_work: Optional[str] = None
    homeowner_renter: Optional[str] = None
    preferred_locations: Optional[str] = None
    restricted_locations: Optional[str] = None
    
    # Job Search Information
    previous_positions: Optional[str] = None
    reason_for_leaving: Optional[str] = None
    reason_for_looking: Optional[str] = None
    
    # Recruiter Notes
    special_notes: Optional[str] = None
    screening_comments: Optional[str] = None
    candidate_concerns: Optional[str] = None
    
    # File Information
    original_filename: Optional[str] = None
    resume_file_path: Optional[str] = None
    content_hash: Optional[str] = None
    version_number: int = 1
    is_latest_version: bool = True
    
    # AI Processing
    ai_extraction_confidence: Optional[float] = None
    ai_validation_confidence: Optional[float] = None
    ai_extraction_model: Optional[str] = None
    ai_validation_model: Optional[str] = None
    extraction_notes: Optional[str] = None
    validation_notes: Optional[str] = None

class AIResumeResponse(SQLModel):
    """Response schema for AI-extracted resumes"""
    
    id: int
    first_name: Optional[str]
    last_name: Optional[str]
    candidate_id: str
    primary_email: Optional[str]
    secondary_email: Optional[str]
    phone: Optional[str]
    alternative_phone: Optional[str]
    address: Optional[str]
    citizenship: Optional[str]
    work_authorization: Optional[str]
    recommended_industries: Optional[str]
    technical_skills: Optional[str]
    hands_on_skills: Optional[str]
    certifications: Optional[str]
    licenses: Optional[str]
    current_salary: Optional[str]
    expected_salary: Optional[str]
    relocation: Optional[str]
    remote_work: Optional[str]
    homeowner_renter: Optional[str]
    preferred_locations: Optional[str]
    restricted_locations: Optional[str]
    previous_positions: Optional[str]
    reason_for_leaving: Optional[str]
    reason_for_looking: Optional[str]
    special_notes: Optional[str]
    screening_comments: Optional[str]
    candidate_concerns: Optional[str]
    original_filename: Optional[str]
    resume_file_path: Optional[str]
    content_hash: Optional[str]
    version_number: int
    is_latest_version: bool
    created_at: datetime
    updated_at: datetime
    ai_extraction_confidence: Optional[float]
    ai_validation_confidence: Optional[float]
    ai_extraction_model: Optional[str]
    ai_validation_model: Optional[str]
    extraction_notes: Optional[str]
    validation_notes: Optional[str]
