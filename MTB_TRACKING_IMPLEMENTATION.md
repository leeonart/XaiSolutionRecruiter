# MTB Tracking System Implementation Guide

## 🎯 **Overview**

This system provides comprehensive Master Tracking Board (MTB) synchronization and job lifecycle management with the following capabilities:

- **Real-time MTB Sync**: Download and process MasterTrackingBoard.csv from Google Drive
- **Job Status Tracking**: Track job categories (AA, A, B, C, D, P, X) and changes over time
- **Lifecycle Management**: Automatically mark jobs as inactive when they disappear from MTB
- **Audit Trail**: Complete history of all status changes
- **Cross-Folder Search**: Find misplaced job files across directory structures

## 📊 **Database Schema**

### Core Tables

1. **job_status_categories** - Defines the category meanings
2. **jobs** (enhanced) - Main job records with MTB tracking fields
3. **job_status_history** - Complete audit trail of status changes
4. **mtb_sync_log** - Log of each synchronization operation
5. **job_mtb_tracking** - Detailed tracking of each job in each sync

### Key Features

- **Automatic Status Updates**: Jobs automatically marked inactive when missing from MTB
- **Category Priority System**: AA (highest) → A → B → C → D → P (placed) → X (lowest)
- **Historical Tracking**: Complete record of all changes with timestamps
- **Performance Optimized**: Indexed for fast queries

## 🚀 **Implementation Steps**

### Step 1: Database Setup

```bash
# Apply the database schema
cd /home/leemax/projects/NewCompleteWorking
psql -h localhost -U postgres -d ai_job_platform -f database_schema_mtb_tracking.sql
```

### Step 2: Update Existing Jobs

```sql
-- Add MTB tracking fields to existing jobs
UPDATE jobs SET 
    current_category = CASE 
        WHEN category = 'AA' THEN 'AA'
        WHEN category = 'A' THEN 'A'
        WHEN category = 'B' THEN 'B'
        WHEN category = 'C' THEN 'C'
        WHEN category = 'D' THEN 'D'
        ELSE 'A'  -- Default to A for existing jobs
    END,
    is_active = TRUE,
    last_mtb_seen = CURRENT_TIMESTAMP,
    first_seen = created_at,
    mtb_appearances = 1;
```

### Step 3: Test the System

```bash
# Test the API endpoints
curl http://localhost:8000/api/mtb-sync/status
curl -X POST http://localhost:8000/api/mtb-sync/run
```

### Step 4: Set Up Automated Sync

Create a cron job for regular synchronization:

```bash
# Add to crontab (runs every 30 minutes)
*/30 * * * * cd /home/leemax/projects/NewCompleteWorking && python3 mtb_sync_service.py
```

## 🔧 **API Endpoints**

### MTB Synchronization
- `POST /api/mtb-sync/run` - Run MTB synchronization
- `GET /api/mtb-sync/status` - Get current sync status and statistics

### Job Status Management
- `POST /api/job-status/update` - Update job status manually
- `GET /api/job-status/history/{job_id}` - Get status change history

### Job Recovery
- `GET /api/job-recovery/scan` - Scan for misplaced job files
- `GET /api/job-recovery/search/{job_id}` - Search for specific job ID
- `POST /api/job-recovery/recover` - Recover misplaced files

## 🎨 **Frontend Interface**

### MTB Management Page (`/mtb-management`)
- **Sync Control**: Run MTB synchronization manually
- **Status Overview**: View jobs by category with counts
- **Manual Updates**: Change job status manually
- **Category Legend**: Clear explanation of each category

### Job Recovery Page (`/job-recovery`)
- **System Scan**: Find misplaced job files
- **Job Search**: Search for specific job IDs across all folders
- **Recovery Operations**: Move misplaced files to correct locations

## 📈 **Category Management**

### Priority Levels
1. **AA** - Top Priority (HR urgently needs filled)
2. **A** - Standard JO (Work on all of these)
3. **B** - Lower Priority (Submit based on A/AA work)
4. **C** - On Hold (Temporarily paused)
5. **D** - Filled/On Hold (Filled or client hold)
6. **X** - Closed (Client closed JO)

### Business Rules
- **Hot Jobs**: AA, A categories
- **Warm Jobs**: B category
- **Cold Jobs**: C category
- **Inactive**: D, X categories
- **Missing from MTB**: Automatically marked inactive

## 🔄 **Synchronization Process**

### 1. Download MTB
- Connect to Google Drive
- Download latest MasterTrackingBoard.csv
- Verify file integrity

### 2. Parse and Compare
- Extract job IDs and categories
- Compare with existing database records
- Identify new jobs, updates, and missing jobs

### 3. Update Database
- Add new jobs with initial status
- Update existing jobs with category changes
- Mark missing jobs as inactive
- Create audit trail records

### 4. Generate Report
- Statistics on changes made
- Performance metrics
- Error handling and logging

## 📊 **Monitoring and Reporting**

### Key Metrics
- Total jobs in system
- Active vs inactive jobs
- Jobs by category
- Sync frequency and performance
- Status change frequency

### Views Available
- `active_jobs_view` - Active jobs with current status
- `job_status_summary` - Summary by category
- Historical reports via API

## 🛠️ **Maintenance**

### Regular Tasks
1. **Monitor sync logs** for errors
2. **Review inactive jobs** periodically
3. **Update category definitions** as needed
4. **Archive old sync logs** to maintain performance

### Troubleshooting
- Check Google Drive authentication
- Verify MTB file format hasn't changed
- Monitor database performance
- Review error logs for sync issues

## 🔐 **Security Considerations**

- **API Authentication**: Secure all endpoints
- **Google Drive Access**: Use service account with minimal permissions
- **Database Access**: Limit access to necessary operations
- **Audit Logging**: Track all changes for compliance

## 📝 **Future Enhancements**

1. **Real-time Notifications**: Alert on status changes
2. **Advanced Analytics**: Trend analysis and reporting
3. **Integration**: Connect with other systems
4. **Mobile Interface**: Mobile-friendly management
5. **Automated Workflows**: Trigger actions based on status changes

---

This system provides a robust foundation for managing your job lifecycle with complete traceability and automated synchronization with your Master Tracking Board.

