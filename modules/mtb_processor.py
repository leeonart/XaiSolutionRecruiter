import pandas as pd
import time
from typing import List
from .salary_parser import SalaryParser

def safe_parse_comma_separated(value: str) -> List[str]:
    """
    Safely parse comma-separated values, handling cases where individual values might contain commas.
    
    This function uses a simple approach: if the value contains commas, it splits by comma.
    For more complex cases where individual values contain commas, a different delimiter
    should be used in the frontend (like |||) and converted to comma-separated before
    sending to the backend.
    
    Args:
        value (str): Comma-separated string of values
        
    Returns:
        List[str]: List of parsed values
    """
    if not value or value.upper() == "ALL":
        return []
    
    # Split by comma and strip whitespace
    values = [v.strip() for v in value.split(',') if v.strip()]
    return values

def master_tracking_board_activities(csv_path: str, cat: str = "ALL", state: str = "ALL", client_rating: str = "ALL", 
                                   company: str = "ALL", position: str = "ALL", city: str = "ALL", 
                                   country: str = "ALL", industry_segment: str = "ALL", bonus: str = "ALL",
                                   received_date: str = "ALL", conditional_fee: str = "ALL", internal: str = "ALL",
                                   visa: str = "ALL", hr_hm: str = "ALL", cm: str = "ALL", 
                                   pipeline_number: str = "ALL", pipeline_candidates: str = "ALL", notes: str = "ALL",
                                   salary_min: str = "ALL", salary_max: str = "ALL", 
                                   include_exc_jobs: bool = False, include_period_jobs: bool = False,
                                   extract_job_ids: bool = False) -> List[str]:
    """
    Process the Master Tracking Board CSV file and filter jobs based on specified criteria.
    This function handles both local CSV files and Google Sheets URLs, downloading data as needed.
    It applies filters for various criteria to narrow down the list of jobs.
    Optionally, it extracts job IDs and saves filtered data to files for further processing.
    
    Special handling for job IDs with decimal suffixes (.1, .2, .3, etc.):
    - By default, excludes job IDs with decimal suffixes when include_period_jobs=False
    - However, if the base job ID (without decimal) doesn't exist in the dataset,
      the decimal version will be kept even when include_period_jobs=False
    - Example: If job IDs 8475.1 and 8665.1 exist but 8475 and 8665 don't exist,
      then 8475.1 and 8665.1 will be included in the results
    
    Args:
        csv_path (str): Path to the local CSV file or a Google Sheets/Drive URL to download the data from.
        cat (str): Category filter; can be a single category, comma-separated list for multiple, or 'ALL' to include all categories.
        state (str): State filter; can be a single state, comma-separated list for multiple, or 'ALL' to include all states.
        client_rating (str): Client Rating filter; can be a single rating, comma-separated list for multiple, or 'ALL' to include all ratings.
        company (str): Company filter; can be a single company, comma-separated list for multiple, or 'ALL' to include all companies.
        position (str): Position filter; can be a single position, comma-separated list for multiple, or 'ALL' to include all positions.
        city (str): City filter; can be a single city, comma-separated list for multiple, or 'ALL' to include all cities.
        salary_min (str): Minimum salary filter; can be a number or 'ALL' to include all salaries.
        salary_max (str): Maximum salary filter; can be a number or 'ALL' to include all salaries.
        include_period_jobs (bool): If True, includes all job IDs with decimal suffixes (.1, .2, .3, etc.).
                                   If False, excludes duplicates but keeps decimal versions when base job ID doesn't exist.
        extract_job_ids (bool, optional): If True, extracts and returns job IDs from the filtered data. Defaults to False.
        
    Returns:
        List[str]: List of job IDs if extract_job_ids is True, otherwise an empty list.
    """
    try:
        # Load the CSV file
        import re
        import os
        import tempfile
        from modules.gdrive_operations import authenticate_drive

        if 'docs.google.com/spreadsheets' in csv_path:
            # Extract the sheet ID from the URL
            sheet_id_match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', csv_path)
            if not sheet_id_match:
                raise Exception("Invalid Google Sheets URL format")
            
            sheet_id = sheet_id_match.group(1)
            
            # Use Google Drive API to download the file as Excel
            drive = authenticate_drive()
            if not drive:
                raise Exception("Failed to authenticate with Google Drive")
            
            print(f"Downloading Google Sheet with ID: {sheet_id}")
            
            # Create a temporary file to store the downloaded sheet
            temp_file = os.path.join(tempfile.gettempdir(), f"sheet_{sheet_id}.xlsx")
            
            try:
                # Get the file using Drive API
                file_obj = drive.CreateFile({'id': sheet_id})
                file_obj.GetContentFile(temp_file, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                
                # Read the Excel file with pandas, using the first row as header
                df = pd.read_excel(temp_file, dtype=str, header=1)
                
                # Clean up the temporary file
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                print(f"Error downloading sheet: {e}")
                
                # Try alternative method with direct authentication
                try:
                    print("Trying alternative authentication method...")
                    try:
                        import gspread
                        from oauth2client.service_account import ServiceAccountCredentials
                    except ImportError:
                        print("Required packages not found. Installing gspread and oauth2client...")
                        import subprocess
                        import sys
                        subprocess.check_call([sys.executable, "-m", "pip", "install", "gspread", "oauth2client", "openpyxl"])
                        import gspread
                        from oauth2client.service_account import ServiceAccountCredentials
                    
                    # Check if client_secrets.json exists
                    if not os.path.exists('credentials/client_secrets.json'):
                        raise Exception("credentials/client_secrets.json not found. Please ensure this file exists.")
                    
                    # Use the client_secrets.json file for authentication
                    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
                    creds = ServiceAccountCredentials.from_json_keyfile_name('credentials/client_secrets.json', scope)
                    client = gspread.authorize(creds)
                    
                    # Open the spreadsheet and get the first worksheet
                    sheet = client.open_by_key(sheet_id).sheet1
                    data = sheet.get_all_values()
                    
                    # Convert to DataFrame, using row 0 (index 0) as header
                    df = pd.DataFrame(data[1:], columns=data[0])  # Use first row as header
                except Exception as e2:
                    # Try one last method - direct download as CSV
                    try:
                        print("Trying direct CSV download...")
                        import requests
                        
                        # Try with direct download link that might work for some shared sheets
                        export_url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv'
                        response = requests.get(export_url)
                        
                        if response.status_code == 200:
                            import io
                            # Use header=0 to indicate that the first row contains the column names
                            df = pd.read_csv(io.StringIO(response.text), dtype=str, header=0)
                        else:
                            raise Exception(f"HTTP {response.status_code}")
                    except Exception as e3:
                        raise Exception(f"All authentication methods failed. Please ensure you have access to the sheet and required packages are installed. Errors: 1) {e}, 2) {e2}, 3) {e3}")
        else:
            # Use header=0 to indicate that the first row contains the column names
            try:
                df = pd.read_csv(csv_path, dtype=str, on_bad_lines='skip', delimiter=',', header=0)
            except TypeError:
                # Fallback for older pandas versions that don't support on_bad_lines
                df = pd.read_csv(csv_path, dtype=str, delimiter=',', header=0)
        print(f"Processing file: {csv_path}")
        print(f"Columns found: {df.columns.tolist()}")
        print(f"Columns found: {df.columns.tolist()}")
        
        # Apply filters
        # Category filter
        if cat and cat.upper() != "ALL":
            # Use 'CAT' column instead of 'Category'
            if 'CAT' in df.columns:
                # Handle multiple comma-separated categories using safe parsing
                cat_values = safe_parse_comma_separated(cat)
                print(f"Filtering by CAT values: {cat_values}")
                
                if cat_values:
                    # Create a filter for each category value (OR condition) - use exact matching
                    cat_filter = df['CAT'].str.strip().str.lower() == cat_values[0].lower()
                    for cat_val in cat_values[1:]:
                        cat_filter = cat_filter | (df['CAT'].str.strip().str.lower() == cat_val.lower())
                    
                    df = df[cat_filter]
                    print(f"After CAT filter: {len(df)} rows remaining")
            else:
                print("Warning: 'CAT' column not found in the sheet")
        
        # State filter (renamed from Location)
        if state and state.upper() != "ALL":
            if 'State' in df.columns:
                # Handle multiple comma-separated states using safe parsing
                state_values = safe_parse_comma_separated(state)
                print(f"Filtering by State values: {state_values}")
                
                if state_values:
                    # Create a filter for each state value (OR condition) - use exact matching
                    state_filter = df['State'].str.strip().str.lower() == state_values[0].lower()
                    for state_val in state_values[1:]:
                        state_filter = state_filter | (df['State'].str.strip().str.lower() == state_val.lower())
                    
                    df = df[state_filter]
                    print(f"After State filter: {len(df)} rows remaining")
            else:
                print("Warning: 'State' column not found in the sheet")
        
        # Client Rating filter (new)
        if client_rating and client_rating.upper() != "ALL":
            if 'Client Rating' in df.columns:
                # Handle multiple comma-separated client ratings using safe parsing
                rating_values = safe_parse_comma_separated(client_rating)
                print(f"Filtering by Client Rating values: {rating_values}")
                
                if rating_values:
                    # Create a filter for each client rating value (OR condition) - use exact matching
                    rating_filter = df['Client Rating'].str.strip().str.lower() == rating_values[0].lower()
                    for rating_val in rating_values[1:]:
                        rating_filter = rating_filter | (df['Client Rating'].str.strip().str.lower() == rating_val.lower())
                    
                    df = df[rating_filter]
                    print(f"After Client Rating filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Client Rating' column not found in the sheet")
        
        # Company filter
        if company and company.upper() != "ALL":
            if 'Company' in df.columns:
                # Handle multiple comma-separated companies using safe parsing
                company_values = safe_parse_comma_separated(company)
                print(f"Filtering by Company values: {company_values}")
                
                if company_values:
                    # Create a filter for each company value (OR condition) - use partial matching for companies
                    company_filter = df['Company'].str.contains(company_values[0], case=False, na=False)
                    for company_val in company_values[1:]:
                        company_filter = company_filter | df['Company'].str.contains(company_val, case=False, na=False)
                    
                    df = df[company_filter]
                    print(f"After Company filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Company' column not found in the sheet")
        
        # Position filter
        if position and position.upper() != "ALL":
            if 'Position' in df.columns:
                # Handle multiple comma-separated positions using safe parsing
                position_values = safe_parse_comma_separated(position)
                print(f"Filtering by Position values: {position_values}")
                
                if position_values:
                    # Create a filter for each position value (OR condition) - use exact matching
                    position_filter = df['Position'].str.strip().str.lower() == position_values[0].lower()
                    for position_val in position_values[1:]:
                        position_filter = position_filter | (df['Position'].str.strip().str.lower() == position_val.lower())
                    
                    df = df[position_filter]
                    print(f"After Position filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Position' column not found in the sheet")
        
        # City filter
        if city and city.upper() != "ALL":
            if 'City' in df.columns:
                # Handle multiple comma-separated cities using safe parsing
                city_values = safe_parse_comma_separated(city)
                print(f"Filtering by City values: {city_values}")
                
                if city_values:
                    # Create a filter for each city value (OR condition) - use exact matching
                    city_filter = df['City'].str.strip().str.lower() == city_values[0].lower()
                    for city_val in city_values[1:]:
                        city_filter = city_filter | (df['City'].str.strip().str.lower() == city_val.lower())
                    
                    df = df[city_filter]
                    print(f"After City filter: {len(df)} rows remaining")
            else:
                print("Warning: 'City' column not found in the sheet")
        
        # Enhanced Salary range filter
        if (salary_min and salary_min.upper() != "ALL") or (salary_max and salary_max.upper() != "ALL"):
            if 'Salary' in df.columns:
                print(f"Filtering by Salary range: min={salary_min}, max={salary_max}")
                
                # Initialize enhanced salary parser
                salary_parser = SalaryParser()
                
                def parse_salary_enhanced(salary_str):
                    """Enhanced salary parsing using SalaryParser"""
                    if pd.isna(salary_str) or salary_str == '' or str(salary_str).upper() == 'ALL':
                        return None
                    
                    try:
                        parsed = salary_parser.parse_salary(str(salary_str))
                        return parsed
                    except Exception as e:
                        print(f"Warning: Error parsing salary '{salary_str}': {e}")
                        return None
                
                # Parse all salaries
                df['Salary_Parsed'] = df['Salary'].apply(parse_salary_enhanced)
                
                # Convert filter values to numeric
                filter_min = None
                filter_max = None
                
                if salary_min and salary_min.upper() != "ALL":
                    try:
                        filter_min = float(salary_min)
                    except ValueError:
                        print(f"Warning: Invalid salary_min value: {salary_min}")
                
                if salary_max and salary_max.upper() != "ALL":
                    try:
                        filter_max = float(salary_max)
                    except ValueError:
                        print(f"Warning: Invalid salary_max value: {salary_max}")
                
                # Apply enhanced salary filtering
                def matches_salary_filter(parsed_salary):
                    """Check if parsed salary matches filter criteria"""
                    if parsed_salary is None:
                        # If no salary info and we have a minimum filter, exclude the job
                        if filter_min is not None:
                            return False
                        # If no salary info and we have a maximum filter, exclude the job  
                        if filter_max is not None:
                            return False
                        # If no filters, include the job
                        return True
                    
                    job_min = parsed_salary.get('min')
                    job_max = parsed_salary.get('max')
                    job_has_plus = parsed_salary.get('has_plus', False)
                    job_is_max = parsed_salary.get('is_max', False)
                    
                    # If no salary info available, exclude when filters are applied
                    if job_min is None and job_max is None:
                        if filter_min is not None or filter_max is not None:
                            return False
                        return True
                    
                    # Check minimum filter
                    if filter_min is not None:
                        # If job has a maximum cap and it's below our minimum, exclude
                        if job_is_max and job_max and job_max < filter_min:
                            return False
                        # If job minimum is below our requirement, exclude
                        if job_min and job_min < filter_min:
                            return False
                        # If job has no minimum but has maximum below our requirement, exclude
                        if not job_min and job_max and job_max < filter_min:
                            return False
                    
                    # Check maximum filter
                    if filter_max is not None:
                        # If job minimum exceeds our maximum, exclude
                        if job_min and job_min > filter_max:
                            return False
                        # If job maximum exceeds our maximum, exclude
                        if job_max and job_max > filter_max:
                            return False
                    
                    return True
                
                # Apply the filter
                df = df[df['Salary_Parsed'].apply(matches_salary_filter)]
                print(f"After enhanced Salary filter: {len(df)} rows remaining")
                
                # Drop the temporary parsed column
                df = df.drop('Salary_Parsed', axis=1)
            else:
                print("Warning: 'Salary' column not found in the sheet")
        
        # Country filter
        if country and country.upper() != "ALL":
            if 'Country' in df.columns:
                country_values = safe_parse_comma_separated(country)
                print(f"Filtering by Country values: {country_values}")
                if country_values:
                    country_filter = df['Country'].str.strip().str.lower() == country_values[0].lower()
                    for country_val in country_values[1:]:
                        country_filter = country_filter | (df['Country'].str.strip().str.lower() == country_val.lower())
                    df = df[country_filter]
                    print(f"After Country filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Country' column not found in the sheet")
        
        # Industry/Segment filter
        if industry_segment and industry_segment.upper() != "ALL":
            if 'Industry/Segment' in df.columns:
                industry_values = safe_parse_comma_separated(industry_segment)
                print(f"Filtering by Industry/Segment values: {industry_values}")
                if industry_values:
                    industry_filter = df['Industry/Segment'].str.strip().str.lower() == industry_values[0].lower()
                    for industry_val in industry_values[1:]:
                        industry_filter = industry_filter | (df['Industry/Segment'].str.strip().str.lower() == industry_val.lower())
                    df = df[industry_filter]
                    print(f"After Industry/Segment filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Industry/Segment' column not found in the sheet")
        
        # Bonus filter
        if bonus and bonus.upper() != "ALL":
            if 'Bonus' in df.columns:
                bonus_values = safe_parse_comma_separated(bonus)
                print(f"Filtering by Bonus values: {bonus_values}")
                if bonus_values:
                    bonus_filter = df['Bonus'].str.strip().str.lower() == bonus_values[0].lower()
                    for bonus_val in bonus_values[1:]:
                        bonus_filter = bonus_filter | (df['Bonus'].str.strip().str.lower() == bonus_val.lower())
                    df = df[bonus_filter]
                    print(f"After Bonus filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Bonus' column not found in the sheet")
        
        # Received Date filter
        if received_date and received_date.upper() != "ALL":
            if 'Received (m/d/y)' in df.columns:
                received_values = safe_parse_comma_separated(received_date)
                print(f"Filtering by Received Date values: {received_values}")
                if received_values:
                    received_filter = df['Received (m/d/y)'].str.contains(received_values[0], case=False, na=False)
                    for received_val in received_values[1:]:
                        received_filter = received_filter | df['Received (m/d/y)'].str.contains(received_val, case=False, na=False)
                    df = df[received_filter]
                    print(f"After Received Date filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Received (m/d/y)' column not found in the sheet")
        
        # Conditional Fee filter
        if conditional_fee and conditional_fee.upper() != "ALL":
            if 'Conditional Fee' in df.columns:
                fee_values = safe_parse_comma_separated(conditional_fee)
                print(f"Filtering by Conditional Fee values: {fee_values}")
                if fee_values:
                    fee_filter = df['Conditional Fee'].str.strip().str.lower() == fee_values[0].lower()
                    for fee_val in fee_values[1:]:
                        fee_filter = fee_filter | (df['Conditional Fee'].str.strip().str.lower() == fee_val.lower())
                    df = df[fee_filter]
                    print(f"After Conditional Fee filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Conditional Fee' column not found in the sheet")
        
        # Internal filter
        if internal and internal.upper() != "ALL":
            if 'Internal' in df.columns:
                internal_values = safe_parse_comma_separated(internal)
                print(f"Filtering by Internal values: {internal_values}")
                if internal_values:
                    internal_filter = df['Internal'].str.strip().str.lower() == internal_values[0].lower()
                    for internal_val in internal_values[1:]:
                        internal_filter = internal_filter | (df['Internal'].str.strip().str.lower() == internal_val.lower())
                    df = df[internal_filter]
                    print(f"After Internal filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Internal' column not found in the sheet")
        
        # Visa filter
        if visa and visa.upper() != "ALL":
            if 'Visa' in df.columns:
                visa_values = safe_parse_comma_separated(visa)
                print(f"Filtering by Visa values: {visa_values}")
                if visa_values:
                    visa_filter = df['Visa'].str.strip().str.lower() == visa_values[0].lower()
                    for visa_val in visa_values[1:]:
                        visa_filter = visa_filter | (df['Visa'].str.strip().str.lower() == visa_val.lower())
                    df = df[visa_filter]
                    print(f"After Visa filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Visa' column not found in the sheet")
        
        # HR/HM filter
        if hr_hm and hr_hm.upper() != "ALL":
            if 'HR/HM' in df.columns:
                hr_values = safe_parse_comma_separated(hr_hm)
                print(f"Filtering by HR/HM values: {hr_values}")
                if hr_values:
                    hr_filter = df['HR/HM'].str.contains(hr_values[0], case=False, na=False)
                    for hr_val in hr_values[1:]:
                        hr_filter = hr_filter | df['HR/HM'].str.contains(hr_val, case=False, na=False)
                    df = df[hr_filter]
                    print(f"After HR/HM filter: {len(df)} rows remaining")
            else:
                print("Warning: 'HR/HM' column not found in the sheet")
        
        # CM filter
        if cm and cm.upper() != "ALL":
            if 'CM' in df.columns:
                cm_values = safe_parse_comma_separated(cm)
                print(f"Filtering by CM values: {cm_values}")
                if cm_values:
                    cm_filter = df['CM'].str.strip().str.lower() == cm_values[0].lower()
                    for cm_val in cm_values[1:]:
                        cm_filter = cm_filter | (df['CM'].str.strip().str.lower() == cm_val.lower())
                    df = df[cm_filter]
                    print(f"After CM filter: {len(df)} rows remaining")
            else:
                print("Warning: 'CM' column not found in the sheet")
        
        # Pipeline # filter
        if pipeline_number and pipeline_number.upper() != "ALL":
            if 'Pipeline #' in df.columns:
                pipeline_values = safe_parse_comma_separated(pipeline_number)
                print(f"Filtering by Pipeline # values: {pipeline_values}")
                if pipeline_values:
                    pipeline_filter = df['Pipeline #'].str.strip().str.lower() == pipeline_values[0].lower()
                    for pipeline_val in pipeline_values[1:]:
                        pipeline_filter = pipeline_filter | (df['Pipeline #'].str.strip().str.lower() == pipeline_val.lower())
                    df = df[pipeline_filter]
                    print(f"After Pipeline # filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Pipeline #' column not found in the sheet")
        
        # Pipeline Candidates filter
        if pipeline_candidates and pipeline_candidates.upper() != "ALL":
            if 'Pipeline Candidates' in df.columns:
                candidates_values = safe_parse_comma_separated(pipeline_candidates)
                print(f"Filtering by Pipeline Candidates values: {candidates_values}")
                if candidates_values:
                    candidates_filter = df['Pipeline Candidates'].str.contains(candidates_values[0], case=False, na=False)
                    for candidates_val in candidates_values[1:]:
                        candidates_filter = candidates_filter | df['Pipeline Candidates'].str.contains(candidates_val, case=False, na=False)
                    df = df[candidates_filter]
                    print(f"After Pipeline Candidates filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Pipeline Candidates' column not found in the sheet")
        
        # Notes filter
        if notes and notes.upper() != "ALL":
            if 'Notes' in df.columns:
                notes_values = safe_parse_comma_separated(notes)
                print(f"Filtering by Notes values: {notes_values}")
                if notes_values:
                    notes_filter = df['Notes'].str.contains(notes_values[0], case=False, na=False)
                    for notes_val in notes_values[1:]:
                        notes_filter = notes_filter | df['Notes'].str.contains(notes_val, case=False, na=False)
                    df = df[notes_filter]
                    print(f"After Notes filter: {len(df)} rows remaining")
            else:
                print("Warning: 'Notes' column not found in the sheet")
        
        # Extract job IDs - first column is JobID (as per user feedback)
        print(f"Column names: {df.columns.tolist()}")
        
        # Check if JobID column exists, otherwise use the first column
        if 'JobID' in df.columns:
            job_id_column = 'JobID'
        else:
            # Use the first column as JobID
            job_id_column = df.columns[0]
            print(f"Using first column '{job_id_column}' as JobID column")
        
        # Check if any filters were applied (not all "ALL")
        filters_applied = any([
            cat and cat.upper() != "ALL",
            state and state.upper() != "ALL", 
            client_rating and client_rating.upper() != "ALL",
            company and company.upper() != "ALL",
            position and position.upper() != "ALL",
            city and city.upper() != "ALL",
            country and country.upper() != "ALL",
            industry_segment and industry_segment.upper() != "ALL",
            bonus and bonus.upper() != "ALL",
            received_date and received_date.upper() != "ALL",
            conditional_fee and conditional_fee.upper() != "ALL",
            internal and internal.upper() != "ALL",
            visa and visa.upper() != "ALL",
            hr_hm and hr_hm.upper() != "ALL",
            cm and cm.upper() != "ALL",
            pipeline_number and pipeline_number.upper() != "ALL",
            pipeline_candidates and pipeline_candidates.upper() != "ALL",
            notes and notes.upper() != "ALL",
            (salary_min and salary_min.upper() != "ALL") or (salary_max and salary_max.upper() != "ALL")
        ])
        
        # Apply default exclusions unless user explicitly includes them
        print("Applying default exclusion rules:")
        
        # Exclude job IDs where CM column contains 'exc' (case-insensitive) unless user includes them
        if not include_exc_jobs:
            try:
                if 'CM' in df.columns:
                    cm_exec_mask = df['CM'].str.contains('exc', case=False, na=False)
                    excluded_due_to_cm = df.loc[cm_exec_mask, job_id_column].dropna().unique().tolist()
                    if excluded_due_to_cm:
                        print(f"Excluding {len(excluded_due_to_cm)} job IDs due to 'exc' in CM: {', '.join(map(str, excluded_due_to_cm))}")
                    df = df.loc[~cm_exec_mask].copy()
                else:
                    print("No CM column found - skipping 'exc' exclusion")
            except Exception as e:
                print(f"Warning: Failed to apply CM 'exc' exclusion: {e}")
        else:
            print("User requested to include 'exc' jobs - keeping all CM entries")
        
        # Handle job IDs with decimal suffixes (.1, .2, .3, etc.)
        if not include_period_jobs:
            try:
                # First, get all job IDs to check for base versions
                all_job_ids = df[job_id_column].dropna().unique().tolist()
                
                # Find job IDs with periods that are NOT .0 (these are duplicates)
                period_mask = df[job_id_column].astype(str).str.contains(r'\.(?!0$)', regex=True, na=False)
                decimal_job_ids = df.loc[period_mask, job_id_column].dropna().unique().tolist()
                
                if decimal_job_ids:
                    print(f"Found {len(decimal_job_ids)} job IDs with decimal suffixes: {', '.join(map(str, decimal_job_ids))}")
                    
                    # Check which decimal job IDs should be kept (when base job ID doesn't exist)
                    job_ids_to_keep = []
                    job_ids_to_exclude = []
                    
                    for decimal_job_id in decimal_job_ids:
                        # Extract base job ID (remove decimal part)
                        base_job_id = str(decimal_job_id).split('.')[0]
                        
                        # Check if base job ID exists in the dataset
                        base_exists = any(str(jid).split('.')[0] == base_job_id for jid in all_job_ids if str(jid) != str(decimal_job_id))
                        
                        if base_exists:
                            job_ids_to_exclude.append(decimal_job_id)
                        else:
                            job_ids_to_keep.append(decimal_job_id)
                            print(f"Keeping {decimal_job_id} because base job ID {base_job_id} doesn't exist")
                    
                    # Exclude only the decimal job IDs where base exists
                    if job_ids_to_exclude:
                        exclude_mask = df[job_id_column].astype(str).isin([str(jid) for jid in job_ids_to_exclude])
                        df = df.loc[~exclude_mask].copy()
                        print(f"Excluding {len(job_ids_to_exclude)} duplicate job IDs where base exists: {', '.join(map(str, job_ids_to_exclude))}")
                    
                    if job_ids_to_keep:
                        print(f"Keeping {len(job_ids_to_keep)} decimal job IDs where base doesn't exist: {', '.join(map(str, job_ids_to_keep))}")
                        
            except Exception as e:
                print(f"Warning: Failed to apply decimal job ID logic: {e}")
                # Fallback to original behavior if there's an error
                try:
                    period_mask = df[job_id_column].astype(str).str.contains(r'\.(?!0$)', regex=True, na=False)
                    excluded_duplicates = df.loc[period_mask, job_id_column].dropna().unique().tolist()
                    if excluded_duplicates:
                        print(f"Fallback: Excluding {len(excluded_duplicates)} duplicate job IDs (.1, .2, .3, etc.): {', '.join(map(str, excluded_duplicates))}")
                    df = df.loc[~period_mask].copy()
                except Exception as fallback_error:
                    print(f"Warning: Fallback duplicate exclusion also failed: {fallback_error}")
        else:
            print("User requested to include all period jobs - keeping duplicates")
        
        print("Job IDs with .0 will be cleaned (e.g., 7430.0 -> 7430)")
        
        # Get all job IDs and clean them (remove decimals, deduplicate)
        job_ids = df[job_id_column].dropna().unique().tolist()
        
        # Clean job IDs: handle decimal formatting intelligently
        # - Convert .0 to integer (e.g., 7430.0 -> 7430)
        # - Keep .1, .2, .3, etc. as-is if they were kept in the filtering above
        cleaned_job_ids = []
        for job_id in job_ids:
            try:
                job_id_str = str(job_id)
                # If it ends with .0, convert to integer to remove the .0
                if job_id_str.endswith('.0'):
                    int_job_id = int(float(job_id_str))
                    cleaned_job_ids.append(str(int_job_id))
                else:
                    # Keep other decimal suffixes (.1, .2, .3, etc.) as-is
                    cleaned_job_ids.append(job_id_str)
            except (ValueError, TypeError):
                # If conversion fails, use as string
                cleaned_job_ids.append(str(job_id))
        
        # Remove duplicates while preserving order
        seen = set()
        filtered_job_ids = []
        for job_id in cleaned_job_ids:
            if job_id not in seen:
                seen.add(job_id)
                filtered_job_ids.append(job_id)
        
        print(f"Found {len(filtered_job_ids)} unique job IDs after cleaning and deduplication")
        
        # Job IDs are already strings and deduplicated
        str_job_ids = filtered_job_ids
        
        # Save filtered DataFrame to CSV if requested
        if extract_job_ids:
            try:
                # Filter DataFrame to only include rows with the filtered job IDs
                filtered_df = df[df[job_id_column].isin(filtered_job_ids)]
                
                # Reset the index to ensure proper row ordering
                filtered_df = filtered_df.reset_index(drop=True)
                
                # Rename columns as requested
                filtered_df = filtered_df.rename(columns={
                    job_id_column: 'JobID',
                    'Company.1': 'Internal'
                })
                
                # Create timestamped filenames for fresh files each time
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"MasterTrackingBoard_{timestamp}.csv"
                cat_filename = f"jobids_{timestamp}.txt"
                print(f"Saving filtered data to {filename} and job IDs to {cat_filename}")
                
                # Get the Google Drive folder ID
                folder_id = "1h_tR64KptPn3UC1t4ytufyUYHOls71du"  # From the user's request
                
                # Create data directory structure
                data_dir = os.getenv("DATA_DIR", "/app/data")
                mtb_dir = os.path.join(data_dir, "MTB")
                archive_dir = os.path.join(data_dir, "MTB", "archive")
                
                # Ensure directories exist
                os.makedirs(mtb_dir, exist_ok=True)
                os.makedirs(archive_dir, exist_ok=True)
                
                # Archive old files if they exist
                old_csv = os.path.join(mtb_dir, "MasterTrackingBoard.csv")
                old_txt = os.path.join(mtb_dir, "jobidlist.txt")
                
                if os.path.exists(old_csv):
                    archive_csv = os.path.join(archive_dir, f"MasterTrackingBoard_{datetime.now().strftime('%Y%m%d_%H%M%S')}_archived.csv")
                    os.rename(old_csv, archive_csv)
                    print(f"Archived old CSV to: {archive_csv}")
                
                if os.path.exists(old_txt):
                    archive_txt = os.path.join(archive_dir, f"jobidlist_{datetime.now().strftime('%Y%m%d_%H%M%S')}_archived.txt")
                    os.rename(old_txt, archive_txt)
                    print(f"Archived old TXT to: {archive_txt}")
                
                # Create temporary files and organized local copies
                temp_csv = os.path.join(tempfile.gettempdir(), filename)
                temp_txt = os.path.join(tempfile.gettempdir(), cat_filename)
                
                # Save to organized data structure
                local_csv = os.path.join(mtb_dir, "MasterTrackingBoard.csv")  # Current active file
                local_txt = os.path.join(mtb_dir, "jobidlist.txt")  # Current active file
                timestamped_csv = os.path.join(mtb_dir, filename)  # Timestamped copy
                timestamped_txt = os.path.join(mtb_dir, cat_filename)  # Timestamped copy
                
                # Keep only columns up to and including the Notes column
                all_columns = filtered_df.columns.tolist()
                notes_index = all_columns.index('Notes') if 'Notes' in all_columns else -1
                
                if notes_index > 0:
                    # Keep columns up to and including Notes
                    keep_columns = all_columns[:notes_index + 1]
                    filtered_df = filtered_df[keep_columns]
                    print(f"Keeping columns up to and including Notes: {keep_columns}")
                
                # Handle Visa column values
                # For the Visa column, mark all NaN, None, or NONE values as "None"
                if 'Visa' in filtered_df.columns:
                    # Fill NaN values with "None"
                    filtered_df['Visa'] = filtered_df['Visa'].fillna('None')
                    
                    # Replace string "None" and "NONE" with "None" (standardize case)
                    filtered_df['Visa'] = filtered_df['Visa'].replace(['None', 'NONE'], 'None')
                
                # Save the filtered DataFrame to CSV (without the first row)
                try:
                    filtered_df.to_csv(temp_csv, index=False, encoding='utf-8')
                    print(f"Temporary CSV saved to: {temp_csv}")
                except Exception as e:
                    print(f"Error saving temporary CSV: {e}")
                
                # Save to organized data structure
                try:
                    filtered_df.to_csv(local_csv, index=False, encoding='utf-8')  # Current active file
                    print(f"Active CSV saved to: {os.path.abspath(local_csv)}")
                except Exception as e:
                    print(f"Error saving active CSV: {e}")
                
                try:
                    filtered_df.to_csv(timestamped_csv, index=False, encoding='utf-8')  # Timestamped copy
                    print(f"Timestamped CSV saved to: {os.path.abspath(timestamped_csv)}")
                except Exception as e:
                    print(f"Error saving timestamped CSV: {e}")
                
                # Save job IDs to text file as comma-delimited list with no spaces
                try:
                    with open(temp_txt, 'w') as f:
                        f.write(','.join(str_job_ids))
                    print(f"Temporary TXT saved to: {temp_txt}")
                except Exception as e:
                    print(f"Error saving temporary TXT: {e}")
                
                try:
                    with open(local_txt, 'w') as f:  # Current active file
                        f.write(','.join(str_job_ids))
                    print(f"Active TXT saved to: {os.path.abspath(local_txt)}")
                except Exception as e:
                    print(f"Error saving active TXT: {e}")
                
                try:
                    with open(timestamped_txt, 'w') as f:  # Timestamped copy
                        f.write(','.join(str_job_ids))
                    print(f"Timestamped TXT saved to: {os.path.abspath(timestamped_txt)}")
                except Exception as e:
                    print(f"Error saving timestamped TXT: {e}")
                
                print(f"Files organized under /app/data/MTB/ structure")
                
                # Only upload to Google Drive if the original input was a Google Sheets URL
                if 'docs.google.com/spreadsheets' in csv_path:
                    print("Original input was Google Sheets URL, uploading to Google Drive...")
                    # Upload the files to Google Drive
                    drive = authenticate_drive()
                    if drive:
                        # Upload CSV file
                        file_metadata = {
                            'title': filename,
                            'parents': [{'id': folder_id}]
                        }
                        file = drive.CreateFile(file_metadata)
                        file.SetContentFile(temp_csv)
                        file.Upload()
                        print(f"Successfully uploaded {filename} to Google Drive")
                        
                        # Upload TXT file
                        file_metadata = {
                            'title': cat_filename,
                            'parents': [{'id': folder_id}]
                        }
                        file = drive.CreateFile(file_metadata)
                        file.SetContentFile(temp_txt)
                        file.Upload()
                        print(f"Successfully uploaded {cat_filename} to Google Drive")
                    else:
                        print("Failed to authenticate with Google Drive for file upload")
                else:
                    print("Local file processing - skipping Google Drive upload")
                
                # Clean up temporary files with retry mechanism
                for temp_file in [temp_csv, temp_txt]:
                    if os.path.exists(temp_file):
                        max_retries = 3
                        for attempt in range(max_retries):
                            try:
                                os.remove(temp_file)
                                print(f"Successfully deleted temporary file: {temp_file}")
                                break
                            except Exception as e:
                                print(f"Error deleting {temp_file} (attempt {attempt + 1}/{max_retries}): {e}")
                                if attempt < max_retries - 1:
                                    time.sleep(1)  # Wait before retrying
                                else:
                                    print(f"Failed to delete {temp_file} after {max_retries} attempts. Continuing anyway.")
            except Exception as e:
                print(f"Error saving files to Google Drive: {e}")
        
        if extract_job_ids:
            return str_job_ids
        return []
        
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_path}")
        return []
    except Exception as e:
        print(f"Error processing MTB: {e}")
        return []
