# Resume Database Schema for Advanced Matching

## Overview

This document describes the comprehensive database schema designed for sophisticated resume selection and matching. The system uses both a main `resume` table with enhanced fields and normalized tables for detailed data storage.

## Database Architecture

### Main Resume Table (`resume`)

The main resume table contains both basic information and enhanced fields for detailed filtering and matching.

#### Core Fields
- `id` - Primary key
- `filename` - Original resume filename
- `content` - Extracted text content
- `candidate_name` - Full candidate name
- `email` - Email address
- `phone` - Phone number
- `location` - Geographic location

#### Enhanced Matching Fields
- `title` - Professional title/position
- `summary` - Professional summary or objective
- `current_position` - Current job title
- `current_company` - Current employer
- `current_salary` - Current salary (integer)
- `desired_salary` - Desired salary (integer)
- `availability_date` - When available to start
- `work_authorization` - Work authorization status
- `willing_to_relocate` - Boolean for relocation willingness
- `willing_to_travel` - Boolean for travel willingness
- `remote_work_preference` - Remote work preference
- `industry_experience` - Primary industry experience
- `management_experience` - Boolean for management experience
- `team_size_managed` - Number of people managed
- `budget_responsibility` - Budget amount managed
- `years_experience` - Total years of experience
- `seniority_level` - Junior, Mid, Senior, Executive
- `career_level` - Individual Contributor, Manager, Director, VP, C-Level
- `languages` - JSON array of languages
- `certifications` - JSON array of certifications
- `awards` - JSON array of awards
- `publications` - JSON array of publications
- `volunteer_experience` - JSON array of volunteer experience
- `interests` - JSON array of interests
- `linkedin_url` - LinkedIn profile URL
- `portfolio_url` - Portfolio website URL
- `github_url` - GitHub profile URL

#### Versioning and Deduplication Fields
- `candidate_id` - Unique identifier for candidate
- `version_number` - Version number for this candidate
- `is_latest_version` - Flag for latest version
- `parent_resume_id` - Reference to previous version
- `content_hash` - Hash of content for duplicate detection

#### File Tracking Fields
- `original_file_path` - Path to original file
- `extracted_file_path` - Path to extracted text file
- `file_size` - File size in bytes
- `file_type` - File extension

### Normalized Tables

#### Work Experience Table (`work_experience`)
Stores detailed work history for each resume:
- `company_name` - Company name
- `position_title` - Job title
- `start_date` / `end_date` - Employment dates
- `is_current` - Boolean for current position
- `location` - Work location
- `description` - Job description
- `achievements` - JSON array of achievements
- `salary_range` - Salary range if mentioned
- `team_size` - Team size managed
- `industry` - Industry sector
- `employment_type` - Full-time, Part-time, Contract, etc.
- `reason_for_leaving` - Reason for leaving

#### Education Table (`education`)
Stores educational background:
- `institution_name` - School/University name
- `degree_type` - Bachelor, Master, PhD, Certificate, etc.
- `field_of_study` - Field of study
- `graduation_year` - Graduation year
- `gpa` - GPA if mentioned
- `honors` - Honors or distinctions
- `location` - School location
- `is_current` - Boolean for current education
- `description` - Additional details
- `relevant_courses` - JSON array of relevant courses

#### Skills Table (`skills`)
Stores detailed skills information:
- `skill_name` - Skill name
- `skill_category` - technical, soft, language, certification, etc.
- `proficiency_level` - beginner, intermediate, advanced, expert
- `years_experience` - Years of experience with this skill
- `is_certified` - Boolean for certification
- `certification_body` - Certifying organization

#### Projects Table (`projects`)
Stores project information:
- `project_name` - Project name
- `project_description` - Project description
- `start_date` / `end_date` - Project dates
- `technologies_used` - JSON array of technologies
- `team_size` - Team size
- `role` - Role in project
- `achievements` - JSON array of achievements
- `project_url` - Project URL if available
- `github_url` - GitHub URL if available

#### Certifications Table (`certifications`)
Stores certification details:
- `certification_name` - Certification name
- `issuing_organization` - Issuing organization
- `issue_date` - Issue date
- `expiration_date` - Expiration date
- `credential_id` - Credential ID if mentioned
- `credential_url` - Credential URL if available
- `is_current` - Boolean for current certification

## Database Indexes

### Resume Table Indexes
- `idx_resume_candidate_id` - For candidate lookups
- `idx_resume_content_hash` - For duplicate detection
- `idx_resume_latest_version` - For latest version queries
- `idx_resume_title` - For title searches
- `idx_resume_current_position` - For position searches
- `idx_resume_current_company` - For company searches
- `idx_resume_location` - For location filtering
- `idx_resume_experience_years` - For experience filtering
- `idx_resume_seniority_level` - For seniority filtering
- `idx_resume_career_level` - For career level filtering
- `idx_resume_industry` - For industry filtering
- `idx_resume_management` - For management experience filtering
- `idx_resume_authorization` - For work authorization filtering
- `idx_resume_relocate` - For relocation willingness filtering
- `idx_resume_remote` - For remote work preference filtering

### Normalized Table Indexes
- `idx_work_exp_resume_id` - For resume lookups
- `idx_work_exp_company` - For company searches
- `idx_work_exp_position` - For position searches
- `idx_work_exp_industry` - For industry filtering
- `idx_work_exp_current` - For current position filtering
- `idx_work_exp_dates` - For date range filtering
- `idx_education_resume_id` - For resume lookups
- `idx_education_institution` - For institution searches
- `idx_education_degree` - For degree filtering
- `idx_education_field` - For field of study filtering
- `idx_education_year` - For graduation year filtering
- `idx_skills_resume_id` - For resume lookups
- `idx_skills_name` - For skill searches
- `idx_skills_category` - For skill category filtering
- `idx_skills_proficiency` - For proficiency level filtering
- `idx_projects_resume_id` - For resume lookups
- `idx_projects_technologies` - For technology searches
- `idx_certifications_resume_id` - For resume lookups
- `idx_certifications_name` - For certification searches
- `idx_certifications_org` - For organization searches
- `idx_certifications_current` - For current certification filtering

## API Endpoints for Filtering

### Advanced Search Endpoint
```
GET /api/resumes/search
```

#### Query Parameters
- **Basic Filters:**
  - `location` - Geographic location
  - `years_experience_min` / `years_experience_max` - Experience range
  - `seniority_level` - Junior, Mid, Senior, Executive
  - `career_level` - Individual Contributor, Manager, Director, VP, C-Level
  - `management_experience` - Boolean for management experience
  - `willing_to_relocate` - Boolean for relocation willingness
  - `willing_to_travel` - Boolean for travel willingness
  - `remote_work_preference` - Remote work preference
  - `work_authorization` - Work authorization status

- **Salary Filters:**
  - `current_salary_min` / `current_salary_max` - Current salary range
  - `desired_salary_min` / `desired_salary_max` - Desired salary range

- **Industry and Company Filters:**
  - `industry_experience` - Industry experience
  - `current_company` - Current company

- **Pagination:**
  - `skip` - Number of records to skip
  - `limit` - Maximum number of records to return

### Comprehensive Details Endpoint
```
GET /api/resumes/{resume_id}/details
```

Returns complete resume information including all normalized data:
- Resume basic information
- Work experience details
- Education details
- Skills breakdown
- Project information
- Certification details

## Filtering Examples

### Example 1: Find Senior Engineers in California
```
GET /api/resumes/search?location=California&seniority_level=Senior&career_level=Individual Contributor&years_experience_min=5
```

### Example 2: Find Managers Willing to Relocate
```
GET /api/resumes/search?management_experience=true&willing_to_relocate=true&career_level=Manager
```

### Example 3: Find Remote Workers with Specific Skills
```
GET /api/resumes/search?remote_work_preference=Remote&skill_name=Python&proficiency_level=Advanced
```

### Example 4: Find Candidates in Salary Range
```
GET /api/resumes/search?current_salary_min=80000&current_salary_max=120000&desired_salary_min=90000
```

## Benefits of This Schema

### 1. Comprehensive Filtering
- **40+ filterable fields** for precise candidate matching
- **Multiple data types** (text, boolean, integer, date) for different filter types
- **Normalized data** allows for complex queries across related tables

### 2. Performance Optimization
- **Strategic indexing** on commonly filtered fields
- **Composite indexes** for multi-field queries
- **Foreign key relationships** with cascade delete for data integrity

### 3. Scalability
- **Normalized design** reduces data redundancy
- **Efficient queries** with proper indexing
- **Pagination support** for large datasets

### 4. Flexibility
- **JSON fields** for flexible data storage (languages, skills, etc.)
- **Optional fields** allow for partial data
- **Versioning system** supports resume updates

### 5. AI Integration
- **Structured extraction** from AI processing
- **Confidence scoring** for data quality
- **Fallback mechanisms** for extraction failures

## Usage Recommendations

### 1. Query Optimization
- Use indexed fields for primary filters
- Combine multiple filters for precise results
- Use pagination for large result sets

### 2. Data Quality
- Validate AI-extracted data
- Use confidence scores for data reliability
- Implement data cleaning processes

### 3. Performance Monitoring
- Monitor query performance
- Optimize slow queries
- Consider additional indexes based on usage patterns

This comprehensive schema provides the foundation for sophisticated resume matching and candidate selection systems.



