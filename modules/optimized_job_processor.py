import os
import sys
import json
import hashlib
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
from pathlib import Path

class OptimizedJobProcessor:
    """
    Optimized JobProcessor with caching, multithreading, and token tracking
    Produces the exact same output structure as the original JobProcessor
    """
    
    def __init__(self, job_ids_to_process: List[str], folder_path: str = None, csv_path: str = None, 
                 ai_agent: str = "grok", cache_dir: str = None):
        self.job_ids = job_ids_to_process
        self.folder_path = folder_path or "/app/data/jobs"
        self.csv_path = csv_path or "/app/data/MTB/MasterTrackingBoard.csv"
        self.ai_agent = ai_agent.lower()
        
        # Set up cache directory
        self.cache_dir = cache_dir or "/app/data/cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Token tracking
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
        self.cache_file = os.path.join(self.cache_dir, f"job_cache_{self.ai_agent}.json")
        self.cache = self._load_cache()
        
        # Load MTB data
        self.mtb_df = None
        self._load_mtb_data()
        
    def _load_mtb_data(self):
        """Load MTB CSV data"""
        try:
            if os.path.exists(self.csv_path):
                self.mtb_df = pd.read_csv(self.csv_path, dtype=str, header=0, on_bad_lines='skip')
                print(f"Loaded MTB CSV with {len(self.mtb_df)} rows")
            else:
                print(f"MTB CSV not found at {self.csv_path}")
        except Exception as e:
            print(f"Error loading MTB CSV: {e}")
        
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
    
    def _load_template(self) -> Optional[Dict]:
        """Load the template JSON structure"""
        template_path = "/app/data/json_output/jobs_20250902_optimized.json"
        if os.path.exists(template_path):
            try:
                with open(template_path, 'r', encoding='utf-8') as f:
                    template_data = json.load(f)
                    if isinstance(template_data, list) and len(template_data) > 0:
                        return template_data[0]  # Return the first job as template
                    return template_data
            except Exception as e:
                print(f"Error loading template: {e}")
        return None
    
    def _get_template_structure(self) -> Dict:
        """Get the template structure for job processing"""
        template = self._load_template()
        if template:
            # Return the template structure without the specific job data
            template_structure = {}
            for key, value in template.items():
                if key in ['JobID', 'Company', 'Position', 'Industry/Segment', 'City', 'State', 'Country', 'Salary', 'Received (m/d/y)', 'Conditional Fee', 'Internal', 'Client Rating', 'CAT', 'Visa', 'HR/HM', 'CM', 'Pipeline #', 'HR Special Notes', 'source_file']:
                    template_structure[key] = ""  # MTB fields - will be filled from CSV
                else:
                    # AI-generated fields - preserve structure
                    if isinstance(value, dict):
                        template_structure[key] = {k: "" if isinstance(v, str) else [] if isinstance(v, list) else v for k, v in value.items()}
                    elif isinstance(value, list):
                        template_structure[key] = []
                    else:
                        template_structure[key] = ""
            return template_structure
        return {}
    
    def _get_file_hash(self, file_path: str) -> str:
        """Generate hash for file content"""
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
                      result: Dict, token_count: int):
        """Save result to cache"""
        cache_key = self._get_cache_key(job_id, job_file, notes_file)
        self.cache[cache_key] = {
            "data": result,
            "token_count": token_count,
            "cached_at": datetime.now().isoformat(),
            "ai_agent": self.ai_agent
        }
    
    def _extract_text_from_files(self, job_id: str) -> Tuple[str, str, str, str]:
        """Extract text from job description and notes files"""
        job_text = ""
        notes_text = ""
        job_file = ""
        notes_file = ""
        
        # Find job description file
        for file in os.listdir(self.folder_path):
            if file.startswith(job_id) and not "notes" in file.lower():
                job_file = os.path.join(self.folder_path, file)
                try:
                    if file.endswith('.docx'):
                        from .text_combiner import extract_text_from_docx
                        job_text = extract_text_from_docx(job_file)
                    elif file.endswith('.pdf'):
                        from .text_combiner import extract_text_from_pdf
                        job_text = extract_text_from_pdf(job_file)
                    elif file.endswith('.txt'):
                        with open(job_file, 'r', encoding='utf-8') as f:
                            job_text = f.read()
                except Exception as e:
                    print(f"Error extracting text from {file}: {e}")
        
        # Find notes file
        for file in os.listdir(self.folder_path):
            if file.startswith(job_id) and "notes" in file.lower():
                notes_file = os.path.join(self.folder_path, file)
                try:
                    if file.endswith('.docx'):
                        from .text_combiner import extract_text_from_docx
                        notes_text = extract_text_from_docx(notes_file)
                    elif file.endswith('.pdf'):
                        from .text_combiner import extract_text_from_pdf
                        notes_text = extract_text_from_pdf(notes_file)
                    elif file.endswith('.txt'):
                        with open(notes_file, 'r', encoding='utf-8') as f:
                            notes_text = f.read()
                except Exception as e:
                    print(f"Error extracting text from notes {file}: {e}")
        
        return job_text, notes_text, job_file, notes_file
    
    def _call_ai_api(self, combined_text: str) -> Dict[str, Any]:
        """Call AI API using the original processor's method"""
        try:
            # Import the original processor
            from .job_processor_Original import JobProcessor
            
            # Create a temporary processor instance
            temp_processor = JobProcessor([], self.folder_path, self.csv_path, self.ai_agent)
            
            # Use the original processor's AI calling logic
            # The original processor has the AI logic in _process_job_single_attempt
            # We'll extract just the AI calling part
            prompt = f"""Extract a single, valid JSON object from the following text. Ensure all strings are properly escaped, all objects and arrays are correctly structured with necessary commas, and there are no trailing commas. The entire output must be only the JSON object itself, with no surrounding text or markdown:

{combined_text}"""
            
            # Use the same AI client setup as the original processor
            response = temp_processor.client.chat.completions.create(
                model=temp_processor.model,
                messages=[{"role": "user", "content": prompt}]
            )
            
            from .utils import clean_api_output
            text = clean_api_output(response.choices[0].message.content)
            
            # Parse JSON
            job_data = json.loads(text)
            return job_data
            
        except Exception as e:
            print(f"AI API call failed: {e}")
            return {"error": str(e)}
    
    def _get_mtb_row(self, job_id: str) -> Optional[Dict]:
        """Get MTB row for job ID"""
        if self.mtb_df is None:
            return None
        
        # Try to find exact match first
        exact_match = self.mtb_df[self.mtb_df['JobID'] == job_id]
        if not exact_match.empty:
            return exact_match.iloc[0].to_dict()
        
        # Try to find base job ID match (for decimal job IDs)
        base_job_id = job_id.split('.')[0]
        base_match = self.mtb_df[self.mtb_df['JobID'] == base_job_id]
        if not base_match.empty:
            return base_match.iloc[0].to_dict()
        
        return None
    
    def _process_single_job(self, job_id: str) -> Optional[Dict]:
        """Process a single job with caching - produces exact same structure as template"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] Processing job {job_id}")
        
        try:
            # Extract text from files
            job_text, notes_text, job_file, notes_file = self._extract_text_from_files(job_id)
            
            if not job_text:
                print(f"[{timestamp}] No job description found for {job_id}")
                return None
            
            # Check cache first
            cached_result = self._get_cached_result(job_id, job_file, notes_file)
            if cached_result:
                return cached_result
            
            # Get template structure
            template_structure = self._get_template_structure()
            if not template_structure:
                print(f"[{timestamp}] Warning: No template structure found, using basic structure")
                template_structure = {"JobID": "", "Company": "", "Position": "", "Industry/Segment": "", "City": "", "State": "", "Country": "", "Salary": "", "HR Special Notes": ""}
            
            # Combine texts for AI processing
            combined_text = f"Job Description:\n{job_text}\n\nHR Notes:\n{notes_text}"
            
            # Call AI with template-aware prompt
            print(f"[{timestamp}] Calling AI for job {job_id}")
            start_time = time.time()
            
            # Create AI prompt that includes the template structure
            ai_prompt = f"""Analyze the following job description and HR notes to extract structured information. Use the provided template structure to format your response.

Template Structure: {json.dumps(template_structure, indent=2)}

Job Information:
{combined_text}

Please extract and structure the information according to the template format. Focus on:
1. Required education details
2. Required experience (years, industry, function-specific)
3. Core technical skills (tools, systems, software, machinery)
4. Required soft skills
5. Certifications and licenses
6. Dealbreakers/disqualifiers
7. Key deliverables and responsibilities
8. Industry/plant environment details
9. Bonus criteria

IMPORTANT: Do NOT extract JobID from the content - this will be provided separately. Focus on extracting the other fields.

Return the data in the exact same JSON structure as the template."""

            ai_result = self._call_ai_api(ai_prompt)
            
            # Track tokens
            input_tokens = len(ai_prompt.split()) * 1.3
            output_tokens = len(str(ai_result).split()) * 1.3
            total_tokens = int(input_tokens + output_tokens)
            
            self.token_stats["ai_calls"] += 1
            self.token_stats["total_uploaded"] += int(input_tokens)
            self.token_stats["total_output"] += int(output_tokens)
            self.token_stats["processing_time"] += time.time() - start_time
            
            # Get MTB row
            mtb_row = self._get_mtb_row(job_id)
            
            # Start with template structure
            final_job_data = template_structure.copy()
            
            # Fill in MTB data first (highest priority)
            if mtb_row:
                for key, value in mtb_row.items():
                    if pd.notna(value) and str(value).strip():
                        # Handle NaN values for JSON compliance
                        if isinstance(value, float) and str(value) in ['nan', 'inf', '-inf']:
                            final_job_data[key] = None
                        else:
                            final_job_data[key] = str(value).strip()
            else:
                print(f"[{timestamp}] [Job {job_id}] No matching row found in MTB CSV")
            
            # Set JobID (always use file-based JobID)
            final_job_data['JobID'] = job_id
            
            # Merge AI results into template structure (only fill empty fields)
            if isinstance(ai_result, dict):
                for key, value in ai_result.items():
                    # Skip JobID - always use the file-based JobID, not AI-extracted one
                    if key == 'JobID':
                        continue
                    
                    # Only use AI value if MTB field is empty or missing
                    if key in template_structure and value:
                        # Check if MTB field is empty or missing
                        mtb_value = final_job_data.get(key, "")
                        is_empty = (not mtb_value or 
                                  str(mtb_value).strip() == "" or 
                                  str(mtb_value).lower() in ['nan', 'none', 'null', ''])
                        
                        if is_empty:
                            # Handle NaN values for JSON compliance
                            if isinstance(value, float) and str(value) in ['nan', 'inf', '-inf']:
                                final_job_data[key] = None
                            else:
                                final_job_data[key] = value
                                print(f"[{timestamp}] [Job {job_id}] Using AI value for '{key}': {value}")
                        else:
                            print(f"[{timestamp}] [Job {job_id}] Keeping MTB value for '{key}': {mtb_value}")
            
            # Add source file information
            final_job_data['source_file'] = self.csv_path
            
            # Add job description and HR notes
            final_job_data['job_description'] = job_text
            final_job_data['hr_notes'] = notes_text
            
            # Save to cache
            self._save_to_cache(job_id, job_file, notes_file, final_job_data, total_tokens)
            
            return final_job_data
            
        except Exception as e:
            print(f"[{timestamp}] Error processing job {job_id}: {e}")
            return None
    
    def run(self) -> str:
        """Run optimized job processing with caching and multithreading"""
        start_time = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] Starting optimized job processing")
        print(f"[{timestamp}] Processing {len(self.job_ids)} jobs with {self.ai_agent} AI agent")
        
        # Create output directory structure
        base_output_dir = "/app/data"
        json_output_dir = os.path.join(base_output_dir, "json_output")
        os.makedirs(json_output_dir, exist_ok=True)
        
        # Create the exact same structure as original processor
        all_jobs_data = {
            "run_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "ai_agent": self.ai_agent,
            "ai_model": getattr(self, 'model', 'unknown'),  # Will be set by original processor
            "jobs": []
        }
        
        # Process jobs in parallel with caching
        results = []
        max_workers = min(len(self.job_ids), 8)  # Limit concurrent AI calls
        
        print(f"[{timestamp}] Using {max_workers} parallel workers")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all jobs
            future_to_job = {executor.submit(self._process_single_job, job_id): job_id 
                           for job_id in self.job_ids}
            
            # Collect results
            for future in as_completed(future_to_job):
                job_id = future_to_job[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                        print(f"[{timestamp}] Completed job {job_id}")
                except Exception as e:
                    print(f"[{timestamp}] Error processing job {job_id}: {e}")
        
        # Add results to the jobs list (same structure as original)
        all_jobs_data["jobs"] = results
        
        # Save results in dedicated JSON folder with timestamp
        current_date = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(json_output_dir, f"jobs_{current_date}_optimized.json")
        
        # Clean data for JSON serialization
        def clean_for_json(obj):
            if isinstance(obj, dict):
                return {k: clean_for_json(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_for_json(item) for item in obj]
            elif isinstance(obj, float):
                if str(obj) in ['nan', 'inf', '-inf']:
                    return None
                return obj
            else:
                return obj
        
        cleaned_data = clean_for_json(all_jobs_data)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, indent=2)
        
        # Save cache
        self._save_cache()
        
        # Print comprehensive report
        self._print_processing_report()
        
        return output_file
    
    def _print_processing_report(self):
        """Print comprehensive processing report"""
        print("\n" + "="*80)
        print("📊 OPTIMIZED JOB PROCESSING REPORT")
        print("="*80)
        
        stats = self.token_stats
        
        print(f"🤖 AI Agent: {self.ai_agent.upper()}")
        print(f"📁 Total Jobs Processed: {stats['ai_calls'] + stats['cache_hits']}")
        print(f"🆕 New AI Calls: {stats['ai_calls']}")
        print(f"💾 Cache Hits: {stats['cache_hits']}")
        print(f"❌ Cache Misses: {stats['cache_misses']}")
        
        print(f"\n💰 TOKEN STATISTICS:")
        print(f"📤 Tokens Uploaded to AI: {stats['total_uploaded']:,}")
        print(f"💾 Tokens from Cache: {stats['total_cached']:,}")
        print(f"📥 Tokens Generated: {stats['total_output']:,}")
        print(f"⏱️  Total Processing Time: {stats['processing_time']:.2f} seconds")
        
        if stats['ai_calls'] > 0:
            avg_time_per_job = stats['processing_time'] / stats['ai_calls']
            print(f"⚡ Average Time per AI Call: {avg_time_per_job:.2f} seconds")
        
        cache_hit_rate = (stats['cache_hits'] / (stats['cache_hits'] + stats['cache_misses'])) * 100
        print(f"🎯 Cache Hit Rate: {cache_hit_rate:.1f}%")
        
        print("="*80)
        print(f"💡 Optimization saved {stats['cache_hits']} AI calls and {stats['total_cached']:,} tokens!")
        print("="*80)