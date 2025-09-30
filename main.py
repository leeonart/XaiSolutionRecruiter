import os
import sys
import re
import tempfile
import time
import json
import importlib.util
from datetime import datetime
import argparse

from modules.file_operations import copy_files_with_numbers
from modules.gdrive_operations import authenticate_drive, extract_folder_id, download_folder, download_files_directly, find_job_folders, search_files, download_file_by_id, parallel_download_and_report
from modules.job_processor_Original import JobProcessor
from modules.text_combiner import combine_texts
from modules.mtb_processor import master_tracking_board_activities
from modules.final_optimizer import FinalOptimizer
import config  # Import config to access AI agent settings

# Global variable to store the selected AI agent
def load_saved_ai_agent():
    """Load the saved AI agent preference from file, or use default if not found."""
    try:
        if os.path.exists("ai_agent_preference.txt"):
            with open("ai_agent_preference.txt", "r") as f:
                saved_agent = f.read().strip().lower()
                if saved_agent in ["grok", "gemini", "deepseek", "openai", "qwen", "zai"]:
                    return saved_agent
    except Exception:
        pass
    return config.DEFAULT_AI_AGENT

def save_ai_agent_preference(agent):
    """Save the AI agent preference to file."""
    try:
        with open("ai_agent_preference.txt", "w") as f:
            f.write(agent.lower())
    except Exception as e:
        print(f"Warning: Could not save AI agent preference: {e}")

current_ai_agent = load_saved_ai_agent()

def cleanup_existing_files():
    """Clean up any existing job files to prevent duplicates."""
    print("[CLEANUP] Cleaning up existing job files...")

    # Clean up local output folder
    output_folder = "output"
    if os.path.exists(output_folder):
        for filename in os.listdir(output_folder):
            if filename.startswith("jobs_") and filename.endswith(".json"):
                try:
                    os.remove(os.path.join(output_folder, filename))
                    print(f"[CLEANUP] Removed local file: {filename}")
                except Exception as e:
                    print(f"[CLEANUP] Warning: Could not remove {filename}: {e}")

    # Clean up synced Google Drive folder
    n8n_folder = r"g:\My Drive\n8n"
    if os.path.exists(n8n_folder):
        for filename in os.listdir(n8n_folder):
            if filename.startswith("jobs_") and filename.endswith(".json"):
                try:
                    os.remove(os.path.join(n8n_folder, filename))
                    print(f"[CLEANUP] Removed synced file: {filename}")
                except Exception as e:
                    print(f"[CLEANUP] Warning: Could not remove {filename}: {e}")

    print("[CLEANUP] Cleanup completed.")

def print_menu():
    """
    Display the main menu options to the user.

    Prints a formatted list of available operations that the user can choose from.
    """
    global current_ai_agent
    print(f"Current AI Agent: {current_ai_agent.upper()}")
    print("""Choose an operation:
1) Prepare MTB (Google Sheets)
2) Copy Local Files by JobID
3) Copy from Google Drive by JobID
4) Process Job Descriptions (AI Agent)
5) Combine Texts (PDF/DOCX)
6) Run MTB > Copy > AI Agent > Combine
7) Full Pipeline (MTB > Drive Copy > AI Agent > Final Optimize)
8) Select AI Agent
9) Create Optimized & Complete JSON (AI + Field Corrections)
10) AI Resume-to-Job Matching
0) Exit
""")

def run_non_interactive(choice):
    if choice == '1':
        csv_path = "https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8"
        category = "ALL"
        state = "ALL"
        client_rating = "ALL"
        extract_ids = True
        try:
            job_ids = master_tracking_board_activities(csv_path, category, state, client_rating, extract_ids)
            if extract_ids and job_ids:
                print(f"Extracted job IDs: {', '.join(job_ids)}")
                # Save to organized data structure
                data_dir = os.getenv("DATA_DIR", "/app/data")
                mtb_dir = os.path.join(data_dir, "MTB")
                os.makedirs(mtb_dir, exist_ok=True)
                jobidlist_path = os.path.join(mtb_dir, "jobidlist.txt")
                with open(jobidlist_path, "w") as f:
                    f.write(','.join(job_ids))
                print(f"Job IDs saved to {jobidlist_path}")
        except KeyError as e:
            print(f"Error: The column '{str(e)}' does not exist in the CSV. Please check your CSV file.")
        except Exception as e:
            print(f"Error processing MTB: {e}")
    elif choice == '9':
        print("Non-interactive mode: Creating Optimized & Complete JSON")
        # Use defaults for non-interactive mode
        current_date = datetime.now().strftime("%Y%m%d")
        folder = f"E:\\JobDescription\\{current_date}"
        csv_path_input = "https://drive.google.com/drive/u/1/folders/1h_tR64KptPn3UC1t4ytufyUYHOls71du"

        # Try to read job IDs from organized data structure
        jids = []
        data_dir = os.getenv("DATA_DIR", "/app/data")
        mtb_dir = os.path.join(data_dir, "MTB")
        jobidlist_path = os.path.join(mtb_dir, "jobidlist.txt")
        
        if os.path.exists(jobidlist_path):
            try:
                with open(jobidlist_path, 'r') as f:
                    jids = [jid.strip() for jid in f.read().split(',') if jid.strip()]
                
                # Clean job IDs: remove .x suffixes and deduplicate
                from modules.job_id_cleaner import clean_job_ids
                original_count = len(jids)
                jids = clean_job_ids(jids)
                cleaned_count = len(jids)
                
                if original_count != cleaned_count:
                    print(f"Job ID cleaning: {original_count} -> {cleaned_count} (removed {original_count - cleaned_count} duplicates)")
                
                print(f"Read {len(jids)} job IDs from {jobidlist_path}")
            except Exception as e:
                print(f"Error reading {jobidlist_path}: {e}")
        elif os.path.exists("jobidlist.txt"):  # Fallback to old location
            try:
                with open("jobidlist.txt", 'r') as f:
                    jids = [jid.strip() for jid in f.read().split(',') if jid.strip()]
                
                # Clean job IDs: remove .x suffixes and deduplicate
                from modules.job_id_cleaner import clean_job_ids
                original_count = len(jids)
                jids = clean_job_ids(jids)
                cleaned_count = len(jids)
                
                if original_count != cleaned_count:
                    print(f"Job ID cleaning: {original_count} -> {cleaned_count} (removed {original_count - cleaned_count} duplicates)")
                
                print(f"Read {len(jids)} job IDs from jobidlist.txt (legacy location)")
            except Exception as e:
                print(f"Error reading jobidlist.txt: {e}")

        if not jids:
            print(f"No job IDs found in {jobidlist_path} or jobidlist.txt. Non-interactive mode requires job IDs to exist.")
            return

        # Process with defaults
        processed_csv_path = csv_path_input  # Use the Google Drive path directly

        if processed_csv_path:
            print(f"Using AI agent: {current_ai_agent.upper()}")
            proc = JobProcessor(jids, folder, processed_csv_path, ai_agent=current_ai_agent, api_key=None)
            ai_output_file = proc.run()
            print("[OK] AI processing completed")

            # Field corrections
            potential_json_paths = [
                f"{folder}/jobs_{current_date}_optimized.json",
                f"output/jobs_{current_date}_optimized.json"
            ]

            # Use the file path returned by JobProcessor
            input_json_file = ai_output_file
            if input_json_file and os.path.exists(input_json_file):
                print(f"Using AI output file: {input_json_file}")
            elif input_json_file:
                print(f"Warning: AI output file not found at {input_json_file}")
                input_json_file = None

            if input_json_file:
                try:
                    optimizer = FinalOptimizer(input_json_file)
                    final_file = optimizer.run_optimization()
                    print(f"[OK] Field corrections completed. Final file: {final_file}")

                    # Upload the optimized JSON to Google Drive
                    try:
                        drive = authenticate_drive()
                        if drive:
                            # Get the Google Drive folder ID from config
                            folder_id = config.GDRIVE_FOLDER_ID

                            # Create file metadata for the optimized JSON
                            json_filename = os.path.basename(final_file)
                            file_metadata = {
                                'title': json_filename,
                                'parents': [{'id': folder_id}]
                            }

                            # Create the file and upload
                            file = drive.CreateFile(file_metadata)
                            file.SetContentFile(final_file)
                            file.Upload()

                            # Show the Google Drive folder URL
                            drive_url = f"https://drive.google.com/drive/folders/{folder_id}"
                            print(f"Successfully uploaded {json_filename} to Google Drive")
                            print(f"Google Drive folder URL: {drive_url}")
                        else:
                            print("Failed to authenticate with Google Drive for JSON upload")
                    except Exception as e:
                        print(f"Error uploading optimized JSON to Google Drive: {e}")

                except Exception as e:
                    print(f"✗ Error during field corrections: {e}")
            else:
                print("✗ Could not find AI-processed JSON file")
        else:
            print("Error: No CSV path available")
    else:
        print(f"Non-interactive mode for choice {choice} is not implemented.")

def main():
    """
    Main application entry point.

    Handles the main program loop, user input processing, and execution of selected operations.
    Catches exceptions to prevent program crashes and provides user feedback.
    """
    parser = argparse.ArgumentParser(description="AI-powered job matching and processing tool.")
    parser.add_argument('--choice', type=str, help='The menu choice to run non-interactively.')
    args = parser.parse_args()

    if args.choice:
        run_non_interactive(args.choice)
        return

    global current_ai_agent
    while True:
        print_menu()
        try:
            choice = input("Enter choice: ").strip()
            if choice == '0':
                break
            elif choice == '1':
                # Set default MTB Google Drive folder link
                default_mtb_link = "https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8"
                print(f"MTB CSV path or Google Drive folder link (default: {default_mtb_link})")
                csv_path = input("MTB CSV path: ").strip()
                if not csv_path:
                    csv_path = default_mtb_link
                    print(f"Using default MTB Google Drive folder: {default_mtb_link}")
                # Industry filter removed as requested
                category = input("Category (comma-separated for multiple, or 'ALL'): ").strip()
                # Recruitment date removed as requested
                state = input("State (comma-separated for multiple, or 'ALL'): ").strip()
                client_rating = input("Client Rating (comma-separated for multiple, or 'ALL'): ").strip()
                extract_ids = input("Extract job IDs? (y/n): ").lower() == 'y'
                try:
                    job_ids = master_tracking_board_activities(csv_path, category, state, client_rating, extract_ids)
                    
                    # Create jobidlist.txt with comma-delimited list of job IDs
                    if extract_ids and job_ids:
                        print(f"Extracted job IDs: {', '.join(job_ids)}")
                    
                        # Save job IDs to jobidlist.txt in organized data structure
                        data_dir = os.getenv("DATA_DIR", "/app/data")
                        mtb_dir = os.path.join(data_dir, "MTB")
                        os.makedirs(mtb_dir, exist_ok=True)
                        jobidlist_path = os.path.join(mtb_dir, "jobidlist.txt")
                        with open(jobidlist_path, "w") as f:
                            f.write(','.join(job_ids))
                        print(f"Job IDs saved to {jobidlist_path}")
                        
                        # Google Drive upload disabled - files saved locally only
                        print("Files saved locally to /app/data/MTB/")
                except KeyError as e:
                    print(f"Error: The column '{str(e)}' does not exist in the CSV. Please check your CSV file.")
                except Exception as e:
                    print(f"Error processing MTB: {e}")
            elif choice == '2':
                src = input("Source dir: ").strip()
                while not src or not os.path.isdir(src):
                    print(f"Error: Source directory '{src}' does not exist or is invalid.")
                    src = input("Source dir: ").strip()
                dst = input("Dest dir: ").strip()
                while not dst:
                    print("Error: Destination directory cannot be empty.")
                    dst = input("Dest dir: ").strip()
                jids_input = input("Job IDs (comma sep): ").strip()
                jids = [jid.strip() for jid in jids_input.split(",") if jid.strip()]
                while not jids:
                    print("Error: At least one Job ID must be provided.")
                    jids_input = input("Job IDs (comma sep): ").strip()
                    jids = [jid.strip() for jid in jids_input.split(",") if jid.strip()]
                copy_files_with_numbers(src, dst, jids)
            elif choice == '3':
                # Set default drive folder link
                default_link = "https://drive.google.com/drive/u/1/folders/1KXb1YDWYEy_3WgRT-MVnlI22jq8t3EMv"
                print(f"Drive folder link (default: {default_link})")
                link = input("Drive folder link: ").strip()
                if not link:
                    link = default_link
                    print(f"Using default link: {default_link}")
                fid = extract_folder_id(link)
                drive = authenticate_drive()
                if drive and fid:
                    # Try to read job IDs from jobidlist.txt in Google Drive
                    try:
                        print("Attempting to read job IDs from jobidlist.txt in Google Drive...")
                        jobidlist_folder_id = "1h_tR64KptPn3UC1t4ytufyUYHOls71du"
                        search_query = f"title = 'jobidlist.txt' and '{jobidlist_folder_id}' in parents"
                        print(f"Search query: {search_query}")
                        from modules.gdrive_operations import search_files, download_file_by_id
                        import tempfile
                        search_results = search_files(drive, search_query)
                        
                        jids = []
                        if search_results:
                            # Download and read the jobidlist.txt file
                            file_id = search_results[0]['id']
                            temp_file = os.path.join(tempfile.gettempdir(), "jobidlist.txt")
                            download_file_by_id(drive, file_id, temp_file)
                            
                            # Read job IDs from the file
                            with open(temp_file, 'r') as f:
                                jids = [jid.strip() for jid in f.read().split(',') if jid.strip()]
                            
                            print(f"Successfully read {len(jids)} job IDs from jobidlist.txt")
                            
                            # Clean up temp file
                            os.remove(temp_file)
                            # Allow user to override with manual entry
                            manual_jids = input("Press ENTER to use these job IDs, or enter a comma-delimited list to override: ").strip()
                            if manual_jids:
                                jids = [jid.strip() for jid in manual_jids.split(",") if jid.strip()]
                        else:
                            print("jobidlist.txt not found in Google Drive. Checking for local file...")
                    except Exception as e:
                        print(f"Error reading jobidlist.txt from Google Drive: {e}")
                        print("Checking for local file...")
                    
                    # Fallback to local jobidlist.txt if Google Drive failed
                    if not jids and os.path.exists("jobidlist.txt"):
                        try:
                            print("Found local jobidlist.txt file. Reading job IDs...")
                            with open("jobidlist.txt", 'r') as f:
                                jids = [jid.strip() for jid in f.read().split(',') if jid.strip()]
                            print(f"Successfully read {len(jids)} job IDs from local jobidlist.txt")
                            # Allow user to override with manual entry
                            manual_jids = input("Press ENTER to use these job IDs, or enter a comma-delimited list to override: ").strip()
                            if manual_jids:
                                jids = [jid.strip() for jid in manual_jids.split(",") if jid.strip()]
                        except Exception as e:
                            print(f"Error reading local jobidlist.txt: {e}")
                    
                    if not jids:
                        print("No jobidlist.txt found in Google Drive or locally. Please enter job IDs manually.")
                    
                    # If no job IDs were read from the file, prompt the user
                    if not jids:
                        jids_input = input("Job IDs (comma sep): ").strip()
                        jids = [jid.strip() for jid in jids_input.split(",") if jid.strip()]
                        while not jids:
                            print("Error: At least one Job ID must be provided.")
                            jids_input = input("Job IDs (comma sep): ").strip()
                            jids = [jid.strip() for jid in jids_input.split(",") if jid.strip()]
                    
                    # Create destination directory with current date
                    current_date = datetime.now().strftime("%Y%m%d")
                    default_dest_dir = f"E:\\JobDescription\\{current_date}"
                    dest_dir = input(f"Destination directory (default: {default_dest_dir}): ").strip() or default_dest_dir
                    
                    # Set report path in the same directory
                    default_report_path = os.path.join(dest_dir, "download_report.csv")
                    report_path = input(f"Report file path (default: {default_report_path}): ").strip() or default_report_path
                    
                    # Create the directory if it doesn't exist
                    os.makedirs(dest_dir, exist_ok=True)
                    
                    parallel_download_and_report(drive, fid, jids, dest_dir, report_path)
                else:
                    print("Error: Could not authenticate with Google Drive or invalid folder link.")
            elif choice == '4':
                # Clean up existing files first
                cleanup_existing_files()

                # Set default JD folder path to match the default in option 3
                current_date = datetime.now().strftime("%Y%m%d")
                default_jd_folder = f"E:\\JobDescription\\{current_date}"
                print(f"JD folder path (default: {default_jd_folder})")
                folder = input("JD folder path: ").strip() or default_jd_folder
                while not folder or not os.path.isdir(folder):
                    print(f"Error: Folder path '{folder}' does not exist or is invalid.")
                    folder = input(f"JD folder path (default: {default_jd_folder}): ").strip() or default_jd_folder
                
                # Set default MTB CSV path to the Google Drive folder
                default_mtb_path = "https://drive.google.com/drive/u/1/folders/1h_tR64KptPn3UC1t4ytufyUYHOls71du"
                print(f"MTB CSV path (default: {default_mtb_path})")
                csv_path_input = input("MTB CSV path (local path or Google Drive link): ").strip()
                if not csv_path_input:
                    csv_path_input = default_mtb_path
                    print(f"Using default MTB CSV path: {default_mtb_path}")
                
                # Try to read job IDs from jobidlist.txt (Google Drive first, then local fallback)
                jids = []
                try:
                    print("Attempting to read job IDs from jobidlist.txt in Google Drive...")
                    drive = authenticate_drive()
                    if drive:
                        jobidlist_folder_id = "1h_tR64KptPn3UC1t4ytufyUYHOls71du"
                        search_query = f"title = 'jobidlist.txt' and '{jobidlist_folder_id}' in parents"
                        print(f"Search query: {search_query}")
                        from modules.gdrive_operations import search_files, download_file_by_id
                        import tempfile
                        search_results = search_files(drive, search_query)
                        
                        if search_results:
                            # Download and read the jobidlist.txt file
                            file_id = search_results[0]['id']
                            temp_file = os.path.join(tempfile.gettempdir(), "jobidlist.txt")
                            download_file_by_id(drive, file_id, temp_file)
                            
                            # Read job IDs from the file
                            with open(temp_file, 'r') as f:
                                jids = [jid.strip() for jid in f.read().split(',') if jid.strip()]
                            
                            print(f"Successfully read {len(jids)} job IDs from jobidlist.txt")
                            
                            # Clean up temp file
                            os.remove(temp_file)
                        else:
                            print("jobidlist.txt not found in Google Drive. Checking for local file...")
                    else:
                        print("Failed to authenticate with Google Drive. Checking for local file...")
                except Exception as e:
                    print(f"Error reading jobidlist.txt from Google Drive: {e}")
                    print("Checking for local file...")
                
                # Fallback to local jobidlist.txt if Google Drive failed
                if not jids and os.path.exists("jobidlist.txt"):
                    try:
                        print("Found local jobidlist.txt file. Reading job IDs...")
                        with open("jobidlist.txt", 'r') as f:
                            jids = [jid.strip() for jid in f.read().split(',') if jid.strip()]
                        print(f"Successfully read {len(jids)} job IDs from local jobidlist.txt")
                    except Exception as e:
                        print(f"Error reading local jobidlist.txt: {e}")
                
                if not jids:
                    print("No jobidlist.txt found in Google Drive or locally. Please enter job IDs manually.")
                
                # If no job IDs were read from the file, prompt the user
                if not jids:
                    jids_input = input("Job IDs (comma sep): ").strip()
                    jids = [jid.strip() for jid in jids_input.split(",") if jid.strip()]
                    while not jids:
                        print("Error: At least one Job ID must be provided.")
                        jids_input = input("Job IDs (comma sep): ").strip()
                        jids = [jid.strip() for jid in jids_input.split(",") if jid.strip()]

                processed_csv_path = None

                # Check if the input is a Google Drive link
                if 'drive.google.com' in csv_path_input or 'docs.google.com' in csv_path_input:
                    print("Google Drive link detected. Attempting to download MasterTrackingBoard.csv...")
                    try:
                        drive = authenticate_drive()
                        if drive:
                            # Extract file ID or folder ID from the link
                            file_id = None
                            folder_id = None

                            if '/spreadsheets/d/' in csv_path_input:
                                # It's a Google Sheets URL, extract file ID
                                match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', csv_path_input)
                                if match:
                                    file_id = match.group(1)
                                    print(f"Extracted Google Sheet ID: {file_id}")
                            elif '/folders/' in csv_path_input:
                                # It's a Google Drive folder URL, extract folder ID
                                match = re.search(r'/folders/([a-zA-Z0-9-_]+)', csv_path_input)
                                if match:
                                    folder_id = match.group(1)
                                    print(f"Extracted Google Drive Folder ID: {folder_id}")
                            elif '/file/d/' in csv_path_input:
                                # It's a Google Drive file URL, extract file ID
                                match = re.search(r'/file/d/([a-zA-Z0-9-_]+)', csv_path_input)
                                if match:
                                    file_id = match.group(1)
                                    print(f"Extracted Google Drive File ID: {file_id}")

                            if file_id:
                                # Download the specific file
                                from modules.gdrive_operations import download_file_by_id
                                import tempfile
                                # Define a temporary local path for the downloaded file
                                temp_dir = tempfile.gettempdir()
                                local_file_name = f"MasterTrackingBoard_{file_id}.csv"
                                processed_csv_path = os.path.join(temp_dir, local_file_name)
                                download_file_by_id(drive, file_id, processed_csv_path)
                                print(f"Downloaded Google Drive file to {processed_csv_path}")
                            elif folder_id:
                                # Search for MasterTrackingBoard.csv within the folder and download it
                                from modules.gdrive_operations import search_files, download_file_by_id
                                # Search for mastertrackingboard.csv (case insensitive)
                                search_results = search_files(drive, f"title contains 'mastertrackingboard.csv' and '{folder_id}' in parents")

                                if search_results:
                                    # Assuming the first result is the correct file
                                    file_id_to_download = search_results[0]['id']
                                    print(f"Found MasterTrackingBoard.csv with ID: {file_id_to_download}")
                                    import tempfile
                                    temp_dir = tempfile.gettempdir()
                                    local_file_name = f"MasterTrackingBoard_{file_id_to_download}.csv"
                                    processed_csv_path = os.path.join(temp_dir, local_file_name)
                                    download_file_by_id(drive, file_id_to_download, processed_csv_path)
                                    print(f"Downloaded MasterTrackingBoard.csv to {processed_csv_path}")
                                else:
                                    print(f"Error: MasterTrackingBoard.csv not found in the specified Google Drive folder.")
                                    input("\nPress ENTER to continue...")
                                    continue
                            else:
                                print("Error: Could not extract file or folder ID from the Google Drive link.")
                                input("\nPress ENTER to continue...")
                                continue
                        else:
                            print("Error: Failed to authenticate with Google Drive.")
                            print("Please ensure you have the necessary credentials and permissions.")
                            input("\nPress ENTER to continue...")
                            continue
                    except Exception as e:
                        print(f"Error processing Google Drive link: {e}")
                        print("Please ensure the link is valid and you have the necessary permissions.")
                        input("\nPress ENTER to continue...")
                        continue
                else:
                    # Assume it's a local file path
                    processed_csv_path = csv_path_input

                # Proceed with JobProcessor using the local CSV path and current AI agent
                if processed_csv_path and os.path.exists(processed_csv_path):
                    print(f"Using AI agent: {current_ai_agent.upper()}")
                    # Let JobProcessor handle API key loading through config system
                    proc = JobProcessor(jids, folder, processed_csv_path, ai_agent=current_ai_agent, api_key=None)
                    ai_output_file = proc.run()
                    print("[OK] AI processing completed")

                    if ai_output_file:
                        print(f"AI output saved to: {ai_output_file}")
                    else:
                        print("Warning: No AI output file generated")

                    # Create final optimized file with date in title
                    print(f"\n--- FINAL OPTIMIZATION & UPLOAD ---")
                    current_date = datetime.now().strftime("%Y%m%d")
                    final_filename = f"jobs_{current_date}_final_optimized.json"
                    final_output_path = rf"output\{final_filename}"
                    print(f"[PATH] Final output path set to: {final_output_path}")

                    # Use the file path returned by JobProcessor
                    input_json_file = ai_output_file
                    if input_json_file and os.path.exists(input_json_file):
                        print(f"Using AI output file: {input_json_file}")
                    elif input_json_file:
                        print(f"Warning: AI output file not found at {input_json_file}")
                        input_json_file = None

                    if input_json_file:
                        try:
                            # Copy the AI-processed file to final location (keep original)
                            import shutil
                            shutil.copy2(input_json_file, final_output_path)
                            print(f"Moved AI-processed file to: {final_output_path}")

                            # Run final optimizer on the file with error handling
                            try:
                                optimizer = FinalOptimizer(final_output_path)
                                optimizer.run_optimization()
                                print(f"[OK] Final optimization completed: {final_output_path}")
                            except Exception as opt_error:
                                print(f"[WARNING] Final optimization failed: {opt_error}")
                                print(f"[INFO] Proceeding with upload of partially optimized file")
                                # Continue with upload even if optimization fails


                            # Clean up intermediate files in output folder (keep final file)
                            output_folder = "output"
                            if os.path.exists(output_folder):
                                for filename in os.listdir(output_folder):
                                    if filename.startswith("jobs_") and filename.endswith(".json") and filename != final_filename:
                                        try:
                                            os.remove(os.path.join(output_folder, filename))
                                            print(f"Cleaned up intermediate file: {filename}")
                                        except Exception as e:
                                            print(f"Warning: Could not remove {filename}: {e}")

                            # Upload ONLY the final optimized JSON to Google Drive
                            print(f"[UPLOAD] Preparing to upload {final_filename} to Google Drive...")
                            drive = authenticate_drive()
                            if drive:
                                # Get the Google Drive folder ID from config
                                folder_id = config.GDRIVE_FOLDER_ID

                                # Check for existing files with same name and delete them
                                print(f"[UPLOAD] Checking for existing files with name '{final_filename}'...")
                                query = f"title = '{final_filename}' and '{folder_id}' in parents and trashed = false"
                                existing_files = drive.ListFile({'q': query}).GetList()

                                if existing_files:
                                    print(f"[UPLOAD] Found {len(existing_files)} existing file(s) with same name. Deleting...")
                                    for existing_file in existing_files:
                                        try:
                                            existing_file.Delete()
                                            print(f"[UPLOAD] Deleted existing file: {existing_file['title']}")
                                        except Exception as e:
                                            print(f"[UPLOAD] Warning: Could not delete existing file {existing_file['title']}: {e}")

                                # Create file metadata for the final optimized JSON
                                file_metadata = {
                                    'title': final_filename,
                                    'parents': [{'id': folder_id}]
                                }

                                print(f"[UPLOAD] Creating new file on Google Drive...")
                                # Create the file and upload
                                file = drive.CreateFile(file_metadata)
                                file.SetContentFile(final_output_path)
                                print(f"[UPLOAD] Uploading file content...")
                                file.Upload()

                                # Show the Google Drive folder URL
                                drive_url = f"https://drive.google.com/drive/folders/{folder_id}"
                                print(f"[UPLOAD] ✅ SUCCESS: {final_filename} uploaded to Google Drive")
                                print(f"[UPLOAD] 📁 Google Drive folder URL: {drive_url}")
                                print(f"[UPLOAD] 🎯 File is ready for resume matching!")
                            else:
                                print("[UPLOAD] ❌ FAILED: Could not authenticate with Google Drive")

                        except Exception as e:
                            print(f"✗ Error during final optimization and upload: {e}")
                    else:
                        print("✗ Could not find AI-processed JSON file for final optimization")
                else:
                    print(f"Error: Local CSV file not found at {processed_csv_path}")
            elif choice == '5':
                src = input("Source dir for PDFs/DOCs: ").strip()
                while not src or not os.path.isdir(src):
                    print(f"Error: Source directory '{src}' does not exist or is invalid.")
                    src = input("Source dir for PDFs/DOCs: ").strip()
                out = input("Output text file path: ").strip()
                while not out:
                    print("Error: Output file path cannot be empty.")
                    out = input("Output text file path: ").strip()
                combine_texts(src, out)
            elif choice == '6':
                print("Running full pipeline...")
                # Get inputs for the full pipeline
                csv_path = input("MTB CSV path: ").strip()
                category = input("Category (comma-separated for multiple, or 'ALL'): ").strip()
                state = input("State (comma-separated for multiple, or 'ALL'): ").strip()
                client_rating = input("Client Rating (comma-separated for multiple, or 'ALL'): ").strip()
                
                # Step 1: Extract job IDs from MTB
                print("Step 1: Extracting job IDs from MTB...")
                job_ids = master_tracking_board_activities(csv_path, category, state, client_rating, True)
                if not job_ids:
                    print("No job IDs found. Pipeline stopped.")
                    input("\nPress ENTER to continue...")
                    continue
                print(f"Extracted job IDs: {', '.join(job_ids)}")
                
                # Step 2: Copy local files
                print("Step 2: Copying local files...")
                src_dir = input("Source directory for local files: ").strip()
                while not src_dir or not os.path.isdir(src_dir):
                    print(f"Error: Source directory '{src_dir}' does not exist or is invalid.")
                    src_dir = input("Source directory for local files: ").strip()
                dest_dir = input("Destination directory: ").strip()
                while not dest_dir:
                    print("Error: Destination directory cannot be empty.")
                    dest_dir = input("Destination directory: ").strip()
                copy_files_with_numbers(src_dir, dest_dir, job_ids)
                
                # Step 2b: Download files from Google Drive (if needed)
                download_from_drive = input("Download files from Google Drive? (y/n): ").lower() == 'y'
                if download_from_drive:
                    print("Step 2b: Downloading files from Google Drive...")
                    link = input("Drive folder link: ").strip()
                    fid = extract_folder_id(link)
                    drive = authenticate_drive()
                    if drive and fid:
                        mapping = find_job_folders(drive, fid, job_ids)
                        for jid, sub in mapping.items():
                            download_files_directly(drive, sub, dest_dir, jid)
                    else:
                        print("Warning: Could not authenticate with Google Drive or invalid folder link.")
                
                # Step 3: Process job descriptions with current AI agent
                print(f"Step 3: Processing job descriptions using {current_ai_agent.upper()}...")
                # Let JobProcessor handle API key loading through config system
                proc = JobProcessor(job_ids, dest_dir, csv_path, ai_agent=current_ai_agent, api_key=None)
                proc.run()
                
                # Step 4: Combine texts
                print("Step 4: Combining texts...")
                output_file = input("Output combined text file path: ").strip()
                while not output_file:
                    print("Error: Output file path cannot be empty.")
                    output_file = input("Output combined text file path: ").strip()
                combine_texts(dest_dir, output_file)
                
                print("Full pipeline completed successfully!")
            elif choice == '7':
                # Clean up existing files first
                cleanup_existing_files()

                print("Running full pipeline: Option 1 > Option 3 > Option 4...")
                try:
                    # Step 1: Run Option 1 (Prepare MTB)
                    print("\n" + "="*50)
                    print("STEP 1: RUNNING OPTION 1 (Prepare MTB)")
                    print("="*50)
                    
                    # Set default MTB Google Drive folder link
                    default_mtb_link = "https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8"
                    print(f"MTB CSV path or Google Drive folder link (default: {default_mtb_link})")
                    csv_path = input("MTB CSV path: ").strip()
                    if not csv_path:
                        csv_path = default_mtb_link
                        print(f"Using default MTB Google Drive folder: {default_mtb_link}")
                    # Industry filter removed as requested
                    category = input("Category (comma-separated for multiple, or 'ALL'): ").strip()
                    # Recruitment date removed as requested
                    state = input("State (comma-separated for multiple, or 'ALL'): ").strip()
                    client_rating = input("Client Rating (comma-separated for multiple, or 'ALL'): ").strip()
                    extract_ids = input("Extract job IDs? (y/n): ").lower() == 'y'
                    try:
                        job_ids = master_tracking_board_activities(csv_path, category, state, client_rating, extract_ids)
                        
                        # Create jobidlist.txt with comma-delimited list of job IDs
                        if extract_ids and job_ids:
                            print(f"Extracted job IDs: {', '.join(job_ids)}")
                        
                            # Save job IDs to jobidlist.txt in organized data structure
                            data_dir = os.getenv("DATA_DIR", "/app/data")
                            mtb_dir = os.path.join(data_dir, "MTB")
                            os.makedirs(mtb_dir, exist_ok=True)
                            jobidlist_path = os.path.join(mtb_dir, "jobidlist.txt")
                            with open(jobidlist_path, "w") as f:
                                f.write(','.join(job_ids))
                            print(f"Job IDs saved to {jobidlist_path}")
                            
                            # Google Drive upload disabled - files saved locally only
                            print("Files saved locally to /app/data/MTB/")
                    except KeyError as e:
                        print(f"Error: The column '{str(e)}' does not exist in the CSV. Please check your CSV file.")
                        continue
                    except Exception as e:
                        print(f"Error processing MTB: {e}")
                        continue
                    
                    if not job_ids:
                        print("No job IDs extracted. Pipeline stopped.")
                        continue
                    
                    print(f"[OK] Step 1 completed: {len(job_ids)} job IDs extracted")
                    
                    # Step 2: Run Option 3 (Copy from Google Drive by JobID)
                    print("\n" + "="*50)
                    print("STEP 2: RUNNING OPTION 3 (Copy from Google Drive)")
                    print("="*50)
                    
                    # Set default drive folder link
                    default_link = "https://drive.google.com/drive/u/1/folders/1KXb1YDWYEy_3WgRT-MVnlI22jq8t3EMv"
                    print(f"Drive folder link (default: {default_link})")
                    link = input("Drive folder link: ").strip()
                    if not link:
                        link = default_link
                        print(f"Using default link: {default_link}")
                    fid = extract_folder_id(link)
                    drive = authenticate_drive()
                    if drive and fid:
                        # Create destination directory with current date
                        current_date = datetime.now().strftime("%Y%m%d")
                        default_dest_dir = f"E:\\JobDescription\\{current_date}"
                        dest_dir = input(f"Destination directory (default: {default_dest_dir}): ").strip() or default_dest_dir
                        
                        # Set report path in the same directory
                        default_report_path = os.path.join(dest_dir, "download_report.csv")
                        report_path = input(f"Report file path (default: {default_report_path}): ").strip() or default_report_path
                        
                        # Create the directory if it doesn't exist
                        os.makedirs(dest_dir, exist_ok=True)
                        
                        parallel_download_and_report(drive, fid, job_ids, dest_dir, report_path)
                        print(f"[OK] Step 2 completed: Files downloaded to {dest_dir}")
                    else:
                        print("Error: Could not authenticate with Google Drive or invalid folder link.")
                        continue
                    
                    # Step 3: Run Option 4 (Process Job Descriptions with AI Agent)
                    print("\n" + "="*50)
                    print("STEP 3: RUNNING OPTION 4 (Process Job Descriptions)")
                    print("="*50)
                    
                    # Use the destination directory from Step 2
                    folder = dest_dir
                    print(f"Using JD folder path: {folder}")
                    
                    # Use the local CSV path from Step 1 (not the Google Drive link)
                    # Step 1 should have created a local CSV file that we can use directly
                    local_csv_path = None
                    
                    # Check if Step 1 created a local CSV file
                    current_date = datetime.now().strftime("%Y%m%d")
                    potential_csv_paths = [
                        "MasterTrackingBoard.csv",  # Most likely location
                        f"MasterTrackingBoard_{current_date}.csv",
                        f"output/MasterTrackingBoard.csv",
                        f"output/MasterTrackingBoard_{current_date}.csv"
                    ]
                    
                    print("Checking for local MTB CSV files...")
                    for potential_path in potential_csv_paths:
                        print(f"  Checking: {potential_path}")
                        if os.path.exists(potential_path):
                            local_csv_path = potential_path
                            print(f"  [OK] Found: {potential_path}")
                            break
                        else:
                            print(f"  ✗ Not found: {potential_path}")
                    
                    if local_csv_path:
                        csv_path_input = local_csv_path
                        print(f"[OK] Using local MTB CSV from Step 1: {csv_path_input}")
                    else:
                        # Fallback to the original Google Drive path if no local file found
                        csv_path_input = csv_path
                        print(f"⚠ No local MTB CSV found, falling back to Google Drive: {csv_path_input}")
                    
                    processed_csv_path = None

                    # Check if the input is a Google Drive link
                    if 'drive.google.com' in csv_path_input or 'docs.google.com' in csv_path_input:
                        print("Google Drive link detected. Attempting to download MasterTrackingBoard.csv...")
                        try:
                            # Re-authenticate drive for this step to ensure fresh connection
                            drive = authenticate_drive()
                            if drive:
                                # Extract file ID or folder ID from the link
                                file_id = None
                                folder_id = None

                                if '/spreadsheets/d/' in csv_path_input:
                                    # It's a Google Sheets URL, extract file ID
                                    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', csv_path_input)
                                    if match:
                                        file_id = match.group(1)
                                        print(f"Extracted Google Sheet ID: {file_id}")
                                elif '/folders/' in csv_path_input:
                                    # It's a Google Drive folder URL, extract folder ID
                                    match = re.search(r'/folders/([a-zA-Z0-9-_]+)', csv_path_input)
                                    if match:
                                        folder_id = match.group(1)
                                        print(f"Extracted Google Drive Folder ID: {folder_id}")
                                elif '/file/d/' in csv_path_input:
                                    # It's a Google Drive file URL, extract file ID
                                    match = re.search(r'/file/d/([a-zA-Z0-9-_]+)', csv_path_input)
                                    if match:
                                        file_id = match.group(1)
                                        print(f"Extracted Google Drive File ID: {file_id}")

                                if file_id:
                                    # Download the specific file
                                    from modules.gdrive_operations import download_file_by_id
                                    # Define a temporary local path for the downloaded file
                                    import tempfile
                                    temp_dir = tempfile.gettempdir()
                                    local_file_name = f"MasterTrackingBoard_{file_id}.csv"
                                    processed_csv_path = os.path.join(temp_dir, local_file_name)
                                    download_file_by_id(drive, file_id, processed_csv_path)
                                    print(f"Downloaded Google Drive file to {processed_csv_path}")
                                elif folder_id:
                                    # Search for MasterTrackingBoard.csv within the folder and download it
                                    from modules.gdrive_operations import search_files, download_file_by_id
                                    # Search for mastertrackingboard.csv (case insensitive)
                                    search_results = search_files(drive, f"title contains 'mastertrackingboard.csv' and '{folder_id}' in parents")

                                    if search_results:
                                        # Assuming the first result is the correct file
                                        file_id_to_download = search_results[0]['id']
                                        print(f"Found MasterTrackingBoard.csv with ID: {file_id_to_download}")
                                        import tempfile
                                        temp_dir = tempfile.gettempdir()
                                        local_file_name = f"MasterTrackingBoard_{file_id_to_download}.csv"
                                        processed_csv_path = os.path.join(temp_dir, local_file_name)
                                        download_file_by_id(drive, file_id_to_download, processed_csv_path)
                                        print(f"Downloaded MasterTrackingBoard.csv to {processed_csv_path}")
                                    else:
                                        print(f"Error: MasterTrackingBoard.csv not found in the specified Google Drive folder.")
                                        continue
                                else:
                                    print("Error: Could not extract file or folder ID from the Google Drive link.")
                                    continue
                            else:
                                print("Error: Failed to authenticate with Google Drive.")
                                print("Please ensure you have the necessary credentials and permissions.")
                                continue
                        except Exception as e:
                            print(f"Error processing Google Drive link: {e}")
                            print("Please ensure the link is valid and you have the necessary permissions.")
                            continue
                    else:
                        # Assume it's a local file path
                        processed_csv_path = csv_path_input

                    # Proceed with JobProcessor using the local CSV path and current AI agent
                    if processed_csv_path and os.path.exists(processed_csv_path):
                        print(f"Using AI agent: {current_ai_agent.upper()}")
                        # Let JobProcessor handle API key loading through config system
                        proc = JobProcessor(job_ids, folder, processed_csv_path, ai_agent=current_ai_agent, api_key=None)
                        ai_output_file = proc.run()
                        print(f"[OK] Step 3 completed: Job descriptions processed with {current_ai_agent.upper()}")

                        if ai_output_file:
                            print(f"AI output saved to: {ai_output_file}")
                        else:
                            print("Warning: No AI output file generated")

                        # Step 4: Run Final Optimizer
                        print("\n" + "="*50)
                        print("STEP 4: RUNNING FINAL OPTIMIZER")
                        print("="*50)

                        # Use the file path returned by JobProcessor
                        input_json_file = ai_output_file
                        if input_json_file and os.path.exists(input_json_file):
                            print(f"Using AI output file: {input_json_file}")
                        elif input_json_file:
                            print(f"Warning: AI output file not found at {input_json_file}")
                            input_json_file = None

                        if input_json_file:
                            try:
                                optimizer = FinalOptimizer(input_json_file)
                                final_file = optimizer.run_optimization()
                                print(f"[OK] Step 4 completed: Successfully optimized file saved to: {final_file}")

                                # Automatically run final optimization and upload (like Option 9)
                                print(f"\n--- STEP 5: FINAL OPTIMIZATION & UPLOAD ---")
                                try:
                                    # Copy the optimized file to n8n folder for final processing
                                    import shutil
                                    n8n_path = r"g:\My Drive\n8n\jobs_20250902_optimized.json"
                                    shutil.copy2(final_file, n8n_path)
                                    print(f"Copied optimized file to n8n folder: {n8n_path}")

                                    # Create final optimized file with date in title (use local output folder, not synced Google Drive)
                                    current_date = datetime.now().strftime("%Y%m%d")
                                    final_filename = f"jobs_{current_date}_final_optimized.json"
                                    final_output_path = rf"output\{final_filename}"

                                    # Run final optimizer with consistent output path
                                    final_optimizer = FinalOptimizer(n8n_path)
                                    final_optimizer.run_optimization()
                                    print(f"[OK] Final optimization completed: {final_output_path}")

                                    # Clean up intermediate files in output folder (keep final file)
                                    output_folder = "output"
                                    if os.path.exists(output_folder):
                                        for filename in os.listdir(output_folder):
                                            if filename.startswith("jobs_") and filename.endswith(".json") and filename != final_filename:
                                                try:
                                                    os.remove(os.path.join(output_folder, filename))
                                                    print(f"Cleaned up intermediate file: {filename}")
                                                except Exception as e:
                                                    print(f"Warning: Could not remove {filename}: {e}")

                                    # Upload ONLY the final optimized JSON to Google Drive
                                    drive = authenticate_drive()
                                    if drive:
                                        # Get the Google Drive folder ID from config
                                        folder_id = config.GDRIVE_FOLDER_ID

                                        # Check for existing files with same name and delete them
                                        print(f"[UPLOAD] Checking for existing files with name '{final_filename}'...")
                                        query = f"title = '{final_filename}' and '{folder_id}' in parents and trashed = false"
                                        existing_files = drive.ListFile({'q': query}).GetList()

                                        if existing_files:
                                            print(f"[UPLOAD] Found {len(existing_files)} existing file(s) with same name. Deleting...")
                                            for existing_file in existing_files:
                                                try:
                                                    existing_file.Delete()
                                                    print(f"[UPLOAD] Deleted existing file: {existing_file['title']}")
                                                except Exception as e:
                                                    print(f"[UPLOAD] Warning: Could not delete existing file {existing_file['title']}: {e}")

                                        # Create file metadata for the final optimized JSON
                                        file_metadata = {
                                            'title': final_filename,
                                            'parents': [{'id': folder_id}]
                                        }

                                        print(f"[UPLOAD] Creating new file on Google Drive...")
                                        # Create the file and upload
                                        file = drive.CreateFile(file_metadata)
                                        file.SetContentFile(final_output_path)
                                        print(f"[UPLOAD] Uploading file content...")
                                        file.Upload()

                                        # Show the Google Drive folder URL
                                        drive_url = f"https://drive.google.com/drive/folders/{folder_id}"
                                        print(f"[UPLOAD] ✅ SUCCESS: {final_filename} uploaded to Google Drive")
                                        print(f"[UPLOAD] 📁 Google Drive folder URL: {drive_url}")
                                        print(f"[UPLOAD] 🎯 File is ready for resume matching!")
                                    else:
                                        print("Failed to authenticate with Google Drive for JSON upload")

                                except Exception as e:
                                    print(f"Error in final optimization and upload: {e}")

                            except (FileNotFoundError, ValueError, KeyError) as e:
                                print(f"✗ Step 4 failed: An error occurred during final optimization: {e}")
                        else:
                            print(f"✗ Step 4 failed: Could not find input file for optimization in any expected location")
                            continue
                    else:
                        print(f"Error: Local CSV file not found at {processed_csv_path}")
                        continue
                    
                    print("\n" + "="*60)
                    print("🎉 FULL PIPELINE COMPLETED SUCCESSFULLY!")
                    print("="*60)
                    print("[OK] Step 1: MTB processed and job IDs extracted")
                    print("[OK] Step 2: Files downloaded from Google Drive")
                    print("[OK] Step 3: Job descriptions processed with AI agent")
                    print("[OK] Step 4: Final JSON optimized for resume matching")
                    print("="*60)
                    
                except Exception as e:
                    print(f"Error in full pipeline: {e}")
            elif choice == '8':
                print("\nSelect AI Agent:")
                print("1) Grok")
                print("2) Gemini")
                print("3) Deepseek")
                print("4) OpenAI")
                print("5) Qwen")
                print("6) Z.ai")
                agent_choice = input("Enter choice: ").strip()
                if agent_choice == '1':
                    current_ai_agent = "grok"
                    save_ai_agent_preference(current_ai_agent)
                    current_key = config.load_api_key("GROK_API_KEY")
                    if current_key:
                        print(f"Using existing Grok API key from configuration")
                        api_key_input = input(f"Press ENTER to use existing key, or enter new key to override: ").strip()
                        if api_key_input:
                            os.environ["GROK_API_KEY"] = api_key_input
                            print("Grok API key updated for this session.")
                    else:
                        api_key_input = input("Grok API key (required): ").strip()
                        if api_key_input:
                            os.environ["GROK_API_KEY"] = api_key_input
                            print("Grok API key set for this session.")
                        else:
                            print("Warning: No API key provided. Grok may not work correctly.")
                    
                    print("\nAvailable Grok models:")
                    for i, model_name in enumerate(config.AVAILABLE_MODELS["grok"], 1):
                        print(f"{i}) {model_name}")
                    print()

                    model = input(f"Grok model (default: {config.GROK_MODEL}): ").strip() or config.GROK_MODEL
                    if model != config.GROK_MODEL:
                        os.environ["GROK_MODEL"] = model
                        print(f"Grok model set to: {model}")
                    
                    # Test the AI agent
                    print("Testing Grok connection...")
                    success, message = config.test_ai_agent("grok")
                    if success:
                        print(f"[OK] {message}")
                    else:
                        print(f"✗ {message}")
                        
                elif agent_choice == '2':
                    current_ai_agent = "gemini"
                    save_ai_agent_preference(current_ai_agent)
                    current_key = config.load_api_key("GEMINI_API_KEY")
                    if current_key:
                        print(f"Using existing Gemini API key from configuration")
                        api_key_input = input(f"Press ENTER to use existing key, or enter new key to override: ").strip()
                        if api_key_input:
                            os.environ["GEMINI_API_KEY"] = api_key_input
                            print("Gemini API key updated for this session.")
                    else:
                        api_key_input = input("Gemini API key (required): ").strip()
                        if api_key_input:
                            os.environ["GEMINI_API_KEY"] = api_key_input
                            print("Gemini API key set for this session.")
                        else:
                            print("Warning: No API key provided. Gemini may not work correctly.")
                    
                    print("\nAvailable Gemini models:")
                    for i, model_name in enumerate(config.AVAILABLE_MODELS["gemini"], 1):
                        print(f"{i}) {model_name}")
                    print()

                    model = input(f"Gemini model (default: {config.GEMINI_MODEL}): ").strip() or config.GEMINI_MODEL
                    if model != config.GEMINI_MODEL:
                        os.environ["GEMINI_MODEL"] = model
                        print(f"Gemini model set to: {model}")
                    
                    # Test the AI agent
                    print("Testing Gemini connection...")
                    success, message = config.test_ai_agent("gemini")
                    if success:
                        print(f"✓ {message}")
                    else:
                        print(f"✗ {message}")
                        
                elif agent_choice == '3':
                    current_ai_agent = "deepseek"
                    save_ai_agent_preference(current_ai_agent)
                    current_key = config.load_api_key("DEEPSEEK_API_KEY")
                    if current_key:
                        print(f"Using existing Deepseek API key from configuration")
                        api_key_input = input(f"Press ENTER to use existing key, or enter new key to override: ").strip()
                        if api_key_input:
                            os.environ["DEEPSEEK_API_KEY"] = api_key_input
                            print("Deepseek API key updated for this session.")
                    else:
                        api_key_input = input("Deepseek API key (required): ").strip()
                        if api_key_input:
                            os.environ["DEEPSEEK_API_KEY"] = api_key_input
                            print("Deepseek API key set for this session.")
                        else:
                            print("Warning: No API key provided. Deepseek may not work correctly.")
                    
                    print("\nAvailable Deepseek models:")
                    for i, model_name in enumerate(config.AVAILABLE_MODELS["deepseek"], 1):
                        print(f"{i}) {model_name}")
                    print()

                    model = input(f"Deepseek model (default: {config.DEEPSEEK_MODEL}): ").strip() or config.DEEPSEEK_MODEL
                    if model != config.DEEPSEEK_MODEL:
                        os.environ["DEEPSEEK_MODEL"] = model
                        print(f"Deepseek model set to: {model}")
                    
                    # Test the AI agent
                    print("Testing Deepseek connection...")
                    success, message = config.test_ai_agent("deepseek")
                    if success:
                        print(f"✓ {message}")
                    else:
                        print(f"✗ {message}")
                        
                elif agent_choice == '4':
                    current_ai_agent = "openai"
                    save_ai_agent_preference(current_ai_agent)
                    current_key = config.load_api_key("OPENAI_API_KEY")
                    if current_key:
                        print(f"Using existing OpenAI API key from configuration")
                        api_key_input = input(f"Press ENTER to use existing key, or enter new key to override: ").strip()
                        if api_key_input:
                            os.environ["OPENAI_API_KEY"] = api_key_input
                            print("OpenAI API key updated for this session.")
                    else:
                        api_key_input = input("OpenAI API key (required): ").strip()
                        if api_key_input:
                            os.environ["OPENAI_API_KEY"] = api_key_input
                            print("OpenAI API key set for this session.")
                        else:
                            print("Warning: No API key provided. OpenAI may not work correctly.")
                    
                    print("\nAvailable OpenAI models:")
                    for i, model_name in enumerate(config.AVAILABLE_MODELS["openai"], 1):
                        print(f"{i}) {model_name}")
                    print()

                    model = input(f"OpenAI model (default: {config.OPENAI_MODEL}): ").strip() or config.OPENAI_MODEL
                    if model != config.OPENAI_MODEL:
                        os.environ["OPENAI_MODEL"] = model
                        print(f"OpenAI model set to: {model}")
                    
                    # Test the AI agent
                    print("Testing OpenAI connection...")
                    success, message = config.test_ai_agent("openai")
                    if success:
                        print(f"✓ {message}")
                    else:
                        print(f"✗ {message}")
                        
                elif agent_choice == '5':
                    current_ai_agent = "qwen"
                    save_ai_agent_preference(current_ai_agent)
                    current_key = config.load_api_key("DASHSCOPE_API_KEY")
                    if current_key:
                        print(f"Using existing Qwen API key from configuration")
                        api_key_input = input(f"Press ENTER to use existing key, or enter new key to override: ").strip()
                        if api_key_input:
                            os.environ["DASHSCOPE_API_KEY"] = api_key_input
                            print("Qwen API key updated for this session.")
                    else:
                        api_key_input = input("Qwen API key (required): ").strip()
                        if api_key_input:
                            os.environ["DASHSCOPE_API_KEY"] = api_key_input
                            print("Qwen API key set for this session.")
                        else:
                            print("Warning: No API key provided. Qwen may not work correctly.")
                    
                    print("\nAvailable Qwen models:")
                    for i, model_name in enumerate(config.AVAILABLE_MODELS["qwen"], 1):
                        print(f"{i}) {model_name}")
                    print()

                    model = input(f"Qwen model (default: {config.QWEN_MODEL}): ").strip() or config.QWEN_MODEL
                    if model != config.QWEN_MODEL:
                        os.environ["QWEN_MODEL"] = model
                        print(f"Qwen model set to: {model}")
                    
                    # Test the AI agent
                    print("Testing Qwen connection...")
                    success, message = config.test_ai_agent("qwen")
                    if success:
                        print(f"✓ {message}")
                    else:
                        print(f"✗ {message}")
                elif agent_choice == '6':
                    current_ai_agent = "zai"
                    save_ai_agent_preference(current_ai_agent)
                    current_key = config.load_api_key("ZAI_API_KEY")
                    if current_key:
                        print(f"Using existing Z.ai API key from configuration")
                        api_key_input = input(f"Press ENTER to use existing key, or enter new key to override: ").strip()
                        if api_key_input:
                            os.environ["ZAI_API_KEY"] = api_key_input
                            print("Z.ai API key updated for this session.")
                    else:
                        api_key_input = input("Z.ai API key (required): ").strip()
                        if api_key_input:
                            os.environ["ZAI_API_KEY"] = api_key_input
                            print("Z.ai API key set for this session.")
                        else:
                            print("Warning: No API key provided. Z.ai may not work correctly.")
                    
                    print("\nAvailable Z.ai models:")
                    for i, model_name in enumerate(config.AVAILABLE_MODELS["zai"], 1):
                        print(f"{i}) {model_name}")
                    print()

                    model = input(f"Z.ai model (default: {config.ZAI_MODEL}): ").strip() or config.ZAI_MODEL
                    if model != config.ZAI_MODEL:
                        os.environ["ZAI_MODEL"] = model
                        print(f"Z.ai model set to: {model}")
                    
                    # Test the AI agent
                    print("Testing Z.ai connection...")
                    success, message = config.test_ai_agent("zai")
                    if success:
                        print(f"✓ {message}")
                    else:
                        print(f"✗ {message}")
                else:
                    print("Invalid AI agent choice. Keeping current agent.")
                print(f"AI Agent set to: {current_ai_agent.upper()}")
            elif choice == '9':
                # Clean up existing files first
                cleanup_existing_files()

                print("Creating Optimized & Complete JSON (AI Processing + Field Corrections)...")

                # Set default JD folder path
                current_date = datetime.now().strftime("%Y%m%d")
                default_jd_folder = f"E:\\JobDescription\\{current_date}"
                folder = input(f"JD folder path (default: {default_jd_folder}): ").strip() or default_jd_folder
                while not folder or not os.path.isdir(folder):
                    print(f"Error: Folder path '{folder}' does not exist or is invalid.")
                    folder = input(f"JD folder path (default: {default_jd_folder}): ").strip() or default_jd_folder

                # Set default MTB CSV path
                default_mtb_path = "https://drive.google.com/drive/u/1/folders/1h_tR64KptPn3UC1t4ytufyUYHOls71du"
                csv_path_input = input(f"MTB CSV path (default: {default_mtb_path}): ").strip()
                if not csv_path_input:
                    csv_path_input = default_mtb_path
                    print(f"Using default MTB CSV path: {default_mtb_path}")

                # Try to read job IDs from jobidlist.txt
                jids = []
                try:
                    print("Attempting to read job IDs from jobidlist.txt...")
                    drive = authenticate_drive()
                    if drive:
                        jobidlist_folder_id = "1h_tR64KptPn3UC1t4ytufyUYHOls71du"
                        search_query = f"title = 'jobidlist.txt' and '{jobidlist_folder_id}' in parents"
                        from modules.gdrive_operations import search_files, download_file_by_id
                        import tempfile
                        search_results = search_files(drive, search_query)

                        if search_results:
                            file_id = search_results[0]['id']
                            temp_file = os.path.join(tempfile.gettempdir(), "jobidlist.txt")
                            download_file_by_id(drive, file_id, temp_file)

                            with open(temp_file, 'r') as f:
                                jids = [jid.strip() for jid in f.read().split(',') if jid.strip()]

                            print(f"Successfully read {len(jids)} job IDs from jobidlist.txt")
                            os.remove(temp_file)
                        else:
                            print("jobidlist.txt not found in Google Drive.")
                    else:
                        print("Failed to authenticate with Google Drive.")
                except Exception as e:
                    print(f"Error reading jobidlist.txt from Google Drive: {e}")

                # Fallback to local jobidlist.txt
                if not jids and os.path.exists("jobidlist.txt"):
                    try:
                        print("Found local jobidlist.txt file. Reading job IDs...")
                        with open("jobidlist.txt", 'r') as f:
                            jids = [jid.strip() for jid in f.read().split(',') if jid.strip()]
                        print(f"Successfully read {len(jids)} job IDs from local jobidlist.txt")
                    except Exception as e:
                        print(f"Error reading local jobidlist.txt: {e}")

                if not jids:
                    print("No job IDs found. Please enter them manually.")
                    jids_input = input("Job IDs (comma sep): ").strip()
                    jids = [jid.strip() for jid in jids_input.split(",") if jid.strip()]
                    while not jids:
                        print("Error: At least one Job ID must be provided.")
                        jids_input = input("Job IDs (comma sep): ").strip()
                        jids = [jid.strip() for jid in jids_input.split(",") if jid.strip()]

                # Process CSV path (Google Drive or local)
                processed_csv_path = None
                if 'drive.google.com' in csv_path_input or 'docs.google.com' in csv_path_input:
                    print("Google Drive link detected. Attempting to download MasterTrackingBoard.csv...")
                    try:
                        drive = authenticate_drive()
                        if drive:
                            # Extract file ID or folder ID
                            file_id = None
                            folder_id = None

                            if '/spreadsheets/d/' in csv_path_input:
                                match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', csv_path_input)
                                if match:
                                    file_id = match.group(1)
                            elif '/folders/' in csv_path_input:
                                match = re.search(r'/folders/([a-zA-Z0-9-_]+)', csv_path_input)
                                if match:
                                    folder_id = match.group(1)
                            elif '/file/d/' in csv_path_input:
                                match = re.search(r'/file/d/([a-zA-Z0-9-_]+)', csv_path_input)
                                if match:
                                    file_id = match.group(1)

                            if file_id:
                                from modules.gdrive_operations import download_file_by_id
                                import tempfile
                                temp_dir = tempfile.gettempdir()
                                local_file_name = f"MasterTrackingBoard_{file_id}.csv"
                                processed_csv_path = os.path.join(temp_dir, local_file_name)
                                download_file_by_id(drive, file_id, processed_csv_path)
                                print(f"Downloaded Google Drive file to {processed_csv_path}")
                            elif folder_id:
                                from modules.gdrive_operations import search_files, download_file_by_id
                                search_results = search_files(drive, f"title contains 'mastertrackingboard.csv' and '{folder_id}' in parents")

                                if search_results:
                                    file_id_to_download = search_results[0]['id']
                                    import tempfile
                                    temp_dir = tempfile.gettempdir()
                                    local_file_name = f"MasterTrackingBoard_{file_id_to_download}.csv"
                                    processed_csv_path = os.path.join(temp_dir, local_file_name)
                                    download_file_by_id(drive, file_id_to_download, processed_csv_path)
                                    print(f"Downloaded MasterTrackingBoard.csv to {processed_csv_path}")
                                else:
                                    print("Error: MasterTrackingBoard.csv not found in the specified Google Drive folder.")
                                    input("\nPress ENTER to continue...")
                                    continue
                            else:
                                print("Error: Could not extract file or folder ID from the Google Drive link.")
                                input("\nPress ENTER to continue...")
                                continue
                        else:
                            print("Error: Failed to authenticate with Google Drive.")
                            input("\nPress ENTER to continue...")
                            continue
                    except Exception as e:
                        print(f"Error processing Google Drive link: {e}")
                        input("\nPress ENTER to continue...")
                        continue
                else:
                    processed_csv_path = csv_path_input

                # Step 1: AI Processing
                if processed_csv_path and os.path.exists(processed_csv_path):
                    print(f"\n--- STEP 1: AI PROCESSING ---")
                    print(f"Using AI agent: {current_ai_agent.upper()}")
                    proc = JobProcessor(jids, folder, processed_csv_path, ai_agent=current_ai_agent, api_key=None)
                    ai_output_file = proc.run()
                    print("[OK] AI processing completed")
        
                    if ai_output_file:
                        print(f"AI output saved to: {ai_output_file}")
                    else:
                        print("Warning: No AI output file generated")

                    # Step 2: Field Corrections
                    print(f"\n--- STEP 2: FIELD CORRECTIONS ---")
                    potential_json_paths = [
                        f"{folder}/jobs_{current_date}_optimized.json",
                        f"output/jobs_{current_date}_optimized.json",
                        f"{folder}/output/jobs_{current_date}_optimized.json"
                    ]

                    input_json_file = None
                    print("Looking for AI-processed JSON file...")
                    for potential_path in potential_json_paths:
                        print(f"  Checking: {potential_path}")
                        if os.path.exists(potential_path):
                            input_json_file = potential_path
                            print(f"  [OK] Found: {potential_path}")
                            break
                        else:
                            print(f"  ✗ Not found: {potential_path}")

                    if input_json_file:
                        try:
                            # Create final optimized file with date in title (use local output folder)
                            current_date = datetime.now().strftime("%Y%m%d")
                            final_filename = f"jobs_{current_date}_final_optimized.json"
                            final_output_path = rf"output\{final_filename}"

                            # Move the AI-processed file to final location (no copy to synced folder)
                            import shutil
                            shutil.move(input_json_file, final_output_path)

                            optimizer = FinalOptimizer(final_output_path)
                            optimizer.run_optimization()
                            print("[OK] Field corrections completed")
                            print(f"SUCCESS: Optimized & complete JSON saved to: {final_output_path}")

                            # Clean up intermediate files in n8n folder
                            n8n_folder = r"g:\My Drive\n8n"
                            if os.path.exists(n8n_folder):
                                for filename in os.listdir(n8n_folder):
                                    if filename.startswith("jobs_") and filename.endswith(".json") and filename != final_filename:
                                        try:
                                            os.remove(os.path.join(n8n_folder, filename))
                                            print(f"Cleaned up intermediate file: {filename}")
                                        except Exception as e:
                                            print(f"Warning: Could not remove {filename}: {e}")

                            # Upload the optimized JSON to Google Drive
                            try:
                                drive = authenticate_drive()
                                if drive:
                                    # Get the Google Drive folder ID from config
                                    folder_id = config.GDRIVE_FOLDER_ID

                                    # Create file metadata for the optimized JSON
                                    json_filename = final_filename
                                    file_metadata = {
                                        'title': json_filename,
                                        'parents': [{'id': folder_id}]
                                    }

                                    # Check for existing files with same name and delete them
                                    print(f"[UPLOAD] Checking for existing files with name '{final_filename}'...")
                                    query = f"title = '{final_filename}' and '{folder_id}' in parents and trashed = false"
                                    existing_files = drive.ListFile({'q': query}).GetList()

                                    if existing_files:
                                        print(f"[UPLOAD] Found {len(existing_files)} existing file(s) with same name. Deleting...")
                                        for existing_file in existing_files:
                                            try:
                                                existing_file.Delete()
                                                print(f"[UPLOAD] Deleted existing file: {existing_file['title']}")
                                            except Exception as e:
                                                print(f"[UPLOAD] Warning: Could not delete existing file {existing_file['title']}: {e}")

                                    print(f"[UPLOAD] Creating new file on Google Drive...")
                                    # Create the file and upload
                                    file = drive.CreateFile(file_metadata)
                                    file.SetContentFile(final_output_path)
                                    print(f"[UPLOAD] Uploading file content...")
                                    file.Upload()

                                    # Show the Google Drive folder URL
                                    drive_url = f"https://drive.google.com/drive/folders/{folder_id}"
                                    print(f"[UPLOAD] ✅ SUCCESS: {final_filename} uploaded to Google Drive")
                                    print(f"[UPLOAD] 📁 Google Drive folder URL: {drive_url}")
                                    print(f"[UPLOAD] 🎯 File is ready for resume matching!")
                                else:
                                    print("Failed to authenticate with Google Drive for JSON upload")
                            except Exception as e:
                                print(f"Error uploading optimized JSON to Google Drive: {e}")

                        except (FileNotFoundError, ValueError, KeyError) as e:
                            print(f"✗ Error during field corrections: {e}")
                    else:
                        print("✗ Could not find AI-processed JSON file for corrections")
                else:
                    print(f"Error: CSV file not found at {processed_csv_path}")
            elif choice == '10':
                print("Launching AI Resume-to-Job Matching module...")
                try:
                    # Ensure drive is authenticated before launching
                    drive = authenticate_drive()
                    if not drive:
                        print("Could not authenticate with Google Drive. Aborting.")
                        continue
                    
                    from modules.ai_resume_matcher_unified import main as resume_matcher_main
                    # Pass the authenticated drive object to the matcher
                    resume_matcher_main(drive_service=drive)
                except ImportError:
                     print("Error: The 'ai_resume_matcher_unified.py' script could not be imported.")
                except Exception as e:
                    print(f"An unexpected error occurred while running the resume matcher: {e}")
            else:
                print("Invalid choice. Please enter a number between 0 and 10.")
        except Exception as e:
            print(f"An error occurred: {e}")
        input("\nPress ENTER to continue...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nInterrupted by user.")
