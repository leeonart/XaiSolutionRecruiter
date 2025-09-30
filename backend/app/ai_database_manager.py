#!/usr/bin/env python3
"""
AI Database Manager
Manages AI-extracted resume data in the database
"""

from sqlmodel import SQLModel, create_engine, Session, select, delete
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from pathlib import Path
from app.ai_resume_schema import AIResume, AIEducation, AIExperience, AIResumeCreate

class AIDatabaseManager:
    """Manages AI-extracted resume data"""
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url, echo=True)
        # Don't create tables here - they're created in main.py startup
    
    def save_resume(self, resume_data: Dict[str, Any], file_info: Dict[str, Any]) -> AIResume:
        """Save AI-extracted resume data to database with comprehensive validation"""
        
        with Session(self.engine) as session:
            try:
                # Validate required data
                self._validate_resume_data(resume_data)
                
                # Check for existing resume by candidate_id
                candidate_id = resume_data.get("candidate_identity", {}).get("candidate_id")
                if not candidate_id:
                    raise ValueError("Candidate ID is required")
                
                # Get primary email for additional deduplication check
                primary_email = resume_data.get("contact_information", {}).get("primary_email")
                
                # Check if resume already exists by candidate_id OR email
                existing_resume = None
                if candidate_id:
                    existing_resume = session.exec(
                        select(AIResume).where(AIResume.candidate_id == candidate_id)
                    ).first()
                
                # If not found by candidate_id, check by email
                if not existing_resume and primary_email:
                    existing_resume = session.exec(
                        select(AIResume).where(AIResume.primary_email == primary_email)
                    ).first()
                
                if existing_resume:
                    # Create a new resume entry instead of updating the existing one
                    # This allows us to maintain version history
                    print(f"[DB_DEBUG] Creating new version for existing candidate {candidate_id}")
                    new_resume = self._create_resume_from_data(resume_data, file_info)
                    session.add(new_resume)
                    session.commit()
                    session.refresh(new_resume)
                    
                    # Save education and experience for the new resume
                    education_data = resume_data.get("education", [])
                    experience_data = resume_data.get("work_experience", [])
                    print(f"[DB_DEBUG] Saving education data: {len(education_data)} entries")
                    print(f"[DB_DEBUG] Saving experience data: {len(experience_data)} entries")
                    
                    # Save education and experience with validation
                    self._save_education(session, new_resume.id, education_data)
                    self._save_experience(session, new_resume.id, experience_data)
                    
                    # Commit the education and experience changes
                    session.commit()
                    session.refresh(new_resume)
                    
                    # Validate the saved data
                    self._validate_saved_data(session, new_resume.id, education_data, experience_data)
                    
                    # Manage versions - keep only 2 most recent versions per candidate
                    try:
                        version_result = self._manage_resume_versions(session, candidate_id, new_resume.resume_file_path, keep_count=2)
                        print(f"[DB_DEBUG] Version management result: {version_result}")
                    except Exception as e:
                        print(f"[DB_DEBUG] Error managing versions: {e}")
                    
                    print(f"[DB_DEBUG] Successfully created new resume version {new_resume.id}")
                    return new_resume
                else:
                    # Create new resume
                    new_resume = self._create_resume_from_data(resume_data, file_info)
                    session.add(new_resume)
                    session.commit()
                    session.refresh(new_resume)
                    
                    # Save education and experience
                    education_data = resume_data.get("education", [])
                    experience_data = resume_data.get("work_experience", [])
                    print(f"[DB_DEBUG] Education data: {len(education_data)} entries")
                    print(f"[DB_DEBUG] Experience data: {len(experience_data)} entries")
                    
                    # Save education and experience with validation
                    self._save_education(session, new_resume.id, education_data)
                    self._save_experience(session, new_resume.id, experience_data)
                    
                    # Commit the education and experience changes
                    session.commit()
                    session.refresh(new_resume)
                    
                    # Validate the saved data
                    self._validate_saved_data(session, new_resume.id, education_data, experience_data)
                    
                    print(f"[DB_DEBUG] Successfully created new resume {new_resume.id}")
                    return new_resume
                    
            except Exception as e:
                print(f"[DB_ERROR] Failed to save resume: {e}")
                session.rollback()
                raise
    
    def _create_resume_from_data(self, resume_data: Dict[str, Any], file_info: Dict[str, Any]) -> AIResume:
        """Create AIResume object from extracted data"""
        
        candidate_identity = resume_data.get("candidate_identity", {})
        contact_info = resume_data.get("contact_information", {})
        work_auth = resume_data.get("work_authorization", {})
        industry = resume_data.get("industry_recommendations", {})
        skills = resume_data.get("skills_certifications", {})
        compensation = resume_data.get("compensation", {})
        preferences = resume_data.get("work_preferences", {})
        job_search = resume_data.get("job_search", {})
        recruiter_notes = resume_data.get("recruiter_notes", {})
        
        return AIResume(
            # Candidate Identity
            first_name=candidate_identity.get("first_name"),
            last_name=candidate_identity.get("last_name"),
            candidate_id=candidate_identity.get("candidate_id"),
            
            # Contact Information
            primary_email=contact_info.get("primary_email"),
            secondary_email=contact_info.get("secondary_email"),
            phone=contact_info.get("phone"),
            alternative_phone=contact_info.get("alternative_phone"),
            address=contact_info.get("address"),
            
            # Work Authorization
            citizenship=work_auth.get("citizenship"),
            work_authorization=work_auth.get("work_authorization"),
            
            # Industry Recommendations
            recommended_industries=industry.get("recommended_industries"),
            
            # Skills & Certifications
            technical_skills=skills.get("technical_skills"),
            hands_on_skills=skills.get("hands_on_skills"),
            certifications=skills.get("certifications"),
            licenses=skills.get("licenses"),
            
            # Compensation
            current_salary=compensation.get("current_salary"),
            expected_salary=compensation.get("expected_salary"),
            
            # Work Preferences
            relocation=preferences.get("relocation"),
            remote_work=preferences.get("remote_work"),
            homeowner_renter=preferences.get("homeowner_renter"),
            preferred_locations=preferences.get("preferred_locations"),
            restricted_locations=preferences.get("restricted_locations"),
            
            # Job Search Information
            previous_positions=job_search.get("previous_positions"),
            reason_for_leaving=job_search.get("reason_for_leaving"),
            reason_for_looking=job_search.get("reason_for_looking"),
            
            # Recruiter Notes
            special_notes=recruiter_notes.get("special_notes"),
            screening_comments=recruiter_notes.get("screening_comments"),
            candidate_concerns=recruiter_notes.get("candidate_concerns"),
            
            # File Information
            original_filename=file_info.get("original_filename"),
            resume_file_path=file_info.get("resume_file_path"),
            content_hash=file_info.get("content_hash"),
            version_number=1,
            is_latest_version=True,
            
            # AI Processing
            ai_extraction_confidence=resume_data.get("extraction_confidence"),
            ai_validation_confidence=resume_data.get("validation_confidence"),
            ai_extraction_model=resume_data.get("extraction_model"),
            ai_validation_model=resume_data.get("validation_model"),
            extraction_notes=resume_data.get("extraction_notes"),
            validation_notes=resume_data.get("validation_notes")
        )
    
    def _update_resume_fields(self, resume: AIResume, resume_data: Dict[str, Any], file_info: Dict[str, Any]):
        """Update existing resume with new data"""
        
        candidate_identity = resume_data.get("candidate_identity", {})
        contact_info = resume_data.get("contact_information", {})
        work_auth = resume_data.get("work_authorization", {})
        industry = resume_data.get("industry_recommendations", {})
        skills = resume_data.get("skills_certifications", {})
        compensation = resume_data.get("compensation", {})
        preferences = resume_data.get("work_preferences", {})
        job_search = resume_data.get("job_search", {})
        recruiter_notes = resume_data.get("recruiter_notes", {})
        
        # Update fields
        resume.first_name = candidate_identity.get("first_name") or resume.first_name
        resume.last_name = candidate_identity.get("last_name") or resume.last_name
        resume.primary_email = contact_info.get("primary_email") or resume.primary_email
        resume.secondary_email = contact_info.get("secondary_email") or resume.secondary_email
        resume.phone = contact_info.get("phone") or resume.phone
        resume.alternative_phone = contact_info.get("alternative_phone") or resume.alternative_phone
        resume.address = contact_info.get("address") or resume.address
        resume.citizenship = work_auth.get("citizenship") or resume.citizenship
        resume.work_authorization = work_auth.get("work_authorization") or resume.work_authorization
        resume.recommended_industries = industry.get("recommended_industries") or resume.recommended_industries
        resume.technical_skills = skills.get("technical_skills") or resume.technical_skills
        resume.hands_on_skills = skills.get("hands_on_skills") or resume.hands_on_skills
        resume.certifications = skills.get("certifications") or resume.certifications
        resume.licenses = skills.get("licenses") or resume.licenses
        resume.current_salary = compensation.get("current_salary") or resume.current_salary
        resume.expected_salary = compensation.get("expected_salary") or resume.expected_salary
        resume.relocation = preferences.get("relocation") or resume.relocation
        resume.remote_work = preferences.get("remote_work") or resume.remote_work
        resume.homeowner_renter = preferences.get("homeowner_renter") or resume.homeowner_renter
        resume.preferred_locations = preferences.get("preferred_locations") or resume.preferred_locations
        resume.restricted_locations = preferences.get("restricted_locations") or resume.restricted_locations
        resume.previous_positions = job_search.get("previous_positions") or resume.previous_positions
        resume.reason_for_leaving = job_search.get("reason_for_leaving") or resume.reason_for_leaving
        resume.reason_for_looking = job_search.get("reason_for_looking") or resume.reason_for_looking
        resume.special_notes = recruiter_notes.get("special_notes") or resume.special_notes
        resume.screening_comments = recruiter_notes.get("screening_comments") or resume.screening_comments
        resume.candidate_concerns = recruiter_notes.get("candidate_concerns") or resume.candidate_concerns
        
        # Update file info
        resume.original_filename = file_info.get("original_filename") or resume.original_filename
        resume.resume_file_path = file_info.get("resume_file_path") or resume.resume_file_path
        resume.content_hash = file_info.get("content_hash") or resume.content_hash
        resume.version_number += 1
        
        # Update AI processing info
        resume.ai_extraction_confidence = resume_data.get("extraction_confidence") or resume.ai_extraction_confidence
        resume.ai_validation_confidence = resume_data.get("validation_confidence") or resume.ai_validation_confidence
        resume.ai_extraction_model = resume_data.get("extraction_model") or resume.ai_extraction_model
        resume.ai_validation_model = resume_data.get("validation_model") or resume.ai_validation_model
        resume.extraction_notes = resume_data.get("extraction_notes") or resume.extraction_notes
        resume.validation_notes = resume_data.get("validation_notes") or resume.validation_notes
        
        resume.updated_at = datetime.utcnow()
    
    def _save_education(self, session: Session, resume_id: int, education_data: List[Dict[str, Any]]):
        """Save education records with validation"""
        
        try:
            # Delete existing education records
            existing_education = session.exec(select(AIEducation).where(AIEducation.resume_id == resume_id)).all()
            for edu in existing_education:
                session.delete(edu)
            
            # Add new education records
            for i, edu in enumerate(education_data):
                try:
                    education = AIEducation(
                        resume_id=resume_id,
                        degree=edu.get("degree"),
                        field=edu.get("field"),
                        institution=edu.get("institution"),
                        start_date=edu.get("start_date"),
                        end_date=edu.get("end_date"),
                        gpa=edu.get("gpa"),
                        honors=edu.get("honors")
                    )
                    session.add(education)
                    print(f"[DB_DEBUG] Added education {i+1}: {edu.get('degree', 'N/A')} - {edu.get('institution', 'N/A')}")
                except Exception as e:
                    print(f"[DB_ERROR] Failed to add education record {i+1}: {e}")
                    raise
            
            # Commit education changes
            session.commit()
            print(f"[DB_DEBUG] Successfully saved {len(education_data)} education records")
            
        except Exception as e:
            print(f"[DB_ERROR] Failed to save education data: {e}")
            session.rollback()
            raise
    
    def _save_experience(self, session: Session, resume_id: int, experience_data: List[Dict[str, Any]]):
        """Save work experience records with validation"""
        
        try:
            # Delete existing experience records
            existing_experience = session.exec(select(AIExperience).where(AIExperience.resume_id == resume_id)).all()
            for exp in existing_experience:
                session.delete(exp)
            
            # Add new experience records
            for i, exp in enumerate(experience_data):
                try:
                    experience = AIExperience(
                        resume_id=resume_id,
                        position=exp.get("position"),
                        company=exp.get("company"),
                        industry=exp.get("industry"),
                        location=exp.get("location"),
                        start_date=exp.get("start_date"),
                        end_date=exp.get("end_date"),
                        functions=exp.get("functions"),
                        soft_skills=exp.get("soft_skills"),
                        achievements=exp.get("achievements")
                    )
                    session.add(experience)
                    print(f"[DB_DEBUG] Added experience {i+1}: {exp.get('position', 'N/A')} at {exp.get('company', 'N/A')}")
                except Exception as e:
                    print(f"[DB_ERROR] Failed to add experience record {i+1}: {e}")
                    raise
            
            # Commit experience changes
            session.commit()
            print(f"[DB_DEBUG] Successfully saved {len(experience_data)} experience records")
            
        except Exception as e:
            print(f"[DB_ERROR] Failed to save experience data: {e}")
            session.rollback()
            raise
    
    def _validate_resume_data(self, resume_data: Dict[str, Any]):
        """Validate that resume data contains required fields"""
        
        # Check for required sections
        required_sections = ["candidate_identity", "contact_information"]
        for section in required_sections:
            if section not in resume_data:
                raise ValueError(f"Missing required section: {section}")
        
        # Check for candidate_id
        candidate_id = resume_data.get("candidate_identity", {}).get("candidate_id")
        if not candidate_id:
            raise ValueError("Candidate ID is required")
        
        # Check for primary email
        primary_email = resume_data.get("contact_information", {}).get("primary_email")
        if not primary_email:
            raise ValueError("Primary email is required")
        
        print(f"[DB_DEBUG] Resume data validation passed for candidate: {candidate_id}")
    
    def _validate_saved_data(self, session: Session, resume_id: int, expected_education: List[Dict], expected_experience: List[Dict]):
        """Validate that education and experience data was saved correctly"""
        
        try:
            # Check education records
            saved_education = session.exec(select(AIEducation).where(AIEducation.resume_id == resume_id)).all()
            if len(saved_education) != len(expected_education):
                raise ValueError(f"Education count mismatch: expected {len(expected_education)}, saved {len(saved_education)}")
            
            # Check experience records
            saved_experience = session.exec(select(AIExperience).where(AIExperience.resume_id == resume_id)).all()
            if len(saved_experience) != len(expected_experience):
                raise ValueError(f"Experience count mismatch: expected {len(expected_experience)}, saved {len(saved_experience)}")
            
            print(f"[DB_DEBUG] Data validation passed: {len(saved_education)} education, {len(saved_experience)} experience records")
            
        except Exception as e:
            print(f"[DB_ERROR] Data validation failed: {e}")
            raise
    
    def get_resumes(self, skip: int = 0, limit: int = 100) -> List[AIResume]:
        """Get all resumes with pagination"""
        
        with Session(self.engine) as session:
            statement = select(AIResume).offset(skip).limit(limit)
            return session.exec(statement).all()
    
    def get_resume_by_id(self, resume_id: int) -> Optional[AIResume]:
        """Get resume by ID"""
        
        with Session(self.engine) as session:
            return session.get(AIResume, resume_id)
    
    def get_resume_by_candidate_id(self, candidate_id: str) -> Optional[AIResume]:
        """Get resume by candidate ID"""
        
        with Session(self.engine) as session:
            return session.exec(
                select(AIResume).where(AIResume.candidate_id == candidate_id)
            ).first()
    
    def get_education(self, resume_id: int) -> List[AIEducation]:
        """Get education records for a resume"""
        
        with Session(self.engine) as session:
            return session.exec(
                select(AIEducation).where(AIEducation.resume_id == resume_id)
            ).all()
    
    def get_experience(self, resume_id: int) -> List[AIExperience]:
        """Get work experience records for a resume"""
        
        with Session(self.engine) as session:
            return session.exec(
                select(AIExperience).where(AIExperience.resume_id == resume_id)
            ).all()
    
    def delete_resume(self, resume_id: int) -> bool:
        """Delete a resume and all related records"""
        
        with Session(self.engine) as session:
            resume = session.get(AIResume, resume_id)
            if not resume:
                return False
            
            # Delete related records
            existing_education = session.exec(select(AIEducation).where(AIEducation.resume_id == resume_id)).all()
            for edu in existing_education:
                session.delete(edu)
            
            existing_experience = session.exec(select(AIExperience).where(AIExperience.resume_id == resume_id)).all()
            for exp in existing_experience:
                session.delete(exp)
            
            # Delete resume
            session.delete(resume)
            session.commit()
            return True
    
    def update_resume(self, resume_id: int, update_data: Dict[str, Any]) -> Optional[AIResume]:
        """Update specific fields of a resume (for recruiter edits)"""
        
        with Session(self.engine) as session:
            resume = session.get(AIResume, resume_id)
            if not resume:
                return None
            
            # Update only the provided fields
            updatable_fields = [
                'first_name', 'last_name', 'primary_email', 'phone', 'address',
                'citizenship', 'work_authorization', 'current_salary', 'expected_salary',
                'relocation', 'remote_work', 'previous_positions', 'reason_for_leaving',
                'reason_for_looking', 'special_notes', 'screening_comments', 'candidate_concerns'
            ]
            
            for field, value in update_data.items():
                if field in updatable_fields and hasattr(resume, field):
                    setattr(resume, field, value)
            
            resume.updated_at = datetime.utcnow()
            session.add(resume)
            session.commit()
            session.refresh(resume)
            
            return resume
    
    def cleanup_duplicates(self) -> Dict[str, int]:
        """Remove duplicate resumes based on email address"""
        
        with Session(self.engine) as session:
            # Find duplicates by email
            from sqlalchemy import func
            duplicate_emails = session.exec(
                select(AIResume.primary_email, func.count(AIResume.id).label('count'))
                .where(AIResume.primary_email.isnot(None))
                .group_by(AIResume.primary_email)
                .having(func.count(AIResume.id) > 1)
            ).all()
            
            removed_count = 0
            kept_count = 0
            
            for email, count in duplicate_emails:
                # Get all resumes with this email, ordered by created_at (keep the newest)
                resumes = session.exec(
                    select(AIResume)
                    .where(AIResume.primary_email == email)
                    .order_by(AIResume.created_at.desc())
                ).all()
                
                # Keep the first (newest) one, remove the rest
                for i, resume in enumerate(resumes):
                    if i == 0:
                        kept_count += 1
                    else:
                        # Delete related records first
                        session.exec(delete(AIEducation).where(AIEducation.resume_id == resume.id))
                        session.exec(delete(AIExperience).where(AIExperience.resume_id == resume.id))
                        session.delete(resume)
                        removed_count += 1
            
            session.commit()
            return {"removed": removed_count, "kept": kept_count}
    
    def check_missing_data(self) -> Dict[str, Any]:
        """Check for resumes with missing education or experience data"""
        
        with Session(self.engine) as session:
            from sqlalchemy import func
            
            # Get all resumes
            all_resumes = session.exec(select(AIResume)).all()
            
            missing_data = []
            for resume in all_resumes:
                # Check education count
                education_count = session.exec(
                    select(func.count(AIEducation.id))
                    .where(AIEducation.resume_id == resume.id)
                ).first()
                
                # Check experience count
                experience_count = session.exec(
                    select(func.count(AIExperience.id))
                    .where(AIExperience.resume_id == resume.id)
                ).first()
                
                if education_count == 0 or experience_count == 0:
                    missing_data.append({
                        "id": resume.id,
                        "name": f"{resume.first_name} {resume.last_name}",
                        "candidate_id": resume.candidate_id,
                        "education_count": education_count,
                        "experience_count": experience_count,
                        "created_at": resume.created_at,
                        "resume_file_path": resume.resume_file_path
                    })
            
            return {
                "total_resumes": len(all_resumes),
                "missing_data_count": len(missing_data),
                "missing_data": missing_data
            }
    
    def auto_fix_missing_data(self) -> Dict[str, Any]:
        """Automatically re-process resumes with missing education or experience data"""
        
        from app.ai_resume_extractor import AIResumeExtractor
        import os
        from docx import Document
        import pypdf
        
        print("[AUTO_FIX] Starting automatic fix for missing data...")
        
        # Get missing data
        missing_data_result = self.check_missing_data()
        missing_resumes = missing_data_result["missing_data"]
        
        if not missing_resumes:
            return {
                "message": "No resumes with missing data found",
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "details": []
            }
        
        extractor = AIResumeExtractor()
        results = []
        successful = 0
        failed = 0
        
        for resume_info in missing_resumes:
            try:
                print(f"[AUTO_FIX] Processing {resume_info['name']} (ID: {resume_info['id']})")
                
                # Check if resume file exists
                if not resume_info.get('resume_file_path') or not os.path.exists(resume_info['resume_file_path']):
                    results.append({
                        "name": resume_info['name'],
                        "id": resume_info['id'],
                        "status": "failed",
                        "error": "Resume file not found"
                    })
                    failed += 1
                    continue
                
                # Extract text from resume file
                resume_path = resume_info['resume_file_path']
                content = ""
                
                if resume_path.endswith('.pdf'):
                    with open(resume_path, 'rb') as f:
                        reader = pypdf.PdfReader(f)
                        for page in reader.pages:
                            content += page.extract_text() + '\n'
                elif resume_path.endswith(('.docx', '.doc')):
                    doc = Document(resume_path)
                    for paragraph in doc.paragraphs:
                        content += paragraph.text + '\n'
                else:
                    with open(resume_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                
                if not content.strip():
                    results.append({
                        "name": resume_info['name'],
                        "id": resume_info['id'],
                        "status": "failed",
                        "error": "Could not extract text from resume"
                    })
                    failed += 1
                    continue
                
                # Re-extract data using AI
                extraction_result = extractor.extract_resume_data(content, resume_info['name'], fast_mode=False)
                
                if 'data' not in extraction_result:
                    results.append({
                        "name": resume_info['name'],
                        "id": resume_info['id'],
                        "status": "failed",
                        "error": "AI extraction failed"
                    })
                    failed += 1
                    continue
                
                # Prepare file info
                file_info = {
                    'filename': resume_info['name'],
                    'file_path': resume_path
                }
                
                # Save the re-extracted data
                saved_resume = self.save_resume(extraction_result['data'], file_info)
                
                # Verify the fix
                with Session(self.engine) as session:
                    education_count = session.exec(
                        select(func.count(AIEducation.id))
                        .where(AIEducation.resume_id == saved_resume.id)
                    ).first()
                    
                    experience_count = session.exec(
                        select(func.count(AIExperience.id))
                        .where(AIExperience.resume_id == saved_resume.id)
                    ).first()
                
                results.append({
                    "name": resume_info['name'],
                    "id": resume_info['id'],
                    "status": "success",
                    "education_count": education_count,
                    "experience_count": experience_count,
                    "extraction_confidence": extraction_result.get('extraction_confidence', 0),
                    "validation_confidence": extraction_result.get('validation_confidence', 0)
                })
                successful += 1
                
                print(f"[AUTO_FIX] Successfully fixed {resume_info['name']}: {education_count} education, {experience_count} experience")
                
            except Exception as e:
                print(f"[AUTO_FIX] Failed to fix {resume_info['name']}: {e}")
                results.append({
                    "name": resume_info['name'],
                    "id": resume_info['id'],
                    "status": "failed",
                    "error": str(e)
                })
                failed += 1
        
        return {
            "message": f"Auto-fix completed: {successful} successful, {failed} failed",
            "processed": len(missing_resumes),
            "successful": successful,
            "failed": failed,
            "details": results
        }
    
    def search_resumes(self, query: str, skip: int = 0, limit: int = 100) -> List[AIResume]:
        """Search resumes by text query"""
        
        with Session(self.engine) as session:
            # Simple text search across key fields
            statement = select(AIResume).where(
                AIResume.first_name.ilike(f"%{query}%") |
                AIResume.last_name.ilike(f"%{query}%") |
                AIResume.primary_email.ilike(f"%{query}%") |
                AIResume.technical_skills.ilike(f"%{query}%") |
                AIResume.hands_on_skills.ilike(f"%{query}%") |
                AIResume.previous_positions.ilike(f"%{query}%")
            ).offset(skip).limit(limit)
            
            return session.exec(statement).all()
    
    def _manage_resume_versions(self, session: Session, candidate_id: str, new_resume_path: str, keep_count: int = 2):
        """Manage resume versions for a candidate - keep only the most recent keep_count versions"""
        try:
            # Get all resumes for this candidate ordered by creation date (newest first)
            statement = select(AIResume).where(AIResume.candidate_id == candidate_id).order_by(AIResume.created_at.desc())
            candidate_resumes = session.exec(statement).all()
            
            if len(candidate_resumes) <= keep_count:
                return {"kept": len(candidate_resumes), "deleted": 0, "renamed": 0}
            
            # Sort by creation date (newest first)
            candidate_resumes.sort(key=lambda r: r.created_at, reverse=True)
            
            # Keep the most recent ones
            keep_resumes = candidate_resumes[:keep_count]
            delete_resumes = candidate_resumes[keep_count:]
            
            # Rename files to add date stamps for older versions
            renamed_count = 0
            for i, resume in enumerate(keep_resumes):
                if i == 0:
                    # Keep the newest resume with original name (no date)
                    continue
                else:
                    # Add date stamp to older versions
                    old_path = Path(resume.resume_file_path)
                    if old_path.exists() and not old_path.name.startswith(resume.original_filename.split('.')[0]):
                        # Only rename if not already renamed
                        date_str = resume.created_at.strftime("%Y%m%d")
                        base_name = Path(resume.original_filename).stem
                        extension = Path(resume.original_filename).suffix
                        new_filename = f"{base_name}_{date_str}{extension}"
                        new_path = old_path.parent / new_filename
                        
                        try:
                            old_path.rename(new_path)
                            resume.resume_file_path = str(new_path)
                            session.add(resume)
                            renamed_count += 1
                            print(f"[VERSIONING] Renamed {old_path.name} to {new_filename}")
                        except Exception as e:
                            print(f"[VERSIONING] Error renaming {old_path.name}: {e}")
            
            # Delete old resume files and database entries
            deleted_count = 0
            for resume in delete_resumes:
                try:
                    # Delete the file
                    if resume.resume_file_path and os.path.exists(resume.resume_file_path):
                        os.unlink(resume.resume_file_path)
                        print(f"[VERSIONING] Deleted old file: {resume.resume_file_path}")
                    
                    # Delete related education and experience records
                    session.exec(delete(AIEducation).where(AIEducation.resume_id == resume.id))
                    session.exec(delete(AIExperience).where(AIExperience.resume_id == resume.id))
                    
                    # Delete the resume record
                    session.delete(resume)
                    deleted_count += 1
                    print(f"[VERSIONING] Deleted old resume record: {resume.id}")
                    
                except Exception as e:
                    print(f"[VERSIONING] Error deleting resume {resume.id}: {e}")
            
            session.commit()
            
            return {
                "kept": len(keep_resumes),
                "deleted": deleted_count,
                "renamed": renamed_count,
                "message": f"Version management complete: kept {len(keep_resumes)}, deleted {deleted_count}, renamed {renamed_count}"
            }
            
        except Exception as e:
            session.rollback()
            print(f"[VERSIONING] Error managing versions for {candidate_id}: {e}")
            return {"kept": 0, "deleted": 0, "renamed": 0, "error": str(e)}
    
    def close(self):
        """Close the database connection"""
        pass
