# Candidates Database Project

This project creates a clean, structured database from the "Rollup Report (All Submitted).csv" file, containing candidate recruitment data.

## Overview

The project processes a CSV file with 4,008 candidate records and 42 columns, cleaning the data and creating a SQLite database with proper schema and data validation.

## Files Created

### Main Scripts
- `data_cleaning_script.py` - Main script that cleans CSV data and creates the database
- `query_database.py` - Database query interface for exploring the data
- `verify_database.py` - Simple verification script to check database contents

### Data Files
- `candidates_database.db` - SQLite database with cleaned candidate data
- `data/cleaned_candidates_data.csv` - Cleaned CSV file for reference

## Database Schema

The database contains a single table `candidates` with the following key fields:

- **Personal Information**: first_name, last_name, email_address, cell_phone
- **Professional Data**: current_salary, desired_salary, degree, recruiter
- **Status & Dates**: candidate_status, date_entered, last_modified
- **Location**: city_state, relocation_note
- **Additional Fields**: notes, linkedin profiles, visa information, etc.

## Data Quality Improvements

### Issues Fixed
1. **Salary Data**: Cleaned and standardized salary values, filtering out unrealistic amounts
2. **Phone Numbers**: Standardized phone number formats
3. **Email Addresses**: Validated and cleaned email addresses
4. **Date Formats**: Standardized date formats across all date fields
5. **Text Fields**: Cleaned and limited length of long text fields
6. **Special Characters**: Handled quoted names and special characters properly

### Data Statistics
- **Total Records**: 4,008 candidates
- **Unique Emails**: 3,815 (193 duplicates found)
- **Unique Recruiters**: 58
- **Candidate Status**: 3,731 active (C), 277 placed (P)
- **Salary Range**: $20,000 - $450,000 (average: $105,904)

## Usage

### Setting Up the Environment
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install pandas numpy
```

### Running the Data Cleaning Script
```bash
python data_cleaning_script.py
```

This will:
1. Load and clean the CSV data
2. Create the SQLite database
3. Import cleaned data
4. Generate summary statistics
5. Save cleaned CSV for reference

### Querying the Database
```bash
python query_database.py
```

This provides:
- Database summary statistics
- Top recruiters by candidate count
- Salary analysis by status
- Duplicate email detection
- Sample candidate records

### Custom Queries
```python
from query_database import CandidatesDatabase

db = CandidatesDatabase()

# Search for specific candidates
results = db.search_candidates(
    first_name="John",
    status="C",
    min_salary=50000
)

# Get top recruiters
top_recruiters = db.get_top_recruiters(10)

db.close()
```

## Key Features

### Data Cleaning Functions
- **Salary Cleaning**: Extracts numeric values, filters realistic ranges
- **Phone Standardization**: Removes formatting, validates length
- **Email Validation**: Basic format validation
- **Date Standardization**: Multiple format support
- **Text Cleaning**: Whitespace normalization, length limiting

### Database Features
- **Indexes**: Created on key fields (email, status, recruiter, names)
- **Data Types**: Appropriate types (TEXT, REAL, TIMESTAMP)
- **Constraints**: Proper handling of NULL values
- **Performance**: Optimized for common queries

### Query Interface
- **Search Functionality**: Filter by multiple criteria
- **Analytics**: Summary statistics and analysis
- **Data Export**: Results as pandas DataFrames
- **Error Handling**: Robust error management

## Data Insights

### Top Recruiters
1. MHUGHES: 438 candidates (avg salary: $99,135)
2. D BOMAN: 144 candidates (avg salary: $113,685)
3. DBOMAN: 90 candidates (avg salary: $122,625)

### Salary Analysis
- **Active Candidates (C)**: Average salary $106,103
- **Placed Candidates (P)**: Average salary $103,808
- **Salary Distribution**: 1,445 candidates with salary data

### Data Quality
- **Completeness**: 93% of candidates have email addresses
- **Uniqueness**: 95% of email addresses are unique
- **Consistency**: All status fields properly cleaned

## Technical Details

### Database Technology
- **SQLite**: Lightweight, file-based database
- **Schema**: 44 columns including metadata (created_at, updated_at)
- **Indexes**: 5 indexes for common query patterns

### Performance
- **Import Speed**: ~4,000 records in <5 seconds
- **Query Performance**: Sub-second response for most queries
- **Storage**: ~15MB database file

### Error Handling
- **Data Validation**: Comprehensive validation rules
- **Logging**: Detailed processing logs
- **Recovery**: Graceful handling of malformed data

## Future Enhancements

1. **Web Interface**: Create a web-based query interface
2. **Data Export**: Add export functionality for filtered results
3. **Advanced Analytics**: Statistical analysis and reporting
4. **Data Backup**: Automated backup and versioning
5. **API Development**: REST API for external integrations

## Troubleshooting

### Common Issues
1. **Missing Dependencies**: Install pandas and numpy
2. **File Permissions**: Ensure write access to output directory
3. **Memory Issues**: Process large files in batches
4. **Data Encoding**: Handle special characters properly

### Support
For issues or questions, refer to the logging output or check the database schema using:
```python
db = CandidatesDatabase()
print(db.get_table_info())
db.close()
```