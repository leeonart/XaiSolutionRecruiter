#!/usr/bin/env python3
"""
AI-Only Resume Extractor
Extracts resume data using AI with second validation pass
"""

import os
import json
import hashlib
import tempfile
from typing import Dict, Any, Optional, List
from datetime import datetime
import openai
from pathlib import Path

class AIResumeExtractor:
    """AI-only resume extractor with validation"""
    
    def __init__(self):
        # Use Grok for extraction
        self.grok_client = openai.OpenAI(
            api_key=os.getenv("GROK_API_KEY"),
            base_url=os.getenv("GROK_BASE_URL", "https://api.x.ai/v1")
        )
        # Use OpenAI for validation
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Two-step process: Grok extraction, OpenAI validation
        self.extraction_model = "grok-4-fast-reasoning"  # Grok for extraction
        self.validation_model = "gpt-5-mini"  # OpenAI for validation
    
    def extract_resume_data(self, resume_content: str, filename: str, fast_mode: bool = True) -> Dict[str, Any]:
        """Extract resume data using AI with optional validation"""
        
        # Dynamic context length based on resume size
        content_length = len(resume_content)
        max_tokens, truncated_content = self._calculate_dynamic_context(resume_content, content_length)
        
        # First pass: AI extraction
        extraction_result = self._ai_extract(truncated_content, filename, max_tokens)
        
        # Always use OpenAI for validation, regardless of fast_mode
        validation_result = self._ai_validate(extraction_result, truncated_content, max_tokens)
        
        # Combine results
        final_result = self._combine_results(extraction_result, validation_result)
        
        # Ensure candidate_id is generated if missing
        if not final_result.get("candidate_identity", {}).get("candidate_id"):
            email = final_result.get("contact_information", {}).get("primary_email", "")
            if email:
                import time
                email_hash = hashlib.md5(email.encode()).hexdigest()[:8]
                timestamp = str(int(time.time()))
                final_result.setdefault("candidate_identity", {})["candidate_id"] = f"email_{email_hash}_{timestamp}"
            else:
                # Fallback if no email
                import time
                final_result.setdefault("candidate_identity", {})["candidate_id"] = f"unknown_{int(time.time())}"
        
        return final_result
    
    def _ai_extract(self, resume_content: str, filename: str, max_tokens: int = 4000) -> Dict[str, Any]:
        """First AI pass: Extract resume data"""
        import time
        start_time = time.time()
        
        prompt = f"""Extract the following information from this resume in JSON format. Be thorough and accurate. If information is not available, use "Not specified".

IMPORTANT: 
1. For citizenship and work authorization, analyze the employment history to determine:
   - If the candidate has worked in the USA, infer "US Citizen" for citizenship and "Authorized to work in US" for work authorization
   - If the candidate has worked in Canada, infer "Canadian Citizen" for citizenship and "TN Visa" for work authorization  
   - If the candidate has worked in Mexico, infer "Mexican Citizen" for citizenship and "TN Visa" for work authorization
   - If unclear or mixed locations, use "Not specified"

2. For work_experience, extract ALL job positions found in the resume. Do not limit to just 2-3 positions. Look for every job entry with company, position, dates, functions, and location. The resume may have 4 or more positions - extract them ALL. For location, extract the city, state (if in the US), and country (if not the US). Format as "City, State" for US locations or "City, Country" for international locations. If no location is specified, leave the field blank.

3. For education, extract ALL education entries including degrees, institutions, fields of study, and dates. Look for entries like "M.B.A", "B.S.C.E", "B.S. Geology", "B.S. Physics", "M.S. Biosystems Engineering", "University of Phoenix", "University of Tennessee", "Wright State University", "University of Dayton", etc. Also include certifications like "Professional Engineer", "Certified Water, Wastewater Operator", "Six Sigma Black Belt", "Total Productive Maintenance", "Lean Manufacturing", "ISO 14001, 9001 Auditor".

4. For previous_positions, extract the last 4 job titles/positions from the work experience section and list them as a comma-separated string (most recent first). Only include actual job titles, do not include "Not specified" in the list. If fewer than 4 positions exist, only list the available ones.

Resume filename: {filename}

Return ONLY valid JSON in this exact format:
{{
    "candidate_identity": {{
        "first_name": "string",
        "last_name": "string",
        "candidate_id": "string (generate unique ID based on email - use format: email_hash_timestamp)"
    }},
    "contact_information": {{
        "primary_email": "string",
        "secondary_email": "string",
        "phone": "string",
        "alternative_phone": "string",
        "address": "string (full address)"
    }},
    "work_authorization": {{
        "citizenship": "string (Determine from employment history: US Citizen if worked in USA, Canadian Citizen if worked in Canada, Mexican Citizen if worked in Mexico, or 'Not specified' if unclear)",
        "work_authorization": "string (Determine from employment history: 'US Citizen' if worked in USA, 'TN Visa' if worked in Canada/Mexico, or 'Not specified' if unclear)"
    }},
    "industry_recommendations": {{
        "recommended_industries": "string (comma-separated list)"
    }},
    "skills_certifications": {{
        "technical_skills": "string (comma-separated list)",
        "hands_on_skills": "string (comma-separated list)",
        "certifications": "string (comma-separated list)",
        "licenses": "string (comma-separated list)"
    }},
    "compensation": {{
        "current_salary": "string",
        "expected_salary": "string"
    }},
    "work_preferences": {{
        "relocation": "string (Yes/No/Not specified)",
        "remote_work": "string (Yes/No/Not specified)",
        "homeowner_renter": "string (Homeowner/Renter/Not specified)",
        "preferred_locations": "string (comma-separated list)",
        "restricted_locations": "string (comma-separated list)"
    }},
    "job_search": {{
        "previous_positions": "string (comma-separated list of last 4 actual job titles from work experience, no 'Not specified')",
        "reason_for_leaving": "string",
        "reason_for_looking": "string"
    }},
    "recruiter_notes": {{
        "special_notes": "string",
        "screening_comments": "string",
        "candidate_concerns": "string"
    }},
    "education": [
        {{
            "degree": "string",
            "field": "string",
            "institution": "string",
            "start_date": "string",
            "end_date": "string",
            "gpa": "string",
            "honors": "string"
        }}
    ],
    "work_experience": [
        {{
            "position": "string",
            "company": "string",
            "industry": "string",
            "location": "string (City, State for US or City, Country for international)",
            "start_date": "string",
            "end_date": "string",
            "functions": "string (bullet points separated by •)",
            "soft_skills": "string (comma-separated list)",
            "achievements": "string"
        }}
    ]
}}

Resume content:
{resume_content}"""
        
        try:
            response = self.grok_client.chat.completions.create(
                model=self.extraction_model,
                messages=[
                    {"role": "system", "content": "You are an expert resume parser. Extract information accurately and completely. Always return valid JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=max_tokens  # Dynamic token limit
            )
            
            content = response.choices[0].message.content.strip()
            print(f"[AI_EXTRACT] Raw response: {content[:200]}...")
            
            # Get token usage
            token_usage = response.usage.total_tokens if response.usage else 0
            print(f"[AI_EXTRACT] Token usage: {token_usage}")
            
            # Try to extract JSON from response if it's wrapped in markdown
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            extraction_data = json.loads(content)
            
            processing_time = time.time() - start_time
            return {
                "data": extraction_data,
                "confidence": 0.9,  # Placeholder confidence
                "model": self.extraction_model,
                "notes": "AI extraction completed",
                "token_count": token_usage,
                "processing_time": processing_time
            }
            
        except json.JSONDecodeError as e:
            print(f"[AI_EXTRACT] JSON decode error: {e}")
            print(f"[AI_EXTRACT] Content: {content}")
            return {
                "data": {},
                "confidence": 0.0,
                "model": self.extraction_model,
                "notes": f"AI extraction failed: JSON decode error - {str(e)}"
            }
        except Exception as e:
            print(f"[AI_EXTRACT] General error: {e}")
            return {
                "data": {},
                "confidence": 0.0,
                "model": self.extraction_model,
                "notes": f"AI extraction failed: {str(e)}"
            }
    
    def _ai_validate(self, extraction_result: Dict[str, Any], resume_content: str, max_tokens: int = 4000) -> Dict[str, Any]:
        """Second AI pass: Validate extracted data"""
        import time
        start_time = time.time()
        
        if not extraction_result.get("data"):
            return {
                "validated_data": {},
                "confidence": 0.0,
                "model": self.validation_model,
                "notes": "No data to validate"
            }
        
        prompt = f"""
        Review and validate the following extracted resume data. 
        Check for accuracy, completeness, and consistency.
        
        IMPORTANT: Pay special attention to work experience and education data. Ensure ALL job positions, companies, dates, and functions are properly extracted and formatted. The resume may have 4 or more positions - extract them ALL. Also ensure ALL education entries are captured including degrees, institutions, and dates. Look for entries like "M.B.A", "B.S.C.E", "B.S. Geology", "B.S. Physics", "M.S. Biosystems Engineering", "University of Phoenix", "University of Tennessee", "Wright State University", "University of Dayton", etc. Also include certifications like "Professional Engineer", "Certified Water, Wastewater Operator", "Six Sigma Black Belt", "Total Productive Maintenance", "Lean Manufacturing", "ISO 14001, 9001 Auditor".
        
        Original resume content:
        {resume_content[:5000]}...
        
        Extracted data:
        {json.dumps(extraction_result["data"], indent=2)}
        
        Please provide:
        1. Validated and corrected data in the same JSON format
        2. Confidence score (0.0 to 1.0)
        3. Any corrections or improvements made, especially for work experience
        
        Return as JSON:
        {{
            "validated_data": {{...}},
            "confidence": 0.95,
            "corrections": ["list of corrections made"],
            "improvements": ["list of improvements made"]
        }}
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model=self.validation_model,
                messages=[
                    {"role": "system", "content": "You are an expert resume validator. Review and improve extracted data."},
                    {"role": "user", "content": prompt}
                ],
                max_completion_tokens=max_tokens  # Use max_completion_tokens for newer models
            )
            
            content = response.choices[0].message.content
            validation_data = json.loads(content)
            
            # Get token usage
            token_usage = response.usage.total_tokens if response.usage else 0
            
            processing_time = time.time() - start_time
            return {
                "validated_data": validation_data.get("validated_data", {}),
                "confidence": validation_data.get("confidence", 0.0),
                "model": self.validation_model,
                "notes": f"Validation completed. Corrections: {validation_data.get('corrections', [])}",
                "token_count": token_usage,
                "processing_time": processing_time
            }
            
        except Exception as e:
            return {
                "validated_data": extraction_result.get("data", {}),
                "confidence": extraction_result.get("confidence", 0.0) * 0.8,  # Reduce confidence
                "model": self.validation_model,
                "notes": f"AI validation failed: {str(e)}"
            }
    
    def _combine_results(self, extraction_result: Dict[str, Any], validation_result: Dict[str, Any]) -> Dict[str, Any]:
        """Combine extraction and validation results"""
        
        # Use validated data if available, otherwise use extraction data
        final_data = validation_result.get("validated_data", extraction_result.get("data", {}))
        
        # Generate candidate ID if not present
        if not final_data.get("candidate_identity", {}).get("candidate_id"):
            email = final_data.get("contact_information", {}).get("primary_email", "")
            if email:
                candidate_id = f"email_{hashlib.md5(email.encode()).hexdigest()}"
            else:
                name = f"{final_data.get('candidate_identity', {}).get('first_name', '')} {final_data.get('candidate_identity', {}).get('last_name', '')}"
                candidate_id = f"name_{hashlib.md5(name.encode()).hexdigest()}"
            
            if "candidate_identity" not in final_data:
                final_data["candidate_identity"] = {}
            final_data["candidate_identity"]["candidate_id"] = candidate_id
        
        # Compare extraction vs validation to show changes
        extraction_data = extraction_result.get("data", {})
        validation_data = validation_result.get("validated_data", {})
        
        changes_made = self._compare_data(extraction_data, validation_data)
        
        return {
            "data": final_data,
            "extraction_confidence": extraction_result.get("confidence", 0.0),
            "validation_confidence": validation_result.get("confidence", 0.0),
            "extraction_model": extraction_result.get("model", ""),
            "validation_model": validation_result.get("model", ""),
            "extraction_notes": extraction_result.get("notes", ""),
            "validation_notes": validation_result.get("notes", ""),
            "extraction_tokens": extraction_result.get("token_count", 0),
            "validation_tokens": validation_result.get("token_count", 0),
            "total_tokens": extraction_result.get("token_count", 0) + validation_result.get("token_count", 0),
            "timestamp": datetime.utcnow().isoformat(),
            "changes_made": changes_made,
            "model_comparison": {
                "extraction_model": extraction_result.get("model", ""),
                "validation_model": validation_result.get("model", ""),
                "extraction_tokens": extraction_result.get("token_count", 0),
                "validation_tokens": validation_result.get("token_count", 0),
                "extraction_time": extraction_result.get("processing_time", 0),
                "validation_time": validation_result.get("processing_time", 0)
            }
        }
    
    def _compare_data(self, extraction_data: Dict[str, Any], validation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compare extraction vs validation data to show changes made"""
        changes = {
            "work_experience_changes": [],
            "education_changes": [],
            "contact_changes": [],
            "other_changes": []
        }
        
        # Compare work experience
        extraction_exp = extraction_data.get("work_experience", [])
        validation_exp = validation_data.get("work_experience", [])
        
        if len(extraction_exp) != len(validation_exp):
            changes["work_experience_changes"].append(f"Position count changed: {len(extraction_exp)} → {len(validation_exp)}")
        
        # Compare education
        extraction_edu = extraction_data.get("education", [])
        validation_edu = validation_data.get("education", [])
        
        if len(extraction_edu) != len(validation_edu):
            changes["education_changes"].append(f"Education count changed: {len(extraction_edu)} → {len(validation_edu)}")
        
        # Compare contact information
        extraction_contact = extraction_data.get("contact_information", {})
        validation_contact = validation_data.get("contact_information", {})
        
        for key in ["primary_email", "phone", "address"]:
            if extraction_contact.get(key) != validation_contact.get(key):
                changes["contact_changes"].append(f"{key}: '{extraction_contact.get(key)}' → '{validation_contact.get(key)}'")
        
        return changes
    
    def _calculate_dynamic_context(self, resume_content: str, content_length: int) -> tuple[int, str]:
        """Calculate dynamic context length based on resume content analysis"""
        
        # Analyze content complexity
        education_keywords = ['education', 'degree', 'bachelor', 'master', 'phd', 'university', 'college', 'certification']
        experience_keywords = ['experience', 'employment', 'work', 'position', 'company', 'manager', 'director']
        
        education_count = sum(1 for keyword in education_keywords if keyword.lower() in resume_content.lower())
        experience_count = sum(1 for keyword in experience_keywords if keyword.lower() in resume_content.lower())
        
        # Base calculations
        base_tokens = 2000
        base_chars = 5000
        
        # Adjust based on content length
        if content_length > 10000:
            # Very long resume - need maximum context
            max_tokens = 7200  # 6000 + 20%
            max_chars = min(content_length, 14400)  # 12000 + 20%
        elif content_length > 7000:
            # Long resume - need high context
            max_tokens = 6000  # 5000 + 20%
            max_chars = min(content_length, 12000)  # 10000 + 20%
        elif content_length > 5000:
            # Medium resume - need moderate context
            max_tokens = 4800  # 4000 + 20%
            max_chars = min(content_length, 9600)  # 8000 + 20%
        else:
            # Short resume - standard context
            max_tokens = 3600  # 3000 + 20%
            max_chars = min(content_length, 7200)  # 6000 + 20%
        
        # Adjust based on content complexity
        complexity_factor = (education_count + experience_count) / 10
        if complexity_factor > 1.5:
            max_tokens = int(max_tokens * 1.2)  # 20% more tokens for complex resumes
            max_chars = int(max_chars * 1.1)    # 10% more chars for complex resumes
        
        # Ensure minimum values
        max_tokens = max(max_tokens, 2000)
        max_chars = max(max_chars, 3000)
        
        # Truncate content
        truncated_content = resume_content[:max_chars] if len(resume_content) > max_chars else resume_content
        
        print(f"[DYNAMIC_CONTEXT] Content: {content_length} chars, Education: {education_count}, Experience: {experience_count}")
        print(f"[DYNAMIC_CONTEXT] Using {max_tokens} tokens, {max_chars} chars")
        
        return max_tokens, truncated_content
    
    def process_resume_file(self, file_path: str) -> Dict[str, Any]:
        """Process a resume file and extract data"""
        
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            filename = Path(file_path).name
            
            # Extract data
            result = self.extract_resume_data(content, filename)
            
            # Add file information
            result["file_info"] = {
                "original_filename": filename,
                "resume_file_path": file_path,
                "content_hash": hashlib.md5(content.encode()).hexdigest(),
                "file_size": len(content)
            }
            
            return result
            
        except Exception as e:
            return {
                "error": f"Failed to process file: {str(e)}",
                "data": {},
                "extraction_confidence": 0.0,
                "validation_confidence": 0.0
            }
