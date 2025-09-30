# Advanced Resume Search System Documentation

## Overview
The Advanced Resume Search System provides a comprehensive, AI-powered search interface for resume management with multiple search modes, saved searches, and analytics.

## Features

### 1. Multi-Tab Search Interface
- **Advanced Search**: Comprehensive filter-based search with 30+ criteria
- **Saved Searches**: Save, manage, and reuse frequently used search queries
- **Analytics**: Search performance metrics and insights

### 2. Search Filters

#### Basic Search Tab
- **Name**: Search by first name, last name, or full name
- **Email**: Search primary or secondary email addresses
- **Phone**: Search phone numbers
- **Technical Skills**: Multi-select with autocomplete
  - Common skills: Python, JavaScript, Java, C++, SQL, React, AWS, Docker, etc.
- **Certifications**: Multi-select with autocomplete
  - Common certs: PMP, CISSP, AWS Certified, Microsoft Certified, etc.

#### Professional Profile Tab
- **Years of Experience**: Range slider (0-30 years)
- **Seniority Level**: Entry, Mid, Senior, Executive
- **Career Level**: Individual Contributor, Manager, Director, VP+
- **Education Level**: High School, Associate, Bachelor's, Master's, PhD
- **Current Salary Range**: Slider ($40k-$300k)
- **Expected Salary Range**: Slider ($50k-$400k)
- **Management Experience**: Checkbox filter

#### Location & Mobility Tab
- **Current Location**: Free text search
- **Preferred Locations**: Multi-select with common cities
- **Remote Work Preference**: Remote, Hybrid, On-site, Flexible
- **Willing to Relocate**: Checkbox filter

#### AI Search Tab
- **Natural Language Search**: Semantic query input
  - Example: "Find electrical engineers with 5+ years in manufacturing who are willing to relocate to Texas"
- **Work Authorization**: US Citizen, Green Card, H1B, TN Visa, OPT
- **Industry Experience**: Technology, Manufacturing, Healthcare, Finance, etc.
- **Job Fit Score**: Minimum match percentage slider

### 3. Search Results Display

#### View Modes
- **List View**: Detailed cards with full information
- **Grid View**: Compact cards in grid layout
- **Table View**: Sortable table with columns

#### Result Information
- Candidate name with match percentage
- AI extraction confidence score
- Experience, company, location
- Skills and certifications (with tags)
- Salary information
- Last updated date

#### Quick Actions
- **View**: Open detailed resume view
- **Contact**: Send email or call
- **Shortlist**: Add to shortlist for review
- **Export**: Download selected resumes
- **Share**: Share with team members

#### Sorting Options
- Relevance (default - by AI confidence)
- Experience (years)
- Salary
- Date Added
- Name

### 4. Saved Searches

#### Features
- Save search criteria with custom names
- Mark searches as favorites (starred)
- View usage count and last used date
- Edit search names
- Delete searches
- Quick load and run saved searches

#### Organization
- **Favorites Section**: Starred searches at top
- **Recent Searches**: Last 5 used searches
- Filter summary showing key criteria

### 5. Analytics Dashboard

#### Metrics Cards
- **Total Resumes**: Count of all resumes in database
- **Searches Today**: Number of searches performed today
- **Avg Search Time**: Average query execution time
- **Success Rate**: Percentage of successful searches

#### Charts & Insights
- **Popular Skills**: Bar chart of most searched skills
- **Recent Searches**: List of recent queries with result counts
- **Search Performance**: Speed and accuracy metrics

## API Endpoints

### Core Search Endpoints

#### 1. Advanced Search
```http
GET /api/resumes/search?{filters}
```

**Query Parameters:**
- `name`: string
- `email`: string
- `phone`: string
- `years_experience_min`: integer
- `years_experience_max`: integer
- `seniority_level`: string
- `career_level`: string
- `management_experience`: boolean
- `technical_skills`: string (comma-separated)
- `certifications`: string (comma-separated)
- `education_level`: string
- `current_location`: string
- `preferred_locations`: string (comma-separated)
- `relocation_willing`: boolean
- `remote_work_preference`: string
- `current_salary_min`: integer
- `current_salary_max`: integer
- `expected_salary_min`: integer
- `expected_salary_max`: integer
- `work_authorization`: string
- `industry_experience`: string
- `current_company`: string
- `semantic_query`: string
- `job_fit_score`: integer
- `sort_by`: string (relevance|experience|salary|date|name)
- `skip`: integer (pagination)
- `limit`: integer (pagination, max 100)

**Response:**
```json
{
  "resumes": [...],
  "total_count": 150,
  "skip": 0,
  "limit": 100,
  "has_more": true,
  "sort_by": "relevance"
}
```

#### 2. Semantic Search
```http
POST /api/resumes/semantic-search
```

**Form Data:**
- `query`: Natural language search query
- `job_requirements`: Optional job requirements
- `limit`: Maximum results (default 50)

**Response:**
```json
{
  "resumes": [...],
  "total_count": 25,
  "query": "electrical engineers with 5+ years",
  "search_type": "semantic"
}
```

#### 3. Skills Matching
```http
GET /api/resumes/skills-match?required_skills={skills}&preferred_skills={skills}
```

**Query Parameters:**
- `required_skills`: Comma-separated required skills
- `preferred_skills`: Comma-separated preferred skills
- `limit`: Maximum results (default 50)

**Response:**
```json
{
  "resumes": [
    {
      ...resume_fields,
      "skills_match_score": 85.0,
      "required_skills_matched": 4,
      "preferred_skills_matched": 2
    }
  ],
  "total_count": 20,
  "required_skills": ["Python", "AWS", "Docker"],
  "preferred_skills": ["Kubernetes", "React"]
}
```

### Saved Searches

#### 4. Get Saved Searches
```http
GET /api/resumes/saved-searches
```

**Response:**
```json
{
  "saved_searches": [
    {
      "id": "1",
      "name": "Senior Electrical Engineers in Texas",
      "filters": {...},
      "created_at": "2025-09-29T10:00:00Z",
      "last_used": "2025-09-29T15:30:00Z",
      "use_count": 5,
      "is_favorite": true
    }
  ]
}
```

#### 5. Save Search
```http
POST /api/resumes/saved-searches
```

**Form Data:**
- `name`: Search name
- `filters`: JSON string of filter criteria

**Response:**
```json
{
  "success": true,
  "message": "Search 'Senior Engineers' saved successfully",
  "search_id": "search_123"
}
```

### Analytics

#### 6. Search Analytics
```http
GET /api/resumes/search-analytics
```

**Response:**
```json
{
  "total_resumes": 150,
  "recent_searches": [
    {"query": "electrical engineer", "count": 15, "date": "2025-09-29"}
  ],
  "popular_skills": [
    {"skill": "Python", "count": 45}
  ],
  "search_performance": {
    "avg_search_time": "0.3s",
    "success_rate": "98.5%",
    "total_searches_today": 47
  }
}
```

## Frontend Components

### 1. AdvancedSearchFilters
**Location**: `frontend/src/components/AdvancedSearchFilters.tsx`

**Props:**
- `onSearch`: (filters) => void
- `onSaveSearch`: (name, filters) => void
- `savedSearches`: SavedSearch[]
- `onLoadSavedSearch`: (filters) => void

**Features:**
- 4-tab interface (Basic, Professional, Location, AI)
- Multi-select with autocomplete
- Range sliders for numeric values
- Save current search dialog
- Load saved search dropdown

### 2. SearchResults
**Location**: `frontend/src/components/SearchResults.tsx`

**Props:**
- `resumes`: Resume[]
- `loading`: boolean
- `totalCount`: number
- `onViewResume`: (resume) => void
- `onContactResume`: (resume) => void
- `onAddToShortlist`: (resume) => void
- `onExportResults`: () => void
- `onShareResults`: () => void

**Features:**
- 3 view modes (List, Grid, Table)
- Bulk selection
- Sorting dropdown
- Quick action buttons
- Match percentage badges

### 3. SavedSearches
**Location**: `frontend/src/components/SavedSearches.tsx`

**Props:**
- `savedSearches`: SavedSearch[]
- `onLoadSearch`: (filters) => void
- `onSaveSearch`: (name, filters) => void
- `onDeleteSearch`: (id) => void
- `onUpdateSearch`: (id, name, filters) => void
- `onToggleFavorite`: (id) => void

**Features:**
- Favorites section
- Recent searches section
- Edit search names
- Delete searches
- Quick run button
- Usage statistics

### 4. AIResumeManagementNew
**Location**: `frontend/src/pages/AIResumeManagementNew.tsx`

**Main Component** - Integrates all search components

**Features:**
- Analytics dashboard cards
- 3-tab interface
- Search orchestration
- API integration
- State management

## Database Schema

### Resume Table Fields Used in Search
- `first_name`, `last_name`: Name search
- `primary_email`, `secondary_email`: Email search
- `phone`, `alternative_phone`: Phone search
- `address`: Location search
- `years_experience`: Experience filters
- `seniority_level`: Seniority filter
- `career_level`: Career level filter
- `management_experience`: Management filter
- `technical_skills`: Skills search
- `hands_on_skills`: Skills search
- `certifications`: Certification filter
- `licenses`: License filter
- `current_salary`: Salary filters
- `expected_salary`: Salary filters
- `work_authorization`: Work auth filter
- `citizenship`: Citizenship filter
- `relocation`, `remote_work`: Mobility filters
- `recommended_industries`: Industry filter
- `preferred_locations`: Location preferences
- `restricted_locations`: Location restrictions
- `ai_extraction_confidence`: Relevance scoring
- `is_latest_version`: Filter for latest versions only

## Usage Examples

### Example 1: Basic Search
```typescript
const filters = {
  name: "John Smith",
  years_experience_min: 5,
  years_experience_max: 10,
  technical_skills: ["Python", "AWS"]
};

handleSearch(filters);
```

### Example 2: Advanced Salary Search
```typescript
const filters = {
  current_salary_min: 80000,
  current_salary_max: 120000,
  expected_salary_min: 100000,
  expected_salary_max: 150000,
  management_experience: true,
  career_level: "manager"
};

handleSearch(filters);
```

### Example 3: Location-Based Search
```typescript
const filters = {
  current_location: "Texas",
  preferred_locations: ["Dallas, TX", "Austin, TX", "Houston, TX"],
  relocation_willing: true,
  remote_work_preference: "hybrid"
};

handleSearch(filters);
```

### Example 4: Semantic Search
```typescript
const query = "Find experienced electrical engineers with power systems knowledge who are willing to relocate to Texas and have PMP certification";

handleSemanticSearch(query);
```

## Performance Optimization

### Database Indexes
Recommended indexes for optimal search performance:
```sql
CREATE INDEX idx_resume_name ON resume(first_name, last_name);
CREATE INDEX idx_resume_email ON resume(primary_email);
CREATE INDEX idx_resume_experience ON resume(years_experience);
CREATE INDEX idx_resume_skills ON resume USING gin(to_tsvector('english', technical_skills));
CREATE INDEX idx_resume_location ON resume(address);
CREATE INDEX idx_resume_salary ON resume(current_salary, expected_salary);
CREATE INDEX idx_resume_latest ON resume(is_latest_version) WHERE is_latest_version = true;
```

### Caching Strategy
- Cache popular search results (Redis)
- Cache autocomplete suggestions
- Cache analytics data (refresh every 5 minutes)

### Query Optimization
- Use pagination (limit 100 per page)
- Filter count queries with same criteria
- Use relevance ordering by default
- Avoid expensive joins when possible

## Future Enhancements

### Phase 4: Advanced AI Features
1. **Semantic Similarity Search**
   - Vector embeddings for resumes
   - Cosine similarity matching
   - Neural search models

2. **Job Matching Score**
   - Calculate match % based on job requirements
   - Skill gap analysis
   - Recommendation engine

3. **Predictive Analytics**
   - Candidate success prediction
   - Salary prediction
   - Time-to-hire estimation

### Phase 5: Collaboration Features
1. **Team Collaboration**
   - Share searches with team
   - Collaborative shortlists
   - Comments and notes

2. **Workflow Integration**
   - Email integration
   - Calendar scheduling
   - Interview tracking

3. **Reporting**
   - Custom report builder
   - Export to Excel/PDF
   - Automated reports

## Troubleshooting

### Common Issues

#### Issue: No search results
**Solution**: Check filter criteria, ensure database has resumes

#### Issue: Slow search performance
**Solution**: Add database indexes, reduce result limit, use pagination

#### Issue: Semantic search not working
**Solution**: Ensure query is descriptive, check backend logs

#### Issue: Saved searches not loading
**Solution**: Check API endpoint, verify localStorage quota

## Support

For issues or feature requests:
- Check backend logs: `docker logs newcompleteworking-backend-1`
- Check frontend console: Browser DevTools
- Review API responses in Network tab
- Contact: support@example.com

## Version History

- **v1.0.0** (2025-09-29): Initial release
  - Advanced search with 30+ filters
  - Saved searches functionality
  - Analytics dashboard
  - Multiple view modes
  - Semantic search support
