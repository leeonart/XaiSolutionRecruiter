"""
Enhanced Job Processor with Smart Cache Manager Integration
Implements the ultimate hybrid caching solution for AI job processing
"""

import os
import sys
import json
import time
import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI

# Import the smart cache manager
from .smart_cache_manager import SmartCacheManager
from .text_combiner import extract_text_from_docx, extract_text_from_pdf, extract_text_from_txt
from .json_optimizer import JsonOptimizer
import config

class EnhancedJobProcessor:
    def __init__(self, job_ids_to_process: List[str], folder_path: str = None, 
                 csv_path: str = None, ai_agent: str = config.DEFAULT_AI_AGENT, 
                 api_key: str = None, cache_dir: str = None):
        """
        Initialize the Enhanced JobProcessor with Smart Cache Manager
        
        Args:
            job_ids_to_process: List of job IDs to process
            folder_path: Path to the folder containing job documents
            csv_path: Path to the CSV file with job data
            ai_agent: The AI agent to use
            api_key: The API key for the selected AI agent
            cache_dir: Directory for caching results
        """
        self.job_ids = job_ids_to_process
        self.ai_agent = ai_agent
        self.api_key = api_key
        
        # Initialize Smart Cache Manager
        self.cache_manager = SmartCacheManager(cache_dir or "/app/data/cache", ai_agent)
        
        # Set up paths
        if folder_path is None:
            data_dir = os.getenv("DATA_DIR", "/app/data")
            self.folder = os.path.join(data_dir, "jobs")
        else:
            self.folder = folder_path
            
        if csv_path is None:
            data_dir = os.getenv("DATA_DIR", "/app/data")
            self.csv = os.path.join(data_dir, "MTB", "MasterTrackingBoard.csv")
        else:
            self.csv = csv_path
        
        # Initialize AI client
        self.client = None
        self.model = None
        self._initialize_ai_client()
        
        # Processing statistics
        self.processing_stats = {
            "total_jobs": len(job_ids_to_process),
            "jobs_with_files": 0,
            "jobs_without_files": 0,
            "cache_hits": 0,
            "ai_calls_made": 0,
            "processing_time": 0,
            "successful_jobs": 0,
            "failed_jobs": 0
        }
    
    def _initialize_ai_client(self):
        """Initialize the AI client based on the selected AI agent"""
        if self.ai_agent == "grok":
            api_key = self.api_key or config.load_api_key("GROK_API_KEY")
            base_url = config.GROK_BASE_URL
            model = os.getenv("GROK_MODEL", config.GROK_MODEL).strip()
        elif self.ai_agent == "gemini":
            api_key = self.api_key or config.load_api_key("GEMINI_API_KEY")
            base_url = config.GEMINI_BASE_URL
            model = os.getenv("GEMINI_MODEL", config.GEMINI_MODEL).strip()
        elif self.ai_agent == "deepseek":
            api_key = self.api_key or config.load_api_key("DEEPSEEK_API_KEY")
            base_url = config.DEEPSEEK_BASE_URL
            model = os.getenv("DEEPSEEK_MODEL", config.DEEPSEEK_MODEL).strip()
        elif self.ai_agent == "openai":
            api_key = self.api_key or config.load_api_key("OPENAI_API_KEY")
            base_url = config.OPENAI_BASE_URL
            model = os.getenv("OPENAI_MODEL", config.OPENAI_MODEL).strip()
        elif self.ai_agent == "qwen":
            api_key = self.api_key or config.load_api_key("DASHSCOPE_API_KEY")
            base_url = config.QWEN_BASE_URL
            model = os.getenv("QWEN_MODEL", config.QWEN_MODEL).strip()
        elif self.ai_agent == "zai":
            api_key = self.api_key or config.load_api_key("ZAI_API_KEY")
            base_url = config.ZAI_BASE_URL
            model = os.getenv("ZAI_MODEL", config.ZAI_MODEL).strip()
        else:
            print(f"Warning: Unknown AI agent '{self.ai_agent}'. Defaulting to Grok.")
            api_key = self.api_key or config.load_api_key("GROK_API_KEY")
            base_url = config.GROK_BASE_URL
            model = os.getenv("GROK_MODEL", config.GROK_MODEL).strip()

        # Validate API key before proceeding
        if not api_key:
            raise ValueError(f"No API key found for {self.ai_agent.upper()}. Please add it to credentials/api_keys.txt or set the {self.ai_agent.upper()}_API_KEY environment variable.")

        # Test the AI agent before proceeding with job processing
        print(f"Testing {self.ai_agent.upper()} connection before starting job processing...")
        success, message = config.test_ai_agent(self.ai_agent)
        if not success:
            raise ValueError(f"AI agent test failed: {message}")
        
        print(f"[OK] {message}")

        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        print(f"Initialized AI client: Agent='{self.ai_agent}', Model='{self.model}', Base URL='{base_url}'")
    
    def _extract_text_from_files(self, file_list: List[str], job_id: str) -> str:
        """Extract text content from a list of files"""
        text_content = ""
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        
        for doc in file_list:
            path = os.path.join(self.folder, doc)
            try:
                if not os.path.exists(path):
                    print(f"[{timestamp}] [Job {job_id}] Warning: File {path} does not exist locally. Skipping.")
                    continue
                
                file_lower = doc.lower()
                if file_lower.endswith('.docx'):
                    text_content += extract_text_from_docx(path) + "\n\n"
                elif file_lower.endswith('.pdf'):
                    text_content += extract_text_from_pdf(path) + "\n\n"
                elif file_lower.endswith('.txt'):
                    with open(path, "r", encoding="utf-8") as rd:
                        text_content += rd.read() + "\n\n"
                else:
                    # Try as text file with latin-1 encoding
                    with open(path, "r", encoding="latin-1") as rd:
                        text_content += rd.read() + "\n\n"
            except Exception as e:
                print(f"[{timestamp}] [Job {job_id}] Error reading file {path}: {e}")
        
        return text_content.strip()
    
    def _process_with_ai(self, job_id: str, text_content: str, content_type: str = "job_description") -> Dict:
        """Process text content with AI"""
        print(f"[AI PROCESSING] Processing {content_type} for job {job_id}")
        
        # Adaptive prompting based on content type
        if content_type == "job_description":
            if len(text_content.strip()) < 2000:
                prompt = f"""Extract structured data from this job description. Return ONLY valid JSON with these exact fields:
{{
  "required_education": {{
    "degree_level": "string",
    "field_of_study": "string", 
    "required_coursework": ["array of strings"]
  }},
  "required_experience": {{
    "total_years_relevant": "string",
    "specific_industry_experience": ["array of strings"],
    "function_specific_experience": ["array of strings"]
  }},
  "core_technical_tools_systems": ["array of strings"],
  "core_technical_hands_on_expertise": ["array of strings"],
  "required_soft_skills_communication": ["array of strings"],
  "required_soft_skills_traits": ["array of strings"],
  "professional_certifications": ["array of strings"],
  "mandatory_licenses": ["array of strings"],
  "dealbreakers_disqualifiers": ["array of strings"],
  "key_deliverables_responsibilities": ["array of strings"],
  "facility_operational_model": "string",
  "safety_culture_regulatory_setting": ["array of strings"],
  "culture_fit_work_style": "string",
  "language_requirements": ["array of strings"],
  "travel_shift_remote_flexibility": "string"
}}

Job Description for Job ID '{job_id}' (MINIMAL CONTENT - extract all available information):
----------------------
{text_content}
----------------------"""
            else:
                prompt = f"""Extract structured data from this job description. Return ONLY valid JSON with these exact fields:
{{
  "required_education": {{
    "degree_level": "string",
    "field_of_study": "string", 
    "required_coursework": ["array of strings"]
  }},
  "required_experience": {{
    "total_years_relevant": "string",
    "specific_industry_experience": ["array of strings"],
    "function_specific_experience": ["array of strings"]
  }},
  "core_technical_tools_systems": ["array of strings"],
  "core_technical_hands_on_expertise": ["array of strings"],
  "required_soft_skills_communication": ["array of strings"],
  "required_soft_skills_traits": ["array of strings"],
  "professional_certifications": ["array of strings"],
  "mandatory_licenses": ["array of strings"],
  "dealbreakers_disqualifiers": ["array of strings"],
  "key_deliverables_responsibilities": ["array of strings"],
  "facility_operational_model": "string",
  "safety_culture_regulatory_setting": ["array of strings"],
  "culture_fit_work_style": "string",
  "language_requirements": ["array of strings"],
  "travel_shift_remote_flexibility": "string"
}}

Job Description for Job ID '{job_id}':
----------------------
{text_content}
----------------------"""
        
        elif content_type == "notes":
            prompt = f"""Extract key information from these HR notes. Return ONLY valid JSON with these exact fields:
{{
  "hr_notes_key_requirements": "string",
  "internal_notes": "string",
  "additional_context": "string"
}}

HR Notes for Job ID '{job_id}':
----------------------
{text_content}
----------------------"""
        
        else:
            raise ValueError(f"Unknown content type: {content_type}")
        
        # Make AI request with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_completion_tokens=4000
                )
                
                ai_response = response.choices[0].message.content.strip()
                ai_data = json.loads(ai_response)
                
                self.processing_stats["ai_calls_made"] += 1
                print(f"[AI PROCESSING] Successfully processed {content_type} for job {job_id}")
                return ai_data
                
            except json.JSONDecodeError as e:
                if attempt < max_retries - 1:
                    print(f"[AI PROCESSING] JSON decode error for {job_id}, attempt {attempt + 1}: {e}")
                    time.sleep(2)
                    continue
                else:
                    raise Exception(f"Failed to parse AI response as JSON after {max_retries} attempts: {e}")
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"[AI PROCESSING] Error for {job_id}, attempt {attempt + 1}: {e}")
                    time.sleep(2)
                    continue
                else:
                    raise Exception(f"AI processing failed after {max_retries} attempts: {e}")
        
        return {}
    
    def _process_single_job(self, job_id: str) -> Optional[Dict]:
        """Process a single job with smart caching"""
        start_time = time.time()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [Job {job_id}] Starting enhanced processing with smart caching")
        
        try:
            # Find all documents for this job
            all_docs = [f for f in os.listdir(self.folder) if job_id in f]
            
            if not all_docs:
                print(f"[{timestamp}] [Job {job_id}] No documents found")
                self.processing_stats["jobs_without_files"] += 1
                self.processing_stats["failed_jobs"] += 1
                return None
            
            # Separate job description and notes documents
            jd_docs = [doc for doc in all_docs if 'note' not in doc.lower()]
            notes_docs = [doc for doc in all_docs if 'note' in doc.lower()]
            
            job_file = os.path.join(self.folder, jd_docs[0]) if jd_docs else None
            notes_file = os.path.join(self.folder, notes_docs[0]) if notes_docs else None
            
            # Use Smart Cache Manager for intelligent processing
            combined_result = self.cache_manager.smart_process_job(
                job_id=job_id,
                job_file=job_file,
                notes_file=notes_file,
                ai_processor_func=self._ai_processor_wrapper
            )
            
            # Load MTB data for optimization
            mtb_data = self._load_mtb_data(job_id)
            
            # Optimize the result
            if job_file and os.path.exists(job_file):
                optimizer = JsonOptimizer(input_file=self.csv)
                optimized_data = optimizer.optimize_job(
                    combined_result, 
                    mtb_data or {}, 
                    job_id, 
                    "",  # notes will be handled separately
                    combined_result.get('hr_notes_key_requirements', '')
                )
            else:
                optimized_data = combined_result
            
            duration = time.time() - start_time
            print(f"[{timestamp}] [Job {job_id}] Successfully processed in {duration:.2f} seconds")
            
            self.processing_stats["jobs_with_files"] += 1
            self.processing_stats["successful_jobs"] += 1
            self.processing_stats["processing_time"] += duration
            
            return optimized_data
            
        except Exception as e:
            duration = time.time() - start_time
            print(f"[{timestamp}] [Job {job_id}] Processing failed after {duration:.2f} seconds: {e}")
            self.processing_stats["failed_jobs"] += 1
            return None
    
    def _ai_processor_wrapper(self, job_id: str, file_path: str, content_type: str) -> Dict:
        """Wrapper function for AI processing that can be called by Smart Cache Manager"""
        try:
            # Extract text content
            if content_type == "job_description":
                jd_docs = [os.path.basename(file_path)]
                text_content = self._extract_text_from_files(jd_docs, job_id)
            elif content_type == "notes":
                notes_docs = [os.path.basename(file_path)]
                text_content = self._extract_text_from_files(notes_docs, job_id)
            else:
                raise ValueError(f"Unknown content type: {content_type}")
            
            if not text_content.strip():
                print(f"[AI PROCESSING] No content extracted for {content_type} in job {job_id}")
                return {}
            
            # Process with AI
            result = self._process_with_ai(job_id, text_content, content_type)
            
            # For notes processing, log audit information
            if content_type == "notes" and result:
                self._log_notes_audit(job_id, file_path, text_content, result)
            
            return result
            
        except Exception as e:
            print(f"[AI PROCESSING] Error processing {content_type} for job {job_id}: {e}")
            return {}
    
    def _load_mtb_data(self, job_id: str) -> Optional[Dict]:
        """Load MTB data for a specific job ID"""
        try:
            if os.path.exists(self.csv):
                df = pd.read_csv(self.csv, dtype=str)
                job_row = df[df['JobID'] == job_id]
                if not job_row.empty:
                    return job_row.iloc[0].to_dict()
        except Exception as e:
            print(f"Error loading MTB data for job {job_id}: {e}")
        return None
    
    def run(self) -> str:
        """Run the enhanced job processing with smart caching"""
        print(f"\n🚀 Starting Enhanced Job Processing with Smart Cache Manager")
        print(f"📊 Processing {len(self.job_ids)} jobs with {self.ai_agent} AI agent")
        print(f"💾 Using hybrid caching with configurable policies")
        
        start_time = time.time()
        processed_jobs = []
        
        # Process jobs in parallel for better performance
        max_workers = min(4, len(self.job_ids))  # Limit concurrent jobs
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all jobs for processing
            future_to_job = {
                executor.submit(self._process_single_job, job_id): job_id 
                for job_id in self.job_ids
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_job):
                job_id = future_to_job[future]
                try:
                    result = future.result()
                    if result:
                        processed_jobs.append(result)
                        print(f"✅ Completed job {job_id}")
                    else:
                        print(f"❌ Failed job {job_id}")
                except Exception as e:
                    print(f"❌ Exception for job {job_id}: {e}")
        
        # Create output file
        output_file = self._create_output_file(processed_jobs)
        
        # Print comprehensive statistics
        self._print_processing_statistics(start_time)
        
        return output_file
    
    def _log_notes_audit(self, job_id: str, file_path: str, notes_content: str, ai_result: Dict):
        """Log notes processing for audit trail"""
        try:
            # Store audit information for later processing by the backend
            if not hasattr(self, '_audit_logs'):
                self._audit_logs = []
            
            audit_entry = {
                'job_id': job_id,
                'notes_file_path': file_path,
                'notes_content': notes_content,
                'ai_result': ai_result,
                'ai_agent': self.ai_agent,
                'timestamp': datetime.datetime.now().isoformat()
            }
            
            self._audit_logs.append(audit_entry)
            print(f"[AUDIT] Logged notes processing for job {job_id}")
            
        except Exception as e:
            print(f"[AUDIT ERROR] Failed to log notes audit for job {job_id}: {e}")
    
    def get_audit_logs(self) -> List[Dict]:
        """Get all audit logs from this processing session"""
        return getattr(self, '_audit_logs', [])
    
    def _create_output_file(self, processed_jobs: List[Dict]) -> str:
        """Create the final output JSON file"""
        # Create output directory
        output_dir = os.path.join(os.getenv("DATA_DIR", "/app/data"), "json_output")
        os.makedirs(output_dir, exist_ok=True)
        
        # Create filename with timestamp
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"enhanced_jobs_{timestamp}_optimized.json"
        output_path = os.path.join(output_dir, filename)
        
        # Prepare output data
        output_data = {
            "metadata": {
                "processing_timestamp": datetime.datetime.now().isoformat(),
                "ai_agent": self.ai_agent,
                "total_jobs_processed": len(processed_jobs),
                "cache_manager_used": True,
                "enhanced_processing": True
            },
            "jobs": processed_jobs
        }
        
        # Save to file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Output saved to: {output_path}")
        return output_path
    
    def _print_processing_statistics(self, start_time: float):
        """Print comprehensive processing and cache statistics"""
        total_time = time.time() - start_time
        
        print(f"\n🎯 ENHANCED PROCESSING STATISTICS:")
        print(f"⏱️  Total Processing Time: {total_time:.2f} seconds")
        print(f"📊 Total Jobs: {self.processing_stats['total_jobs']}")
        print(f"✅ Successful: {self.processing_stats['successful_jobs']}")
        print(f"❌ Failed: {self.processing_stats['failed_jobs']}")
        print(f"📁 Jobs with Files: {self.processing_stats['jobs_with_files']}")
        print(f"📄 Jobs without Files: {self.processing_stats['jobs_without_files']}")
        print(f"🤖 AI Calls Made: {self.processing_stats['ai_calls_made']}")
        
        # Print smart cache statistics
        self.cache_manager.print_cache_statistics()
        
        # Calculate efficiency metrics
        if self.processing_stats['total_jobs'] > 0:
            success_rate = (self.processing_stats['successful_jobs'] / self.processing_stats['total_jobs']) * 100
            avg_time_per_job = total_time / self.processing_stats['total_jobs']
            print(f"📈 Success Rate: {success_rate:.1f}%")
            print(f"⚡ Average Time per Job: {avg_time_per_job:.2f} seconds")
        
        cache_stats = self.cache_manager.get_cache_statistics()
        if cache_stats['statistics']['ai_calls_saved'] > 0:
            print(f"💰 AI Calls Saved: {cache_stats['statistics']['ai_calls_saved']}")
            print(f"💡 Tokens Saved: {cache_stats['statistics']['tokens_saved']:,}")
            
            # Estimate cost savings (rough estimate: $0.03 per 1K tokens)
            estimated_cost_saved = (cache_stats['statistics']['tokens_saved'] / 1000) * 0.03
            print(f"💵 Estimated Cost Saved: ${estimated_cost_saved:.2f}")
    
    def get_cache_manager(self) -> SmartCacheManager:
        """Get the cache manager instance for external access"""
        return self.cache_manager
