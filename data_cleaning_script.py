#!/usr/bin/env python3
"""
Data Cleaning and Database Creation Script for Rollup Report CSV
This script cleans the CSV data and creates a PostgreSQL database with proper schema.
"""

import pandas as pd
import numpy as np
import re
import sqlite3
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clean_salary(salary_str):
    """Clean and standardize salary data"""
    if pd.isna(salary_str) or salary_str == '':
        return None
    
    # Convert to string and remove common currency symbols and text
    salary_str = str(salary_str).strip()
    
    # Remove currency symbols, commas, and parentheses
    salary_str = re.sub(r'[$,()]', '', salary_str)
    
    # Handle cases where multiple numbers are concatenated (like "110,000130,000")
    # Split by common delimiters and take the first reasonable number
    numbers = re.findall(r'(\d+(?:\.\d+)?)', salary_str)
    
    if numbers:
        # Filter out unrealistic salary values (too high or too low)
        valid_salaries = []
        for num in numbers:
            try:
                val = float(num)
                # Reasonable salary range: $20,000 to $500,000
                if 20000 <= val <= 500000:
                    valid_salaries.append(val)
            except ValueError:
                continue
        
        if valid_salaries:
            return valid_salaries[0]  # Return the first valid salary
    
    return None

def clean_phone(phone_str):
    """Clean and standardize phone numbers"""
    if pd.isna(phone_str) or phone_str == '':
        return None
    
    # Remove all non-digit characters except + at the beginning
    cleaned = re.sub(r'[^\d+]', '', str(phone_str))
    
    # Remove leading + if present and ensure proper length
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]
    
    # Return None if too short or too long
    if len(cleaned) < 10 or len(cleaned) > 15:
        return None
    
    return cleaned

def clean_email(email_str):
    """Clean and validate email addresses"""
    if pd.isna(email_str) or email_str == '':
        return None
    
    email_str = str(email_str).strip().lower()
    
    # Basic email validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if re.match(email_pattern, email_str):
        return email_str
    
    return None

def clean_date(date_str):
    """Clean and standardize date formats"""
    if pd.isna(date_str) or date_str == '':
        return None
    
    date_str = str(date_str).strip()
    
    # Common date formats to try
    date_formats = [
        '%m/%d/%Y %H:%M',
        '%m/%d/%Y',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d',
        '%d/%m/%Y',
        '%Y/%m/%d'
    ]
    
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    return None

def clean_text(text_str, max_length=500):
    """Clean text fields and limit length"""
    if pd.isna(text_str) or text_str == '':
        return None
    
    # Remove extra whitespace and newlines
    cleaned = re.sub(r'\s+', ' ', str(text_str).strip())
    
    # Limit length if specified
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length] + '...'
    
    return cleaned

def clean_csv_data(csv_path):
    """Main function to clean the CSV data"""
    logger.info(f"Loading CSV file: {csv_path}")
    
    # Read the CSV file
    df = pd.read_csv(csv_path, encoding='utf-8')
    logger.info(f"Loaded {len(df)} rows and {len(df.columns)} columns")
    
    # Clean column names
    df.columns = [col.strip() for col in df.columns]
    
    # Create a cleaned dataframe
    cleaned_df = pd.DataFrame()
    
    # Clean each column based on its expected data type
    for col in df.columns:
        logger.info(f"Cleaning column: {col}")
        if 'salary' in col.lower() or 'compensation' in col.lower():
            cleaned_df[col] = df[col].apply(clean_salary)
        elif 'phone' in col.lower() or 'cell' in col.lower():
            cleaned_df[col] = df[col].apply(clean_phone)
        elif 'email' in col.lower():
            cleaned_df[col] = df[col].apply(clean_email)
        elif 'date' in col.lower() and 'status' not in col.lower():
            cleaned_df[col] = df[col].apply(clean_date)
        elif col == 'Candidate Status':
            # For candidate status field specifically, just clean whitespace but don't limit length
            cleaned_df[col] = df[col].apply(lambda x: str(x).strip() if pd.notna(x) and str(x).strip() != '' else None)
        elif 'communication status' in col.lower():
            # For communication status, apply text cleaning
            cleaned_df[col] = df[col].apply(lambda x: clean_text(x, 200) if pd.notna(x) else None)
        elif 'name' in col.lower() or 'first' in col.lower() or 'last' in col.lower():
            cleaned_df[col] = df[col].apply(lambda x: clean_text(x, 100) if pd.notna(x) else None)
        elif 'notes' in col.lower() or 'description' in col.lower():
            cleaned_df[col] = df[col].apply(lambda x: clean_text(x, 1000) if pd.notna(x) else None)
        elif 'linkedin' in col.lower() or 'url' in col.lower():
            cleaned_df[col] = df[col].apply(lambda x: clean_text(x, 200) if pd.notna(x) else None)
        else:
            # For other columns, just clean text and limit length
            cleaned_df[col] = df[col].apply(lambda x: clean_text(x, 200) if pd.notna(x) else None)
    
    # Remove completely empty rows
    cleaned_df = cleaned_df.dropna(how='all')
    
    logger.info(f"Cleaned data: {len(cleaned_df)} rows remain")
    
    return cleaned_df

def create_database_schema(db_path, df):
    """Create SQLite database with proper schema"""
    logger.info(f"Creating database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Drop existing table if it exists
    cursor.execute("DROP TABLE IF EXISTS candidates")
    
    # Create column mapping for database-friendly names
    column_mapping = {
        'First Name': 'first_name',
        'Last Name': 'last_name',
        'Last Pos with interview': 'last_pos_with_interview',
        'Resume (Y/N)': 'resume_yn',
        'Whose Exc Cand': 'whose_exc_cand',
        'Exclusive Expires Date': 'exclusive_expires_date',
        'Email Address': 'email_address',
        'Notes': 'notes',
        'Candidate Status': 'candidate_status',
        'Date Entered': 'date_entered',
        'City/State': 'city_state',
        'Placed Start Date': 'placed_start_date',
        '1st Resume Received Date': 'first_resume_received_date',
        'Cell Phone': 'cell_phone',
        'Current Salary': 'current_salary',
        'Relocate': 'relocate',
        'Last Modified': 'last_modified',
        'Desired Salary': 'desired_salary',
        'BURN NOTICE': 'burn_notice',
        'Communication Status': 'communication_status',
        'LinkedIn (old database)': 'linkedin_old_database',
        'Social LinkedIn': 'social_linkedin',
        'Ethics Section': 'ethics_section',
        'Salary Note': 'salary_note',
        'Placed by': 'placed_by',
        'Degree': 'degree',
        'Last Req with Interview': 'last_req_with_interview',
        'Rollup Rank': 'rollup_rank',
        'Phone Extension': 'phone_extension',
        'Visa Info': 'visa_info',
        'Last Activity': 'last_activity',
        'Stage Code': 'stage_code',
        'Name': 'name',
        'Degree Type': 'degree_type',
        'Grad Year': 'grad_year',
        'Relocation Note': 'relocation_note',
        'All Cell Phone': 'all_cell_phone',
        'Recruiter': 'recruiter',
        'Desire Salary': 'desire_salary',
        'Visa Needed': 'visa_needed',
        'Email Address 2': 'email_address_2',
        'Email Address 3': 'email_address_3'
    }
    
    # Create full column mapping
    full_column_mapping = {}
    for col in df.columns:
        if col in column_mapping:
            full_column_mapping[col] = column_mapping[col]
        else:
            # Convert column name to database-friendly format
            db_col = col.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_')
            full_column_mapping[col] = db_col
    
    # Build CREATE TABLE statement dynamically
    create_table_sql = "CREATE TABLE candidates (\n"
    create_table_sql += "    id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
    
    for original_col, db_col in full_column_mapping.items():
        # Determine data type based on column name
        if 'salary' in original_col.lower():
            create_table_sql += f"    {db_col} REAL,\n"
        else:
            create_table_sql += f"    {db_col} TEXT,\n"
    
    create_table_sql += "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n"
    create_table_sql += "    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n"
    create_table_sql += ")"
    
    cursor.execute(create_table_sql)
    
    # Create indexes for better performance
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email_address)",
        "CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(candidate_status)",
        "CREATE INDEX IF NOT EXISTS idx_candidates_recruiter ON candidates(recruiter)",
        "CREATE INDEX IF NOT EXISTS idx_candidates_last_name ON candidates(last_name)",
        "CREATE INDEX IF NOT EXISTS idx_candidates_first_name ON candidates(first_name)"
    ]
    
    for index_sql in indexes:
        cursor.execute(index_sql)
    
    conn.commit()
    logger.info("Database schema created successfully")
    
    return conn, full_column_mapping

def import_cleaned_data(conn, df, full_column_mapping):
    """Import cleaned data into the database"""
    logger.info("Importing cleaned data into database")
    
    # Prepare data for insertion - use actual column names from the dataframe
    columns_to_insert = list(df.columns)
    
    # Prepare insert statement
    db_columns = list(full_column_mapping.values())
    placeholders = ', '.join(['?' for _ in db_columns])
    insert_sql = f"INSERT INTO candidates ({', '.join(db_columns)}) VALUES ({placeholders})"
    
    # Insert data in batches
    batch_size = 1000
    cursor = conn.cursor()
    
    for i in range(0, len(df), batch_size):
        batch_df = df.iloc[i:i+batch_size]
        batch_data = []
        
        for _, row in batch_df.iterrows():
            row_data = []
            for col in columns_to_insert:
                row_data.append(row[col])
            batch_data.append(row_data)
        
        cursor.executemany(insert_sql, batch_data)
        conn.commit()
        logger.info(f"Inserted batch {i//batch_size + 1}: rows {i+1} to {min(i+batch_size, len(df))}")
    
    logger.info(f"Successfully imported {len(df)} records into database")

def generate_data_summary(conn):
    """Generate a summary of the imported data"""
    logger.info("Generating data summary")
    
    cursor = conn.cursor()
    
    # Get basic statistics
    cursor.execute("SELECT COUNT(*) FROM candidates")
    total_records = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT email_address) FROM candidates WHERE email_address IS NOT NULL")
    unique_emails = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT recruiter) FROM candidates WHERE recruiter IS NOT NULL")
    unique_recruiters = cursor.fetchone()[0]
    
    cursor.execute("SELECT candidate_status, COUNT(*) FROM candidates GROUP BY candidate_status")
    status_counts = cursor.fetchall()
    
    cursor.execute("SELECT AVG(current_salary) FROM candidates WHERE current_salary IS NOT NULL")
    avg_salary = cursor.fetchone()[0]
    
    summary = {
        'total_records': total_records,
        'unique_emails': unique_emails,
        'unique_recruiters': unique_recruiters,
        'status_distribution': dict(status_counts),
        'average_salary': avg_salary
    }
    
    logger.info("Data Summary:")
    logger.info(f"Total records: {summary['total_records']}")
    logger.info(f"Unique email addresses: {summary['unique_emails']}")
    logger.info(f"Unique recruiters: {summary['unique_recruiters']}")
    logger.info(f"Average current salary: ${summary['average_salary']:,.2f}" if summary['average_salary'] else "Average current salary: N/A")
    logger.info("Status distribution:")
    for status, count in summary['status_distribution'].items():
        logger.info(f"  {status}: {count}")
    
    return summary

def main():
    """Main execution function"""
    csv_path = "/home/leemax/projects/NewCompleteWorking/data/uploaded/Rollup Report (All Submitted).csv"
    db_path = "/home/leemax/projects/NewCompleteWorking/candidates_database.db"
    
    try:
        # Step 1: Clean the CSV data
        cleaned_df = clean_csv_data(csv_path)
        
        # Step 2: Create database schema
        conn, full_column_mapping = create_database_schema(db_path, cleaned_df)
        
        # Step 3: Import cleaned data
        import_cleaned_data(conn, cleaned_df, full_column_mapping)
        
        # Step 4: Generate summary
        summary = generate_data_summary(conn)
        
        # Step 5: Save cleaned CSV for reference
        cleaned_csv_path = "/home/leemax/projects/NewCompleteWorking/data/cleaned_candidates_data.csv"
        cleaned_df.to_csv(cleaned_csv_path, index=False)
        logger.info(f"Cleaned CSV saved to: {cleaned_csv_path}")
        
        conn.close()
        logger.info("Process completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during processing: {str(e)}")
        raise

if __name__ == "__main__":
    main()
