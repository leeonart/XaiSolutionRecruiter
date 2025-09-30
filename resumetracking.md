# Resume Tracking System Documentation

## Overview

The Resume Tracking System is a comprehensive solution for managing resume uploads, deduplication, versioning, and AI-powered job matching. It ensures data integrity by preventing duplicates while maintaining complete version history for each candidate.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Deduplication & Versioning](#deduplication--versioning)
3. [File Storage Structure](#file-storage-structure)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Candidate Identification](#candidate-identification)
7. [Upload Workflow](#upload-workflow)
8. [Version Management](#version-management)
9. [Usage Examples](#usage-examples)
10. [Configuration](#configuration)

## System Architecture

### Components

- **Frontend**: React/TypeScript interface for resume management
- **Backend**: FastAPI Python server with comprehensive resume processing
- **Database**: PostgreSQL with resume versioning and deduplication
- **File Storage**: Organized directory structure for original and processed files
- **AI Processing**: Content extraction and job matching capabilities

### Technology Stack

- **Backend**: FastAPI, SQLModel, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS
- **Document Processing**: PyPDF2, python-docx, docx2txt
- **Containerization**: Docker, Docker Compose

## Deduplication & Versioning

### Core Principles

1. **One Candidate, Multiple Versions**: Each person has a unique candidate ID with multiple resume versions
2. **No Exact Duplicates**: Identical content is rejected to prevent database pollution
3. **Latest Version Tracking**: Always maintain a flag for the most recent version
4. **Complete Audit Trail**: Full history of all resume versions

### Deduplication Strategy

#### Content Hash Matching
- **SHA-256 Hash**: Generated from extracted text content
- **Exact Duplicate Detection**: Identical content is automatically rejected
- **Binary Comparison**: Prevents same file uploads

#### Candidate Identification
- **Email Priority**: Primary identifier (most reliable)
- **Phone Number**: Secondary identifier
- **Name Fallback**: Tertiary identifier (least reliable)

## File Storage Structure

### Directory Organization

```
/app/data/resumes/
├── original/                    # Original uploaded files
│   └── {session_id}/           # Session-specific folders
│       ├── candidate_v1.pdf
│       ├── candidate_v2.pdf
│       └── another_candidate.pdf
├── extracted/                  # Text content extracted from files
│   └── {session_id}/           # Session-specific folders
│       ├── candidate_v1.txt
│       ├── candidate_v2.txt
│       └── another_candidate.txt
├── processed/                  # AI-processed results
├── reports/                    # Generated matching reports
└── archive/                    # Archived/old files
```

### File Types Supported

- **PDF Files**: Extracted using PyPDF2
- **DOCX Files**: Extracted using docx2txt
- **DOC Files**: Extracted using python-docx
- **TXT/MD Files**: Read directly as UTF-8

## Database Schema

### Resume Table Structure

```sql
CREATE TABLE resume (
    id SERIAL PRIMARY KEY,
    filename VARCHAR NOT NULL,
    content TEXT NOT NULL,
    candidate_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    experience_years INTEGER,
    skills TEXT,
    education TEXT,
    location VARCHAR,
    
    -- Deduplication and versioning fields
    candidate_id VARCHAR,                    -- Unique identifier for candidate
    version_number INTEGER DEFAULT 1,        -- Version number for this candidate
    is_latest_version BOOLEAN DEFAULT TRUE,  -- Flag for latest version
    parent_resume_id INTEGER,                -- Reference to previous version
    content_hash VARCHAR,                    -- Hash of content for duplicate detection
    
    -- File tracking
    original_file_path VARCHAR,
    extracted_file_path VARCHAR,
    file_size INTEGER,
    file_type VARCHAR,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_resume_candidate_id ON resume(candidate_id);
CREATE INDEX idx_resume_content_hash ON resume(content_hash);
CREATE INDEX idx_resume_latest_version ON resume(is_latest_version);
```

### Related Tables

- **jobmatch**: Stores AI-generated job-resume matches
- **processingsession**: Tracks processing sessions
- **job**: Stores job listings for matching

## API Endpoints

### Resume Upload & Management

#### Upload Resumes with Deduplication
```http
POST /api/resumes/upload
Content-Type: multipart/form-data

Parameters:
- resume_files: List[UploadFile] (required)

Response:
{
  "success": true,
  "session_id": "uuid-string",
  "message": "Successfully processed X resume(s)",
  "uploaded_resumes": [
    {
      "filename": "john_doe_v2.pdf",
      "action": "new_version",
      "candidate_id": "email_abc123",
      "version_number": 2,
      "is_latest_version": true,
      "message": "Resume new_version - Version 2"
    }
  ]
}
```

#### Get Latest Resumes Only
```http
GET /api/resumes/latest?skip=0&limit=100

Response: List[ResumeResponse] - Only latest versions
```

#### Get All Versions of a Candidate
```http
GET /api/resumes/candidate/{candidate_id}

Response: List[ResumeResponse] - All versions ordered by version number
```

#### Get Versions by Resume ID
```http
GET /api/resumes/{resume_id}/versions

Response: List[ResumeResponse] - All versions of the candidate
```

#### Set Specific Version as Latest
```http
PUT /api/resumes/{resume_id}/set-latest

Response:
{
  "message": "Resume version X set as latest for candidate {candidate_id}"
}
```

### Standard CRUD Operations

#### Get All Resumes
```http
GET /api/resumes?skip=0&limit=100
```

#### Get Specific Resume
```http
GET /api/resumes/{resume_id}
```

#### Update Resume
```http
PUT /api/resumes/{resume_id}
```

#### Delete Resume
```http
DELETE /api/resumes/{resume_id}
```

## Candidate Identification

### Identification Priority

1. **Email Address** (Highest Priority)
   - Pattern: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`
   - ID Format: `email_{hash}`
   - Example: `john@company.com` → `email_a1b2c3d4`

2. **Phone Number** (Medium Priority)
   - Pattern: `(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})`
   - ID Format: `phone_{hash}`
   - Example: `(555) 123-4567` → `phone_e5f6g7h8`

3. **Name** (Lowest Priority)
   - Patterns: `John Doe`, `DOE, John`, `John M. Doe`
   - ID Format: `name_{hash}`
   - Example: `John Doe` → `name_i9j0k1l2`

### Name Extraction Patterns

```python
name_patterns = [
    r'^([A-Z][a-z]+ [A-Z][a-z]+)',      # First Last
    r'^([A-Z][A-Z]+, [A-Z][a-z]+)',      # LAST, First
    r'([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)', # First M. Last
]
```

## Upload Workflow

### Step-by-Step Process

1. **File Upload**
   - User selects resume files
   - Files are uploaded to backend
   - Session ID generated for batch tracking

2. **File Processing**
   - Original files saved to `/app/data/resumes/original/{session_id}/`
   - Content extracted based on file type
   - Extracted text saved to `/app/data/resumes/extracted/{session_id}/`

3. **Content Analysis**
   - Generate SHA-256 hash of extracted content
   - Extract candidate information (email, phone, name)
   - Generate unique candidate ID

4. **Deduplication Check**
   - Check for existing candidate by candidate_id
   - Check for exact duplicate by content_hash
   - Determine action: create_new, duplicate, or new_version

5. **Database Operations**
   - Create new resume record with versioning info
   - Update previous versions if creating new version
   - Commit transaction

6. **Response Generation**
   - Return detailed results for each file
   - Include action taken and version information

### Upload Actions

#### Create New Candidate
- **Trigger**: No existing candidate found
- **Action**: Create version 1
- **Database**: New record with `version_number=1`, `is_latest_version=true`

#### Exact Duplicate
- **Trigger**: Content hash matches existing resume
- **Action**: Reject upload
- **Database**: No new record created
- **Response**: "Exact duplicate detected - no new record created"

#### New Version
- **Trigger**: Same candidate, different content
- **Action**: Create new version
- **Database**: 
  - Mark previous version as `is_latest_version=false`
  - Create new record with incremented version number
  - Set `is_latest_version=true`

## Version Management

### Version Numbering

- **Version 1**: First resume for a candidate
- **Version 2+**: Subsequent resumes with different content
- **Automatic Increment**: System automatically assigns next version number

### Latest Version Tracking

- **Single Latest**: Only one version per candidate marked as latest
- **Version Switching**: Can manually set any version as latest
- **API Access**: `/api/resumes/latest` returns only latest versions

### Version History

- **Complete Audit Trail**: All versions preserved
- **Parent References**: Each version references its parent
- **Chronological Order**: Versions ordered by creation date

## Usage Examples

### Frontend Integration

#### Upload Resumes
```typescript
const uploadResumes = async (files: FileList) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('resume_files', files[i]);
  }
  
  const response = await api.post('/api/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  return response.data;
};
```

#### Get Latest Resumes
```typescript
const getLatestResumes = async () => {
  const response = await api.get('/api/resumes/latest');
  return response.data;
};
```

#### Get Candidate Versions
```typescript
const getCandidateVersions = async (candidateId: string) => {
  const response = await api.get(`/api/resumes/candidate/${candidateId}`);
  return response.data;
};
```

### Backend Processing

#### Content Extraction
```python
def extract_resume_content(file_path: str, filename: str) -> str:
    file_ext = filename.lower().split('.')[-1]
    
    if file_ext == 'pdf':
        return extract_text_from_pdf(file_path)
    elif file_ext == 'docx':
        return extract_text_from_docx(file_path)
    elif file_ext == 'doc':
        return extract_text_from_doc(file_path)
    elif file_ext in ['txt', 'md']:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    else:
        return f"[Unsupported file type: {file_ext}]"
```

#### Deduplication Logic
```python
def handle_resume_versioning(session: Session, candidate_id: str, content_hash: str):
    existing_resume = find_existing_candidate(session, candidate_id, content_hash)
    
    if not existing_resume:
        return {'action': 'create_new', 'version_number': 1}
    
    if existing_resume.content_hash == content_hash:
        return {'action': 'duplicate', 'existing_resume': existing_resume}
    
    # Create new version
    existing_resume.is_latest_version = False
    next_version = get_next_version_number(session, candidate_id)
    
    return {
        'action': 'new_version',
        'version_number': next_version,
        'parent_resume_id': existing_resume.id
    }
```

## Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@db:5432/ai_job_platform

# File Storage
RESUME_STORAGE_PATH=/app/data/resumes

# Document Processing
DOCUMENT_PROCESSING_AVAILABLE=true
```

### Docker Configuration

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/ai_job_platform
  
  db:
    environment:
      - POSTGRES_DB=ai_job_platform
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
```

### Required Python Packages

```txt
# Document Processing
PyPDF2>=3.0.0
python-docx>=0.8.11
docx2txt>=0.8

# Database
sqlmodel>=0.0.14
psycopg2-binary>=2.9.0

# Web Framework
fastapi>=0.100.0
uvicorn>=0.20.0
python-multipart>=0.0.5
```

## Best Practices

### File Naming Conventions

- **Descriptive Names**: Use meaningful filenames
- **Version Indicators**: Include version numbers when appropriate
- **Consistent Format**: Maintain consistent naming patterns

### Data Management

- **Regular Cleanup**: Archive old versions periodically
- **Backup Strategy**: Maintain backups of original files
- **Access Control**: Implement proper access controls

### Performance Optimization

- **Indexing**: Ensure proper database indexes
- **File Compression**: Compress archived files
- **Caching**: Cache frequently accessed data

## Troubleshooting

### Common Issues

#### PDF Processing Errors
- **Issue**: "PDF processing not available"
- **Solution**: Ensure PyPDF2 is installed and properly imported

#### Duplicate Detection Issues
- **Issue**: Duplicates not detected
- **Solution**: Check content hash generation and database indexes

#### Version Management Problems
- **Issue**: Multiple latest versions
- **Solution**: Run cleanup script to fix version flags

### Debugging

#### Enable Debug Logging
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Check Database State
```sql
-- Check for multiple latest versions
SELECT candidate_id, COUNT(*) as latest_count 
FROM resume 
WHERE is_latest_version = true 
GROUP BY candidate_id 
HAVING COUNT(*) > 1;

-- Check version consistency
SELECT candidate_id, version_number, is_latest_version, created_at
FROM resume 
ORDER BY candidate_id, version_number;
```

## Future Enhancements

### Planned Features

1. **AI-Powered Candidate Matching**: Enhanced duplicate detection using AI
2. **Resume Comparison**: Side-by-side version comparison
3. **Bulk Operations**: Mass version management
4. **Advanced Analytics**: Upload patterns and version trends
5. **Integration APIs**: Third-party system integration

### Scalability Considerations

1. **File Storage**: Consider cloud storage for large volumes
2. **Database Optimization**: Implement partitioning for large datasets
3. **Caching Layer**: Add Redis for frequently accessed data
4. **Load Balancing**: Distribute processing across multiple instances

---

## Support

For technical support or questions about the Resume Tracking System, please refer to the system logs or contact the development team.

**Last Updated**: September 14, 2025  
**Version**: 1.0.0  
**Author**: AI Job Processing Platform Team



