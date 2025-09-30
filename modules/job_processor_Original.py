import os
import sys
import json
import hashlib
from typing import List, Dict, Any, Optional
import openai
from openai import OpenAI
import config
from .utils import clean_api_output
from .text_combiner import extract_text_from_docx, extract_text_from_pdf, extract_text_from_txt
import pandas as pd
import datetime
import time
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor, as_completed
from .gdrive_operations import authenticate_drive
from .json_optimizer import JsonOptimizer

class JobProcessor:
    def __init__(self, job_ids_to_process: List[str], folder_path: str = None, csv_path: str = None, ai_agent: str = config.DEFAULT_AI_AGENT, api_key: str = None, cache_dir: str = None):
        """
        Initialize the JobProcessor.
        
        Args:
            job_ids_to_process: List of job IDs to process
            folder_path: Path to the folder containing job documents (defaults to /app/data/jobs/)
            csv_path: Path to the CSV file with job data (defaults to /app/data/MTB/MasterTrackingBoard.csv)
            ai_agent: The AI agent to use (grok, gemini, deepseek, openai)
            api_key: The API key for the selected AI agent
            cache_dir: Directory for caching results (defaults to /app/data/cache)
        """
        self.job_ids = job_ids_to_process
        
        # Set up cache directory
        self.cache_dir = cache_dir or "/app/data/cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Initialize token statistics
        self.token_stats = {
            "total_uploaded": 0,
            "total_cached": 0,
            "total_output": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "ai_calls": 0,
            "processing_time": 0
        }
        
        # Load existing cache
        self.cache_file = os.path.join(self.cache_dir, f"job_cache_{ai_agent}.json")
        self.cache = self._load_cache()
        
        # Set default paths if not provided
        if folder_path is None:
            data_dir = os.getenv("DATA_DIR", "/app/data")
            jobs_dir = os.path.join(data_dir, "jobs")
            os.makedirs(jobs_dir, exist_ok=True)
            self.folder = jobs_dir
        else:
            self.folder = folder_path
            
        if csv_path is None:
            data_dir = os.getenv("DATA_DIR", "/app/data")
            mtb_dir = os.path.join(data_dir, "MTB")
            self.csv = os.path.join(mtb_dir, "MasterTrackingBoard.csv")
        else:
            self.csv = csv_path
            
        self.ai_agent = ai_agent.lower()
        self.api_key = api_key
         
        self._initialize_ai_client()

    def _initialize_ai_client(self):
        """
        Initializes the AI client based on the selected AI agent.
        Uses environment variable overrides for model names at runtime to reflect menu changes.
        """
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

    def upload_to_gdrive(self, local_path: str, filename: str) -> bool:
        """
        Upload a file to Google Drive with retry mechanism.
        
        Args:
            local_path: Local path of the file to upload
            filename: Name to use for the file in Google Drive
            
        Returns:
            bool: True if upload was successful, False otherwise
        """
        max_retries = 3
        for attempt in range(max_retries):
            try:
                drive = authenticate_drive()
                if not drive:
                    print(f"Failed to authenticate with Google Drive for file upload (attempt {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        time.sleep(2 * (attempt + 1))  # Exponential backoff
                    continue
                    
                # Get the Google Drive folder ID
                folder_id = "1h_tR64KptPn3UC1t4ytufyUYHOls71du"  # Default folder ID
                
                # Create file metadata
                file_metadata = {
                    'title': filename,
                    'parents': [{'id': folder_id}]
                }
                
                # Create the file and upload
                file = drive.CreateFile(file_metadata)
                file.SetContentFile(local_path)
                file.Upload()
                
                print(f"Successfully uploaded {filename} to Google Drive folder")
                return True
            except Exception as e:
                print(f"Error uploading {filename} to Google Drive (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1))  # Exponential backoff for retries
                else:
                    print(f"Failed to upload {filename} after {max_retries} attempts")
                    return False
        return False
    
    def _process_job(self, jid: str) -> Dict[str, Any]:
        """
        Process a single job ID and return the extracted data.

        Args:
            jid: Job ID to process

        Returns:
            Dict containing the processed job data, or None if processing failed
        """
        start_time = time.time()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [Job {jid}] Starting processing")

        # Retry logic for job processing
        max_job_retries = 3
        job_retry_count = 0

        while job_retry_count < max_job_retries:
            try:
                return self._process_job_single_attempt(jid, job_retry_count)
            except Exception as e:
                job_retry_count += 1
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")

                if job_retry_count < max_job_retries:
                    retry_delay = min(30, 5 * (2 ** job_retry_count))  # Exponential backoff, max 30 seconds
                    print(f"[{timestamp}] [Job {jid}] Attempt {job_retry_count} failed: {str(e)}")
                    print(f"[{timestamp}] [Job {jid}] Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    print(f"[{timestamp}] [Job {jid}] All {max_job_retries} attempts failed: {str(e)}")
                    # Create error log for failed job
                    self._log_job_error(jid, str(e), "MAX_RETRIES_EXCEEDED")
                    return None

        return None

    def _log_job_error(self, jid: str, error_message: str, error_type: str):
        """
        Log detailed error information for a failed job.

        Args:
            jid: Job ID that failed
            error_message: The error message
            error_type: Type of error (e.g., "AI_TIMEOUT", "JSON_PARSE", "FILE_NOT_FOUND")
        """
        error_log_path = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", f"job_error_details_{jid}.txt")
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Ensure output directory exists
        os.makedirs(os.path.dirname(error_log_path), exist_ok=True)

        try:
            with open(error_log_path, "w", encoding="utf-8") as f:
                f.write(f"Job ID: {jid}\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"AI Agent: {self.ai_agent}\n")
                f.write(f"Model: {self.model}\n")
                f.write(f"Error Type: {error_type}\n")
                f.write(f"Error Message: {error_message}\n")
                f.write("-" * 50 + "\n")

                # Add context about files that were found
                try:
                    all_docs = [f for f in os.listdir(self.folder) if jid in f]
                    f.write(f"Files found for job {jid}: {len(all_docs)}\n")
                    for doc in all_docs:
                        f.write(f"  - {doc}\n")
                except Exception as file_err:
                    f.write(f"Could not list files: {file_err}\n")

            print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] [Job {jid}] Detailed error log saved to {error_log_path}")

        except Exception as log_err:
            print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] [Job {jid}] Failed to write error log: {log_err}")

    def _load_cache(self) -> Dict[str, Any]:
        """Load existing cache from file"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    cache = json.load(f)
                    print(f"Loaded cache with {len(cache)} entries")
                    return cache
            except Exception as e:
                print(f"Error loading cache: {e}")
        return {}
    
    def _save_cache(self):
        """Save cache to file"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2)
            print(f"Saved cache with {len(self.cache)} entries")
        except Exception as e:
            print(f"Error saving cache: {e}")
    
    def _get_file_hash(self, file_path: str) -> str:
        """Get MD5 hash of file content"""
        if not os.path.exists(file_path):
            return ""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return ""
    
    def _get_cache_key(self, job_id: str, job_file: str, notes_file: str) -> str:
        """Generate cache key based on job ID and file hashes"""
        job_hash = self._get_file_hash(job_file) if job_file else ""
        notes_hash = self._get_file_hash(notes_file) if notes_file else ""
        return f"{job_id}_{job_hash}_{notes_hash}"
    
    def _is_cache_valid(self, job_id: str, job_file: str, notes_file: str) -> bool:
        """Check if cached data is still valid"""
        cache_key = self._get_cache_key(job_id, job_file, notes_file)
        return cache_key in self.cache
    
    def _get_cached_result(self, job_id: str, job_file: str, notes_file: str) -> Optional[Dict]:
        """Get cached result if available and valid"""
        if self._is_cache_valid(job_id, job_file, notes_file):
            cache_key = self._get_cache_key(job_id, job_file, notes_file)
            cached_data = self.cache[cache_key]
            
            # Update token stats
            self.token_stats["cache_hits"] += 1
            self.token_stats["total_cached"] += cached_data.get("token_count", 0)
            
            print(f"[CACHE HIT] Job {job_id} - using cached result")
            return cached_data["data"]
        
        self.token_stats["cache_misses"] += 1
        return None
    
    def _save_to_cache(self, job_id: str, job_file: str, notes_file: str, 
                      job_data: Dict, token_count: int):
        """Save result to cache"""
        cache_key = self._get_cache_key(job_id, job_file, notes_file)
        self.cache[cache_key] = {
            "data": job_data,
            "token_count": token_count,
            "cached_at": datetime.datetime.now().isoformat(),
            "ai_agent": self.ai_agent,
            "model": self.model
        }
    
    def _print_cache_statistics(self):
        """Print cache statistics"""
        stats = self.token_stats
        print(f"\n📊 CACHE STATISTICS:")
        print(f"📁 Total Jobs Processed: {stats['ai_calls'] + stats['cache_hits']}")
        print(f"🤖 AI Calls Made: {stats['ai_calls']}")
        print(f"💾 Cache Hits: {stats['cache_hits']}")
        print(f"❌ Cache Misses: {stats['cache_misses']}")
        print(f"💰 Tokens Used: {stats['total_uploaded'] + stats['total_output']:,}")
        print(f"💾 Tokens from Cache: {stats['total_cached']:,}")
        
        if stats['cache_hits'] + stats['cache_misses'] > 0:
            cache_hit_rate = (stats['cache_hits'] / (stats['cache_hits'] + stats['cache_misses'])) * 100
            print(f"🎯 Cache Hit Rate: {cache_hit_rate:.1f}%")
        
        if stats['cache_hits'] > 0:
            print(f"💡 Optimization saved {stats['cache_hits']} AI calls and {stats['total_cached']:,} tokens!")

    def _process_job_single_attempt(self, jid: str, attempt_number: int = 0) -> Dict[str, Any]:
        """
        Single attempt to process a job ID.

        Args:
            jid: Job ID to process
            attempt_number: Current attempt number (for logging)

        Returns:
            Dict containing the processed job data, or raises exception if failed
        """
        start_time = time.time()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")

        if attempt_number > 0:
            print(f"[{timestamp}] [Job {jid}] Attempt {attempt_number + 1} starting...")

        try:
            all_docs = [f for f in os.listdir(self.folder) if jid in f]

            if not all_docs:
                error_msg = f"No documents found for job {jid} in folder {self.folder}"
                print(f"[{timestamp}] [Job {jid}] {error_msg}")
                raise FileNotFoundError(error_msg)

            jd_docs = [doc for doc in all_docs if 'note' not in doc.lower()]
            notes_docs = [doc for doc in all_docs if 'note' in doc.lower()]
                
            def extract_text_from_files(file_list):
                text_content = ""
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                for doc in file_list:
                    path = os.path.join(self.folder, doc)
                    try:
                        if not os.path.exists(path):
                            print(f"[{timestamp}] [Job {jid}] Warning: File {path} does not exist locally. Skipping.")
                            continue
                        
                        file_lower = doc.lower()
                        if file_lower.endswith(".pdf"):
                            text_content += extract_text_from_pdf(path) + "\n\n"
                        elif file_lower.endswith(".docx") or file_lower.endswith(".doc"):
                            text_content += extract_text_from_docx(path) + "\n\n"
                        elif file_lower.endswith(".txt"):
                            text_content += extract_text_from_txt(path) + "\n\n"
                        else:
                            try:
                                with open(path, "r", encoding="utf-8") as rd:
                                    text_content += rd.read() + "\n\n"
                            except UnicodeDecodeError:
                                with open(path, "r", encoding="latin-1") as rd:
                                    text_content += rd.read() + "\n\n"
                    except Exception as e:
                        print(f"[{timestamp}] [Job {jid}] Error reading file {path}: {e}")
                return text_content.strip()

            combined_jd_text = extract_text_from_files(jd_docs)
            hr_notes_text = extract_text_from_files(notes_docs)
            
            # Check cache first
            job_file = jd_docs[0] if jd_docs else None
            notes_file = notes_docs[0] if notes_docs else None
            if job_file:
                job_file = os.path.join(self.folder, job_file)
            if notes_file:
                notes_file = os.path.join(self.folder, notes_file)
            
            cached_result = self._get_cached_result(jid, job_file, notes_file)
            if cached_result:
                print(f"[{timestamp}] [Job {jid}] Using cached result")
                return cached_result
            
            # The AI should analyze both the JD and the notes for context
            text_for_ai = combined_jd_text
            if hr_notes_text:
                text_for_ai += "\n\n--- HR NOTES ---\n" + hr_notes_text

            if not text_for_ai.strip():
                error_msg = f"No readable content found in documents for job {jid}"
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"[{timestamp}] [Job {jid}] {error_msg}")
                raise ValueError(error_msg)
            
            # Adaptive prompting based on content length and quality
            content_length = len(text_for_ai.strip())
            is_minimal_content = content_length < 2000  # Less than ~2KB of content

            if is_minimal_content:
                # Enhanced prompt for sparse/minimal job descriptions
                prompt = f"""
You are an expert in recruitment process automation. Your task is to extract key information from the provided job description text and structure it as a JSON object.

IMPORTANT: This appears to be a MINIMAL or BRIEF job description. Be extra thorough in extracting every piece of information available, even if it's limited. Look for:
- Any education requirements mentioned (even if brief)
- Any experience requirements or preferences
- Any skills, certifications, or qualifications mentioned
- Any responsibilities or duties described
- Any industry or regulatory information
- Any compensation or work arrangement details

If information is not explicitly mentioned, use empty strings/arrays rather than guessing. However, extract ALL available information from even brief descriptions.

The JSON output must follow this structure:

{{
  "required_education": {{
  "degree_level": "",
  "field_of_study": "",
  "required_coursework": []
  }},
  "required_experience": {{
  "total_years_relevant": "",
  "specific_industry_experience": [],
  "function_specific_experience": []
  }},
  "core_technical_skills": {{
  "tools_systems_software_machinery": [],
  "hands_on_expertise": []
  }},
  "required_soft_skills": {{
  "communication_teamwork_problem_solving_leadership": [],
  "traits_for_success": []
  }},
  "certifications_and_licenses": {{
  "professional_certifications": [],
  "mandatory_licenses": []
  }},
  "dealbreakers_disqualifiers": [],
  "key_deliverables_responsibilities": [],
  "industry_plant_environment": {{
  "facility_operational_model": "",
  "safety_culture_regulatory_setting": []
  }},
  "bonus_criteria": {{
  "culture_fit_work_style": "",
  "language_requirements": [],
  "travel_shift_remote_flexibility": ""
  }}
}}

Job Description and Notes for Job ID '{jid}' (MINIMAL CONTENT - extract all available information):
---------------------
{text_for_ai}
---------------------

JSON Output:
"""
            else:
                # Standard prompt for comprehensive job descriptions
                prompt = f"""
You are an expert in recruitment process automation. Your task is to extract key information from the provided job description text and structure it as a JSON object based on the following criteria.

Focus ONLY on the information present in the text. Do not infer or add data that is not explicitly mentioned. The goal is to capture the requirements as stated in the job description for later matching against a resume.

The JSON output must follow this structure. If a field is not mentioned in the text, use an empty string, an empty array, or null.

{{
  "required_education": {{
  "degree_level": "",
  "field_of_study": "",
  "required_coursework": []
  }},
  "required_experience": {{
  "total_years_relevant": "",
  "specific_industry_experience": [],
  "function_specific_experience": []
  }},
  "core_technical_skills": {{
  "tools_systems_software_machinery": [],
  "hands_on_expertise": []
  }},
  "required_soft_skills": {{
  "communication_teamwork_problem_solving_leadership": [],
  "traits_for_success": []
  }},
  "certifications_and_licenses": {{
  "professional_certifications": [],
  "mandatory_licenses": []
  }},
  "dealbreakers_disqualifiers": [],
  "key_deliverables_responsibilities": [],
  "industry_plant_environment": {{
  "facility_operational_model": "",
  "safety_culture_regulatory_setting": []
  }},
  "bonus_criteria": {{
  "culture_fit_work_style": "",
  "language_requirements": [],
  "travel_shift_remote_flexibility": ""
  }}
}}

Job Description and Notes for Job ID '{jid}':
---------------------
{text_for_ai}
---------------------

JSON Output:
"""
            
            try:
                # Use the new OpenAI client API with enhanced retry logic and JSON extraction
                max_retries = 5
                retry_count = 0
                success = False
                
                while retry_count < max_retries and not success:
                    try:
                        api_start_time = time.time()
                        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] [Job {jid}] Sending request to AI model (attempt {retry_count + 1}/{max_retries})...")
                        
                        # Adjust prompt slightly on retries to encourage better response
                        current_prompt = prompt
                        if retry_count > 0:
                            current_prompt += f"\n\nPlease ensure the response is valid JSON. Previous attempt failed. Attempt {retry_count + 1} of {max_retries}."
                        
                        # Add timeout handling for AI requests using threading
                        import threading

                        response = None
                        timeout_error = None

                        def make_request():
                            nonlocal response, timeout_error
                            try:
                                response = self.client.chat.completions.create(
                                    model=self.model,
                                    messages=[{"role": "user", "content": current_prompt}]
                                )
                            except Exception as e:
                                timeout_error = e

                        # Create and start the request thread
                        request_thread = threading.Thread(target=make_request)
                        request_thread.daemon = True
                        request_thread.start()

                        # Wait for the request to complete with timeout (5 minutes)
                        request_thread.join(timeout=300)

                        if request_thread.is_alive():
                            # Thread is still running, request timed out
                            raise TimeoutError(f"AI request timed out after 5 minutes for job {jid}")
                        elif timeout_error:
                            # Request completed but with an error
                            raise timeout_error
                        elif not response:
                            # No response and no error - this shouldn't happen
                            raise RuntimeError(f"AI request failed silently for job {jid}")
                        
                        api_duration = time.time() - api_start_time
                        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] [Job {jid}] AI model response received in {api_duration:.2f} seconds")
                        
                        text = clean_api_output(response.choices[0].message.content)
                        
                        # Check if the response is empty or lacks JSON structure
                        if not text.strip():
                            raise ValueError("Empty response from AI model")
                        if "{" not in text or "}" not in text:
                            raise ValueError("Response does not appear to be valid JSON (missing braces)")

                        # Log the raw AI response for debugging
                        debug_log_path = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", f"{jid}_ai_response_debug.txt")
                        os.makedirs(os.path.dirname(debug_log_path), exist_ok=True)
                        with open(debug_log_path, "w", encoding="utf-8") as debug_file:
                            debug_file.write(f"Job ID: {jid}\n")
                            debug_file.write(f"Timestamp: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                            debug_file.write(f"AI Agent: {self.ai_agent}\n")
                            debug_file.write(f"Model: {self.model}\n")
                            debug_file.write(f"Text length: {len(text)}\n\n")
            
                            # Log the actual text content that was sent to AI
                            debug_file.write("TEXT SENT TO AI:\n")
                            debug_file.write("="*50 + "\n")
                            debug_file.write(text_for_ai)
                            debug_file.write("\n" + "="*50 + "\n\n")
            
                            debug_file.write("RAW AI RESPONSE:\n")
                            debug_file.write("="*50 + "\n")
                            debug_file.write(text)
                            debug_file.write("\n" + "="*50 + "\n")

                        # Attempt to extract JSON content if it's embedded in text
                        json_start = text.find("{")
                        json_end = text.rfind("}")
                        if json_start >= 0 and json_end > json_start:
                            potential_json = text[json_start:json_end+1]
                            try:
                                job_data = json.loads(potential_json)
                                success = True

                                # Log successful parsing
                                with open(debug_log_path, "a", encoding="utf-8") as debug_file:
                                    debug_file.write("\nSUCCESSFULLY PARSED JSON:\n")
                                    debug_file.write("="*30 + "\n")
                                    debug_file.write(json.dumps(job_data, indent=2))
                                    debug_file.write("\n" + "="*30 + "\n")

                            except json.JSONDecodeError as json_err:
                                # Log the parsing error
                                with open(debug_log_path, "a", encoding="utf-8") as debug_file:
                                    debug_file.write(f"\nJSON PARSING ERROR: {json_err}\n")
                                    debug_file.write("EXTRACTED JSON TEXT:\n")
                                    debug_file.write(potential_json)
                                    debug_file.write("\n" + "="*30 + "\n")
        
                                # If extraction fails, try the full text as a last resort
                                try:
                                    job_data = json.loads(text)
                                    success = True
        
                                    with open(debug_log_path, "a", encoding="utf-8") as debug_file:
                                        debug_file.write("SUCCESSFULLY PARSED FULL TEXT AS JSON\n")
                                        debug_file.write("="*30 + "\n")
                                        debug_file.write(json.dumps(job_data, indent=2))
                                        debug_file.write("\n" + "="*30 + "\n")
        
                                except json.JSONDecodeError:
                                    with open(debug_log_path, "a", encoding="utf-8") as debug_file:
                                        debug_file.write("FAILED TO PARSE FULL TEXT AS JSON\n")
                                    raise ValueError(f"Could not parse JSON from AI response for job {jid}: {json_err}")
                        else:
                            # Log the issue with JSON structure
                            with open(debug_log_path, "a", encoding="utf-8") as debug_file:
                                debug_file.write("\nNO VALID JSON STRUCTURE FOUND\n")
                                debug_file.write(f"JSON start: {json_start}, JSON end: {json_end}\n")
                            raise ValueError("Could not find valid JSON structure in response")
                        
                    except (json.JSONDecodeError, ValueError) as e:
                        retry_count += 1
                        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                        if retry_count < max_retries:
                            print(f"[{timestamp}] [Job {jid}] Error parsing AI response: {e}. Retrying ({retry_count}/{max_retries})...")
                            time.sleep(2 * retry_count)  # Exponential backoff for retries
                        else:
                            print(f"[{timestamp}] [Job {jid}] Failed to get valid JSON after {max_retries} attempts: {e}")
                            # Save the raw text for debugging with detailed error info
                            error_path = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", f"{jid}_error.txt")
                            with open(error_path, "w", encoding="utf-8") as w:
                                error_content = f"Error: {str(e)}\n\nRaw Response:\n{text if 'text' in locals() else 'No response text'}"
                                w.write(error_content)
                            print(f"[{timestamp}] [Job {jid}] Raw response and error details saved to {error_path}")
                            return None
                
                # If we got here, we have valid JSON data from the AI
                ai_job_data = job_data

                # Log the quality of extracted information and assess content completeness
                with open(debug_log_path, "a", encoding="utf-8") as debug_file:
                    debug_file.write("\nEXTRACTION QUALITY ANALYSIS:\n")
                    debug_file.write("="*40 + "\n")

                    # Count non-empty fields
                    total_fields = 0
                    filled_fields = 0
                    content_quality_score = 0

                    def analyze_dict(data, prefix=""):
                        nonlocal total_fields, filled_fields, content_quality_score
                        for key, value in data.items():
                            total_fields += 1
                            if isinstance(value, dict):
                                analyze_dict(value, f"{prefix}{key}.")
                            elif isinstance(value, list):
                                if value:  # Non-empty list
                                    filled_fields += 1
                                    content_quality_score += 1
                                    debug_file.write(f"✓ {prefix}{key}: {len(value)} items\n")
                                else:
                                    debug_file.write(f"✗ {prefix}{key}: empty list\n")
                            else:
                                if value and str(value).strip():
                                    filled_fields += 1
                                    content_quality_score += 1
                                    debug_file.write(f"✓ {prefix}{key}: '{value}'\n")
                                else:
                                    debug_file.write(f"✗ {prefix}{key}: empty/null\n")

                    analyze_dict(ai_job_data)
                    extraction_rate = (filled_fields / total_fields * 100) if total_fields > 0 else 0

                    # Assess content quality
                    quality_assessment = "UNKNOWN"
                    if extraction_rate >= 50:
                        quality_assessment = "EXCELLENT"
                    elif extraction_rate >= 30:
                        quality_assessment = "GOOD"
                    elif extraction_rate >= 15:
                        quality_assessment = "FAIR"
                    else:
                        quality_assessment = "POOR"

                    debug_file.write(f"\nSUMMARY: {filled_fields}/{total_fields} fields filled ({extraction_rate:.1f}%)\n")
                    debug_file.write(f"CONTENT QUALITY: {quality_assessment}\n")

                    # Flag jobs that need attention
                    if extraction_rate < 30:
                        debug_file.write("⚠️  WARNING: Low extraction rate - job description may be incomplete\n")
                        debug_file.write("   Recommendations:\n")
                        debug_file.write("   - Review original job description document\n")
                        debug_file.write("   - Check if JD contains sufficient detail\n")
                        debug_file.write("   - Consider manual data entry for critical fields\n")

                    # Create a quality report file for jobs that need attention
                    if extraction_rate < 50:
                        quality_report_path = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", f"{jid}_quality_report.txt")
                        with open(quality_report_path, "w", encoding="utf-8") as qr:
                            qr.write(f"JOB QUALITY REPORT - Job ID {jid}\n")
                            qr.write("="*50 + "\n")
                            qr.write(f"Extraction Rate: {extraction_rate:.1f}%\n")
                            qr.write(f"Quality Assessment: {quality_assessment}\n")
                            qr.write(f"Text Length: {len(text_for_ai)} characters\n")
                            qr.write(f"Timestamp: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

                            if extraction_rate < 30:
                                qr.write("CRITICAL ISSUES:\n")
                                qr.write("- Very low extraction rate indicates incomplete job description\n")
                                qr.write("- May need manual review and data entry\n\n")

                            qr.write("MISSING FIELDS:\n")
                            missing_fields = []
                            def find_missing(data, prefix=""):
                                for key, value in data.items():
                                    if isinstance(value, dict):
                                        find_missing(value, f"{prefix}{key}.")
                                    elif isinstance(value, list):
                                        if not value:
                                            missing_fields.append(f"{prefix}{key}")
                                    else:
                                        if not value or not str(value).strip():
                                            missing_fields.append(f"{prefix}{key}")

                            find_missing(ai_job_data)
                            if missing_fields:
                                for field in missing_fields[:10]:  # Show first 10
                                    qr.write(f"- {field}\n")
                                if len(missing_fields) > 10:
                                    qr.write(f"- ... and {len(missing_fields) - 10} more\n")
                            else:
                                qr.write("None\n")

                            qr.write("\nRECOMMENDATIONS:\n")
                            if extraction_rate < 15:
                                qr.write("- HIGH PRIORITY: Review job description document\n")
                                qr.write("- Consider manual data entry for critical fields\n")
                            elif extraction_rate < 30:
                                qr.write("- MEDIUM PRIORITY: Verify job description completeness\n")
                                qr.write("- Check if additional documentation exists\n")
                            else:
                                qr.write("- LOW PRIORITY: Monitor for future improvements\n")

                        print(f"[QUALITY] Created quality report: {quality_report_path}")

                # Initialize a clean dictionary for the final, merged data
                final_job_data = {}
                
                # Fetch the corresponding data from the MTB
                mtb_row = None
                if self.mtb_df is not None:
                    try:
                        job_id_col = 'JobID' if 'JobID' in self.mtb_df.columns else self.mtb_df.columns[0]
                        mtb_row_df = self.mtb_df[self.mtb_df[job_id_col] == jid]
                        if not mtb_row_df.empty:
                            mtb_row = mtb_row_df.iloc[0].to_dict()
                            # Clean NaN values from the MTB data before they cause JSON errors
                            for key, value in mtb_row.items():
                                if pd.isna(value):
                                    mtb_row[key] = None
                            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                            print(f"[{timestamp}] [Job {jid}] Loaded and cleaned data from MTB.")
                    except Exception as e:
                        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] [Job {jid}] Error loading MTB data: {e}.")

                # If MTB data was successfully loaded, use it as the base and enrich it with AI data
                if mtb_row:
                    # Use MTB data for key fields, falling back to AI data only if MTB is empty
                    final_job_data['job_title'] = final_job_data.get('Position') or ai_job_data.get('job_title')
                    final_job_data['industry_type'] = final_job_data.get('Industry/Segment') or ai_job_data.get('industry_type')

                    # Combine notes
                    mtb_notes = final_job_data.get('Notes', '') or ''
                    ai_notes = ai_job_data.get('hr_notes_key_requirements', '') or ''
                    combined_notes = []
                    if mtb_notes:
                        combined_notes.append(f"MTB Notes: {mtb_notes}")
                    if ai_notes:
                        combined_notes.append(f"JD/Notes Analysis: {ai_notes}")
                    final_job_data['hr_notes_key_requirements'] = "\n".join(combined_notes)

                    # Handle nested structures, prioritizing MTB data
                    ai_location = ai_job_data.get('work_eligibility_location', {})
                    final_job_data['work_eligibility_location'] = {
                        'location': f"{final_job_data.get('City', '')}, {final_job_data.get('State', '')}, {final_job_data.get('Country', '')}",
                        'authorized_in_country': final_job_data.get('Visa') or ai_location.get('authorized_in_country'),
                        'relocation_required': ai_location.get('relocation_required'),
                        'travel_requirements': ai_location.get('travel_requirements')
                    }
                    
                    # Add any other fields from the AI schema that are not already in the final data
                    for key, value in ai_job_data.items():
                        if key not in final_job_data:
                            final_job_data[key] = value
                else:
                    # If no MTB data was found, use the AI data as the base
                    final_job_data = ai_job_data
                    print(f"[{timestamp}] [Job {jid}] No matching row found in MTB CSV, using AI data as base.")

                # Ensure job_id is correctly set from the processing context
                final_job_data['job_id'] = jid

                # Optimize the final JSON
                # Pass the CSV path for provenance so 'source_file' is populated instead of 'Unknown'
                optimizer = JsonOptimizer(input_file=self.csv)
                # Pass the combined text to the optimizer for better salary extraction
                combined_text_for_optimizer = (combined_jd_text or "") + ("\n" + hr_notes_text if hr_notes_text else "")
                optimized_data = optimizer.optimize_job(ai_job_data, mtb_row or {}, jid, hr_notes_text, combined_text_for_optimizer)

                duration = time.time() - start_time
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"[{timestamp}] [Job {jid}] Successfully processed and optimized in {duration:.2f} seconds")

                # Save to cache
                # Calculate approximate token count (rough estimate: 1 token ≈ 4 characters)
                estimated_tokens = len(text_for_ai) // 4 if 'text_for_ai' in locals() else 0
                self._save_to_cache(jid, job_file, notes_file, optimized_data, estimated_tokens)
                
                return optimized_data
                
            except json.JSONDecodeError as e:
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"[{timestamp}] [Job {jid}] Error: Invalid JSON output: {e}")
                # Save the raw text for debugging
                with open(os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", f"{jid}_error.txt"), "w", encoding="utf-8") as w:
                    w.write(text)
                raise ValueError(f"JSON parsing failed for job {jid}: {e}")

            except Exception as e:
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"[{timestamp}] [Job {jid}] Error processing: {e}")
                raise RuntimeError(f"Job processing failed for job {jid}: {e}")

        except FileNotFoundError as e:
            # File-related errors - don't retry
            raise e
        except ValueError as e:
            # Data/content errors - don't retry
            raise e
        except TimeoutError as e:
            # Timeout errors - can retry
            raise e
        except Exception as e:
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] [Job {jid}] Unexpected error: {e}")
            raise RuntimeError(f"Unexpected error processing job {jid}: {e}")

    def run(self) -> str:
        """
        Process all job IDs in parallel and generate a single JSON output file.
        """
        overall_start_time = time.time()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] Starting job processing")
        
        if not self.job_ids:
            print(f"[{timestamp}] No job IDs to process.")
            return
            
        if not os.path.isdir(self.folder):
            print(f"[{timestamp}] Error: Job document folder '{self.folder}' not found.")
            return
            
        os.makedirs("output", exist_ok=True)
        processed_count = 0
        
        # Create a single JSON object to hold all job data
        all_jobs_data = {
            "run_date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "ai_agent": self.ai_agent,
            "ai_model": self.model,
            "jobs": []
            }
        # Load MTB CSV BEFORE starting parallel processing
        try:
            csv_start_time = time.time()
            print(f"[{timestamp}] Loading MTB CSV from {self.csv}...")
            # Use header=0 to indicate that the first row contains the column names
            try:
                self.mtb_df = pd.read_csv(self.csv, dtype=str, header=0, on_bad_lines='skip')
            except TypeError:
                # Fallback for older pandas versions that don't support on_bad_lines
                self.mtb_df = pd.read_csv(self.csv, dtype=str, header=0)
            csv_duration = time.time() - csv_start_time
            print(f"[{timestamp}] Successfully loaded MTB CSV in {csv_duration:.2f} seconds")
            print(f"[{timestamp}] MTB columns: {self.mtb_df.columns.tolist()}")
            print(f"[{timestamp}] MTB shape: {self.mtb_df.shape}")
            
            # Validate that the MTB CSV has data
            if self.mtb_df.empty:
                print(f"[{timestamp}] ERROR: MTB CSV file is empty. Cannot proceed without MTB data.")
                print(f"[{timestamp}] Process terminated.")
                sys.exit(1)
                
        except FileNotFoundError:
            print(f"[{timestamp}] ERROR: MTB CSV file not found at {self.csv}.")
            print(f"[{timestamp}] Process terminated.")
            sys.exit(1)
        except Exception as e:
            print(f"[{timestamp}] ERROR: Failed to load MTB CSV: {e}")
            print(f"[{timestamp}] Process terminated.")
            sys.exit(1)
        
        # Track errors for reporting
        error_reports = {}
        
        # Process jobs in parallel
        print(f"[{timestamp}] Starting parallel processing of {len(self.job_ids)} job IDs...")
        
        # Determine the number of workers based on CPU cores or configuration (with a reasonable limit)
        max_workers_default = min(os.cpu_count() or 4, 8)
        max_workers = getattr(config, 'MAX_WORKERS', max_workers_default)  # Allow configuration override
        max_workers = min(max_workers, 12)  # Upper limit to prevent overloading
        print(f"[{timestamp}] Using {max_workers} parallel workers (based on {'config' if hasattr(config, 'MAX_WORKERS') else 'CPU count'})")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all jobs to the executor
            future_to_jid = {executor.submit(self._process_job, jid): jid for jid in self.job_ids}
            
            # Process results as they complete
            for future in as_completed(future_to_jid):
                jid = future_to_jid[future]
                try:
                    job_data = future.result()
                    if job_data:
                        # Append this job's data to the jobs list
                        all_jobs_data["jobs"].append(job_data)
                        processed_count += 1
                    else:
                        # If no data returned, check for error file or log generic error
                        error_file = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", f"{jid}_error.txt")
                        error_msg = "Unknown error during processing"
                        if os.path.exists(error_file):
                            try:
                                with open(error_file, "r", encoding="utf-8") as ef:
                                    error_content = ef.read()
                                    error_msg = error_content.split("\n\nRaw Response:")[0] if "\n\nRaw Response:" in error_content else error_content
                            except Exception as read_err:
                                error_msg = f"Error reading error file: {read_err}"
                        error_reports[jid] = error_msg
                except Exception as e:
                    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                    error_msg = f"Processing exception: {str(e)}"
                    print(f"[{timestamp}] Error in future for job ID {jid}: {e}")
                    error_reports[jid] = error_msg
        
        # Save all jobs data to a single JSON file
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")

        # Generate a filename with the current date
        current_date = datetime.datetime.now().strftime("%Y%m%d")
        combined_filename = f"jobs_{current_date}_optimized.json"
        combined_path = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", combined_filename)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(combined_path), exist_ok=True)

        if processed_count > 0:
            print(f"[{timestamp}] Saving combined and optimized data for {processed_count} jobs to {combined_path}...")
            save_start_time = time.time()

            # Save the combined JSON file
            with open(combined_path, "w", encoding="utf-8") as w:
                json.dump(all_jobs_data, w, indent=2)
            save_duration = time.time() - save_start_time
            print(f"[{timestamp}] Saved combined data in {save_duration:.2f} seconds")

            # Generate an error report for job IDs that failed to process
            if error_reports:
                error_report_filename = f"error_report_{current_date}.txt"
                error_report_path = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", error_report_filename)
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"[{timestamp}] Generating error report for {len(error_reports)} failed jobs to {error_report_path}...")

                with open(error_report_path, "w", encoding="utf-8") as er:
                    er.write(f"Error Report for Job Processing on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    er.write(f"Total Jobs Attempted: {len(self.job_ids)}\n")
                    er.write(f"Jobs Successfully Processed: {processed_count}\n")
                    er.write(f"Jobs with Errors: {len(error_reports)}\n")
                    er.write(f"Success Rate: {(processed_count / len(self.job_ids) * 100):.1f}%\n")
                    er.write("\nDetailed Errors by Job ID:\n")
                    er.write("=" * 50 + "\n")
                    for jid, error_msg in sorted(error_reports.items()):
                        er.write(f"Job ID: {jid}\n")
                        er.write(f"Error: {error_msg}\n")
                        er.write("-" * 50 + "\n")

                print(f"[{timestamp}] Error report generated successfully.")

        elif processed_count == 0:
            print(f"[{timestamp}] ERROR: No jobs were processed successfully!")
            print(f"[{timestamp}] Check the error reports for details on what went wrong.")

            # Create a minimal error report even if no jobs succeeded
            error_report_filename = f"error_report_{current_date}.txt"
            error_report_path = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", error_report_filename)
            with open(error_report_path, "w", encoding="utf-8") as er:
                er.write(f"CRITICAL ERROR: Job Processing on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                er.write(f"Total Jobs Attempted: {len(self.job_ids)}\n")
                er.write(f"Jobs Successfully Processed: 0\n")
                er.write(f"Jobs with Errors: {len(error_reports)}\n")
                er.write("\nAll jobs failed. Check individual error logs for details.\n")

        overall_duration = time.time() - overall_start_time
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")

        success_rate = (processed_count / len(self.job_ids) * 100) if self.job_ids else 0
        print(f"[{timestamp}] Processing complete: {processed_count}/{len(self.job_ids)} jobs successful ({success_rate:.1f}%) in {overall_duration:.2f} seconds")

        # Save cache and print statistics
        self._save_cache()
        self._print_cache_statistics()

        # Return the path to the combined JSON file for further processing
        # Return it even if some jobs failed, as long as at least one succeeded
        if processed_count > 0:
            return combined_path
        else:
            return None
