import os
import json
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
from .gdrive_operations import authenticate_drive, search_files, download_file_by_id
import re
import urllib.parse

class JobProcessor:
    DEFAULT_MTB_GDRIVE_URL = "https://drive.google.com/drive/u/1/folders/1h_tR64KptPn3UC1t4ytufyUYHOls71du"
    MTB_FILENAME = "MasterTrackingBoard.csv"
    MTB_GDRIVE_FOLDER_ID = "1h_tR64KptPn3UC1t4ytufyUYHOls71du"

    def __init__(self, job_ids_to_process: List[str], folder_path: str, csv_path: str = DEFAULT_MTB_GDRIVE_URL):
        """
        Initialize the JobProcessor.
        
        Args:
            job_ids_to_process: List of job IDs to process
            folder_path: Path to the folder containing job documents
            csv_path: Path to the CSV file with job data, or GDrive URL to folder containing MasterTrackingBoard.csv
        """
        self.job_ids = job_ids_to_process
        self.folder = folder_path
        
        # Handle CSV path (download if GDrive URL)
        self.csv = self._resolve_csv_path(csv_path)
        
        # Use config values for API configuration
        api_key = config.XAI_API_KEY
        if not api_key:
            api_key = os.getenv("XAI_API_KEY", "")
            
        # Initialize the OpenAI client
        self.client = OpenAI(api_key=api_key, base_url=config.XAI_BASE_URL)
        self.model = config.XAI_MODEL

    def _resolve_csv_path(self, csv_path_or_url: str) -> str:
        """
        Resolves the CSV path. If it's the default GDrive folder URL for MTB, downloads the file.
        Returns the local path to the CSV, or the original path/URL if download fails or it's not the default.
        """
        parsed_url = urllib.parse.urlparse(csv_path_or_url)
        # Check if it's the specific GDrive URL we want to auto-download from
        if parsed_url.scheme in ['http', 'https'] and \
           'drive.google.com' in parsed_url.netloc and \
           self.MTB_GDRIVE_FOLDER_ID in csv_path_or_url:
            
            print(f"MTB CSV path is the default Google Drive URL: {csv_path_or_url}. Attempting to download {self.MTB_FILENAME}...")
            try:
                drive = authenticate_drive()
                if not drive:
                    print("Failed to authenticate with Google Drive for MTB CSV download.")
                    return csv_path_or_url # Return original URL

                # Use 'title contains' for a more robust search, similar to main.py
                query = f"'{self.MTB_GDRIVE_FOLDER_ID}' in parents and title contains '{self.MTB_FILENAME}' and trashed=false"
                file_list = search_files(drive, query)

                if file_list:
                    file_id = file_list[0]['id']
                    download_dir = "downloads"
                    os.makedirs(download_dir, exist_ok=True)
                    local_csv_path = os.path.join(download_dir, self.MTB_FILENAME)
                    
                    print(f"Found {self.MTB_FILENAME} on Google Drive (ID: {file_id}). Downloading to {local_csv_path}...")
                    if download_file_by_id(drive, file_id, local_csv_path):
                        print(f"Successfully downloaded {self.MTB_FILENAME} to {local_csv_path}.")
                        return local_csv_path
                    else:
                        print(f"Failed to download {self.MTB_FILENAME} from Google Drive.")
                        return csv_path_or_url # Return original URL
                else:
                    print(f"{self.MTB_FILENAME} not found in Google Drive folder ID {self.MTB_GDRIVE_FOLDER_ID}.")
                    return csv_path_or_url # Return original URL
            except Exception as e:
                print(f"Error processing Google Drive URL for MTB CSV: {e}")
                return csv_path_or_url # Return original URL
        else:
            # Assume it's a local file path or a GDrive URL we don't auto-process
            print(f"Using provided CSV path: {csv_path_or_url}")
            return csv_path_or_url

    def upload_to_gdrive(self, local_path: str, filename: str) -> bool:
        """
        Upload a file to Google Drive.
        
        Args:
            local_path: Local path of the file to upload
            filename: Name to use for the file in Google Drive
            
        Returns:
            bool: True if upload was successful, False otherwise
        """
        try:
            drive = authenticate_drive()
            if not drive:
                print("Failed to authenticate with Google Drive for file upload")
                return False
                
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
            print(f"Error uploading {filename} to Google Drive: {e}")
            return False

    def _extract_field(self, data: Dict, possible_keys: List[str]) -> str:
        """Extract field value trying multiple possible key names."""
        for key in possible_keys:
            if key in data and data[key]:
                return str(data[key]).strip()
        return ""

    def _extract_salary_range(self, salary_str: str, type_: str) -> int:
        """Extract min/max salary from various formats like '65-110K DOE', '$36.05/hr', etc."""
        if not salary_str:
            return 0
            
        salary_str = salary_str.upper().replace("$", "").replace(",", "")
        
        # Handle hourly rates
        if "/HR" in salary_str:
            try:
                hourly = float(re.findall(r'(\d+\.?\d*)', salary_str.split("/")[0])[0])
                annual = int(hourly * 2080)  # 40 hours * 52 weeks
                return annual
            except:
                return 0
        
        # Handle ranges like "65-110K"
        if "-" in salary_str and "K" in salary_str:
            parts = salary_str.replace("K", "").split("-")
            try:
                min_sal = int(float(parts[0].strip()) * 1000)
                max_sal = int(float(parts[1].strip().split()[0]) * 1000)
                return min_sal if type_ == "min" else max_sal
            except:
                return 0
        
        # Handle single values like "120K"
        if "K" in salary_str:
            try:
                value = int(float(salary_str.replace("K", "").strip().split()[0]) * 1000)
                return value
            except:
                return 0
        
        return 0

    def _determine_salary_type(self, salary_str: str) -> str:
        """Determine if salary is hourly, annual, or other."""
        if not salary_str:
            return "unknown"
        if "/hr" in salary_str.lower():
            return "hourly"
        elif "k" in salary_str.lower() or any(x in salary_str.lower() for x in ["annual", "year"]):
            return "annual"
        else:
            return "other"

    def _standardize_job_data(self, raw_job_data: Dict[str, Any], jid: str) -> Dict[str, Any]:
        """
        Enhanced standardization for detailed job postings with HR notes.
        """
        mtb_data = raw_job_data.get("mtb_data", {})
        
        standardized = {
            # Core identifiers
            "jobId": jid,
            "timestamp_processed": datetime.datetime.now().isoformat(),
            
            # Basic job information
            "title": self._extract_field(raw_job_data, ["title", "job_title", "position"]) or mtb_data.get("Position", ""),
            "company": self._extract_field(raw_job_data, ["company", "company_name", "employer"]) or mtb_data.get("Company", ""),
            "industry": mtb_data.get("Industry/Segment", ""),
            
            # Location details
            "location": {
                "city": mtb_data.get("City", ""),
                "state": mtb_data.get("State", ""),
                "country": mtb_data.get("Country", ""),
                "full_location": f"{mtb_data.get('City', '')}, {mtb_data.get('State', '')}, {mtb_data.get('Country', '')}".strip(", ")
            },
            
            # Compensation details
            "compensation": {
                "salary": mtb_data.get("Salary", ""),
                "bonus": mtb_data.get("Bonus", ""),
                "salary_min": self._extract_salary_range(mtb_data.get("Salary", ""), "min"),
                "salary_max": self._extract_salary_range(mtb_data.get("Salary", ""), "max"),
                "salary_type": self._determine_salary_type(mtb_data.get("Salary", ""))
            },
            
            # Recruiting metadata from CSV
            "recruiting_metadata": {
                "received_date": mtb_data.get("Received (m/d/y)", ""),
                "hr_contact": mtb_data.get("HR/HM", ""),
                "recruiter": mtb_data.get("CM", ""),
                "conditional_fee": mtb_data.get("Conditional Fee", ""),
                "internal_status": mtb_data.get("Internal", ""),
                "category_details": mtb_data.get("CAT", ""),
                "pipeline_number": mtb_data.get("Pipeline #", ""),
                "pipeline_candidates_list": mtb_data.get("Pipeline Candidates", ""),
                "recruiter_notes": mtb_data.get("Notes", ""),
                "client_rating": mtb_data.get("Client Rating", ""),
                "visa_status": mtb_data.get("Visa", "")
            },
            
            # Raw data preservation
            "source_data": {
                "raw_extracted_data": raw_job_data,
                "mtb_source_data": mtb_data
            }
        }
        
        return standardized

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
        
        try:
            docs = [f for f in os.listdir(self.folder) if jid in f]
            
            if not docs:
                print(f"[{timestamp}] [Job {jid}] No documents found")
                return None
                
            combined = ""
            for doc in docs:
                path = os.path.join(self.folder, doc)
                try:
                    # Check if the file exists locally
                    if not os.path.exists(path):
                        print(f"[{timestamp}] [Job {jid}] Warning: File {path} does not exist locally. Skipping.")
                        continue
                        
                    file_lower = doc.lower()
                    if file_lower.endswith(".pdf"):
                        combined += extract_text_from_pdf(path) + "\n\n"
                    elif file_lower.endswith(".docx") or file_lower.endswith(".doc"):
                        combined += extract_text_from_docx(path) + "\n\n"
                    elif file_lower.endswith(".txt"):
                        combined += extract_text_from_txt(path) + "\n\n"
                    else:
                        # For other file types, try to read as text with fallback encodings
                        try:
                            with open(path, "r", encoding="utf-8") as rd:
                                combined += rd.read() + "\n\n"
                        except UnicodeDecodeError:
                            # Try with a different encoding if utf-8 fails
                            with open(path, "r", encoding="latin-1") as rd:
                                combined += rd.read() + "\n\n"
                except Exception as e:
                    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                    print(f"[{timestamp}] [Job {jid}] Error reading file {path}: {e}")
            
            if not combined.strip():
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"[{timestamp}] [Job {jid}] No content found in documents")
                return None
            
            prompt = f"Extract a single, valid JSON object for job {jid} from the following text. Ensure all strings are properly escaped, all objects and arrays are correctly structured with necessary commas, and there are no trailing commas. The entire output must be only the JSON object itself, with no surrounding text or markdown:\n{combined}"
            
            try:
                # Use the new OpenAI client API with retry logic
                max_retries = 3
                retry_count = 0
                success = False
                
                while retry_count < max_retries and not success:
                    try:
                        api_start_time = time.time()
                        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] [Job {jid}] Sending request to AI model (attempt {retry_count + 1}/{max_retries})...")
                        
                        response = self.client.chat.completions.create(
                            model=self.model,
                            messages=[{"role": "user", "content": prompt}]
                        )
                        
                        api_duration = time.time() - api_start_time
                        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] [Job {jid}] AI model response received in {api_duration:.2f} seconds")
                        
                        text = clean_api_output(response.choices[0].message.content)
                        
                        # Check if the response is empty
                        if not text.strip():
                            raise ValueError("Empty response from AI model")
                        
                        # Try to parse the JSON
                        job_data = json.loads(text)
                        success = True
                        
                    except (json.JSONDecodeError, ValueError) as e:
                        retry_count += 1
                        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                        if retry_count < max_retries:
                            print(f"[{timestamp}] [Job {jid}] Error parsing AI response: {e}. Retrying ({retry_count}/{max_retries})...")
                            time.sleep(2)  # Wait before retrying
                        else:
                            print(f"[{timestamp}] [Job {jid}] Failed to get valid JSON after {max_retries} attempts: {e}")
                            return None
                
                # If we got here, we have valid JSON data

                # Remove jobId prefixes from all fields and standardize structure
                standardized_job_data = {}

                # If the AI output is a dict, flatten any jobId-prefixed keys
                for key, value in job_data.items():
                    # Remove jid prefix if present
                    if key.startswith(f"{jid}_"):
                        std_key = key[len(f"{jid}_") :]
                    else:
                        std_key = key
                    standardized_job_data[std_key] = value

                # Merge data from MTB CSV if loaded
                if self.mtb_df is not None:
                    try:
                        job_id_col = 'JobID' if 'JobID' in self.mtb_df.columns else self.mtb_df.columns[0]
                        mtb_row = self.mtb_df[self.mtb_df[job_id_col] == jid]
                        if not mtb_row.empty:
                            mtb_data = {}
                            for col in self.mtb_df.columns:
                                try:
                                    value = mtb_row[col].iloc[0]
                                    mtb_data[col] = None if pd.isna(value) or value == '' else value
                                except Exception as e:
                                    print(f"[{timestamp}] Error extracting column {col}: {e}")
                                    mtb_data[col] = None
                            standardized_job_data["mtb_data"] = mtb_data
                            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                            print(f"[{timestamp}] [Job {jid}] Merged MTB data")
                        else:
                            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                            print(f"[{timestamp}] [Job {jid}] No matching row found in MTB CSV")
                    except Exception as e:
                        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] [Job {jid}] Error merging MTB data: {e}")

                # Add jobId field if not present
                if "jobId" not in standardized_job_data:
                    standardized_job_data["jobId"] = jid

                # Apply enhanced standardization
                final_job_data = self._standardize_job_data(standardized_job_data, jid)

                duration = time.time() - start_time
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"[{timestamp}] [Job {jid}] Successfully processed in {duration:.2f} seconds")
                return final_job_data
                    
            except Exception as e:
                timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"[{timestamp}] [Job {jid}] Error processing: {e}")
                return None
                
        except Exception as e:
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] [Job {jid}] Unexpected error: {e}")
            return None

    def run(self) -> None:
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
        
        # Create enhanced JSON structure for resume matching
        all_jobs_data = {
            "metadata": {
                "run_date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_jobs": 0,
                "processing_info": {
                    "source_folder": self.folder,
                    "mtb_csv": self.csv,
                    "model_used": self.model
                }
            },
            "jobs": {}
        }

        # Load MTB CSV with FIXED header handling
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        self.mtb_df = None
        
        # Check if self.csv is a GDrive URL
        is_gdrive_url = False
        if self.csv:
            parsed_csv_path = urllib.parse.urlparse(self.csv)
            if parsed_csv_path.scheme in ['http', 'https'] and 'drive.google.com' in parsed_csv_path.netloc:
                is_gdrive_url = True

        if not self.csv:
            print(f"[{timestamp}] Critical: MTB CSV path is not set. Proceeding without MTB data.")
        elif is_gdrive_url:
            print(f"[{timestamp}] MTB CSV path is a Google Drive URL ({self.csv}). This may indicate a download failure or a non-default URL. Proceeding without MTB data.")
        elif not os.path.exists(self.csv):
            print(f"[{timestamp}] Warning: Local MTB CSV file not found at {self.csv}. Proceeding without MTB data.")
        else:
            try:
                csv_start_time = time.time()
                print(f"[{timestamp}] Loading MTB CSV from {self.csv}...")
                
                # FIXED: Read CSV with proper header handling
                # First, read the CSV to check if it has headers
                temp_df = pd.read_csv(self.csv, nrows=1, dtype=str)
                first_row_values = temp_df.iloc[0].tolist()
                
                # Check if first row looks like headers or data
                has_headers = any(val and not str(val).isdigit() and 'JobID' in str(val) for val in first_row_values)
                
                if has_headers:
                    # CSV has headers, read normally
                    print(f"[{timestamp}] CSV appears to have headers, reading with header=0")
                    try:
                self.mtb_df = pd.read_csv(self.csv, dtype=str, header=0, on_bad_lines='skip')
except TypeError:
    # Fallback for older pandas versions that don't support on_bad_lines
                self.mtb_df = pd.read_csv(self.csv, dtype=str, header=0)
                else:
                    # CSV doesn't have headers, use our predefined column names
                    print(f"[{timestamp}] CSV appears to have no headers, using predefined column names")
                    column_names = [
                        "JobID", "Company", "Position", "Industry/Segment", "City", "State", "Country", 
                        "Salary", "Bonus", "Received (m/d/y)", "Conditional Fee", "Internal", 
                        "Client Rating", "CAT", "Visa", "HR/HM", "CM", "Pipeline #", 
                        "Pipeline Candidates", "Notes"
                    ]
                    try:
                self.mtb_df = pd.read_csv(self.csv, dtype=str, header=None, names=column_names, on_bad_lines='skip')
except TypeError:
    # Fallback for older pandas versions that don't support on_bad_lines
                self.mtb_df = pd.read_csv(self.csv, dtype=str, header=None, names=column_names)
                
                csv_duration = time.time() - csv_start_time
                print(f"[{timestamp}] Successfully loaded MTB CSV in {csv_duration:.2f} seconds")
                if self.mtb_df is not None:
                    print(f"[{timestamp}] MTB columns: {self.mtb_df.columns.tolist()}")
                    print(f"[{timestamp}] MTB shape: {self.mtb_df.shape}")
                    
            except Exception as e:
                print(f"[{timestamp}] Error loading MTB CSV from {self.csv}: {e}. Proceeding without CSV data.")
        
        # Process jobs in parallel
        print(f"[{timestamp}] Starting parallel processing of {len(self.job_ids)} job IDs...")
        
        # Determine the number of workers based on CPU cores (but limit to a reasonable number)
        max_workers = min(os.cpu_count() or 4, 8)  # Use at most 8 workers
        print(f"[{timestamp}] Using {max_workers} parallel workers")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all jobs to the executor
            future_to_jid = {executor.submit(self._process_job, jid): jid for jid in self.job_ids}
            
            # Process results as they complete
            for future in as_completed(future_to_jid):
                jid = future_to_jid[future]
                try:
                    job_data = future.result()
                    if job_data:
                        # Add to jobs object with jobId as key
                        all_jobs_data["jobs"][jid] = job_data
                        processed_count += 1
                except Exception as e:
                    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
                    print(f"[{timestamp}] Error in future for job ID {jid}: {e}")
        
        # Update metadata
        all_jobs_data["metadata"]["total_jobs"] = processed_count
        
        # Save all jobs data to a single JSON file
        if processed_count > 0:
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            
            # Generate a filename with the current date
            current_date = datetime.datetime.now().strftime("%Y%m%d")
            combined_filename = f"jobs_{current_date}_fixed.json"
            combined_path = os.path.join(os.getenv("DATA_DIR", "/app/data"), "output", combined_filename)
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(combined_path), exist_ok=True)
            
            print(f"[{timestamp}] Saving combined data for {processed_count} jobs to {combined_path}...")
            save_start_time = time.time()
            
            # Save the combined JSON file
            with open(combined_path, "w", encoding="utf-8") as w:
                json.dump(all_jobs_data, w, indent=2)
            save_duration = time.time() - save_start_time
            print(f"[{timestamp}] Saved combined data in {save_duration:.2f} seconds")
            
            # Upload the combined JSON file to Google Drive
            upload_start_time = time.time()
            print(f"[{timestamp}] Uploading combined data to Google Drive...")
            self.upload_to_gdrive(combined_path, combined_filename)
            upload_duration = time.time() - upload_start_time
            print(f"[{timestamp}] Upload completed in {upload_duration:.2f} seconds")
        
        overall_duration = time.time() - overall_start_time
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] Processed {processed_count}/{len(self.job_ids)} jobs successfully in {overall_duration:.2f} seconds")
