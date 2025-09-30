-- Enhanced Job Management Schema for MTB Tracking
-- This schema handles job lifecycle, status changes, and MTB synchronization

-- Job Status Categories Table
CREATE TABLE IF NOT EXISTS job_status_categories (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(2) NOT NULL UNIQUE,
    category_name VARCHAR(50) NOT NULL,
    description TEXT,
    priority_level INTEGER NOT NULL, -- 1=highest (AA), 6=lowest (X)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the standard categories
INSERT INTO job_status_categories (category_code, category_name, description, priority_level) VALUES
('AA', 'Top Priority', 'HR very urgently needs filled', 1),
('A', 'Standard JO', 'Work on all of these', 2),
('B', 'Lower Priority', 'Submit candidates based on work done on A or AA JOs', 3),
('C', 'On Hold', 'JO on hold temporarily for cause', 4),
('D', 'Filled/On Hold', 'Filled by our people or client said JO is on hold', 5),
('X', 'Closed', 'Client closed JO', 6)
ON CONFLICT (category_code) DO NOTHING;

-- Enhanced Jobs table with MTB tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS current_category VARCHAR(2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS inactive_date TIMESTAMP NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_mtb_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS mtb_appearances INTEGER DEFAULT 1;

-- Job Status History Table - tracks all status changes
CREATE TABLE IF NOT EXISTS job_status_history (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    old_category VARCHAR(2),
    new_category VARCHAR(2) NOT NULL,
    change_reason TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mtb_sync_id INTEGER -- Reference to which MTB sync caused this change
);

-- MTB Sync Log Table - tracks each time we sync with Google Drive
CREATE TABLE IF NOT EXISTS mtb_sync_log (
    id SERIAL PRIMARY KEY,
    sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_hash VARCHAR(64),
    jobs_found INTEGER DEFAULT 0,
    jobs_added INTEGER DEFAULT 0,
    jobs_updated INTEGER DEFAULT 0,
    jobs_marked_inactive INTEGER DEFAULT 0,
    sync_status VARCHAR(20) DEFAULT 'success', -- success, error, partial
    error_message TEXT,
    sync_duration_ms INTEGER
);

-- Job MTB Tracking Table - detailed tracking of each job in each MTB sync
CREATE TABLE IF NOT EXISTS job_mtb_tracking (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    mtb_sync_id INTEGER NOT NULL REFERENCES mtb_sync_log(id),
    category VARCHAR(2),
    is_present BOOLEAN DEFAULT TRUE,
    row_number INTEGER,
    raw_data JSONB, -- Store the raw row data for debugging
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_current_category ON jobs(current_category);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_last_mtb_seen ON jobs(last_mtb_seen);
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_status_history_changed_at ON job_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_job_mtb_tracking_job_id ON job_mtb_tracking(job_id);
CREATE INDEX IF NOT EXISTS idx_job_mtb_tracking_mtb_sync_id ON job_mtb_tracking(mtb_sync_id);

-- Function to update job status and create history record
CREATE OR REPLACE FUNCTION update_job_status(
    p_job_id INTEGER,
    p_new_category VARCHAR(2),
    p_change_reason TEXT DEFAULT NULL,
    p_changed_by VARCHAR(100) DEFAULT 'system',
    p_mtb_sync_id INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_old_category VARCHAR(2);
BEGIN
    -- Get current category
    SELECT current_category INTO v_old_category FROM jobs WHERE id = p_job_id;
    
    -- Update job record
    UPDATE jobs 
    SET current_category = p_new_category,
        last_mtb_seen = CURRENT_TIMESTAMP,
        is_active = CASE 
            WHEN p_new_category IN ('X') THEN FALSE 
            ELSE TRUE 
        END,
        inactive_date = CASE 
            WHEN p_new_category IN ('X') THEN CURRENT_TIMESTAMP 
            ELSE NULL 
        END
    WHERE id = p_job_id;
    
    -- Create history record if category changed
    IF v_old_category IS DISTINCT FROM p_new_category THEN
        INSERT INTO job_status_history (job_id, old_category, new_category, change_reason, changed_by, mtb_sync_id)
        VALUES (p_job_id, v_old_category, p_new_category, p_change_reason, p_changed_by, p_mtb_sync_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to mark jobs as inactive that are no longer in MTB
CREATE OR REPLACE FUNCTION mark_missing_jobs_inactive(p_mtb_sync_id INTEGER) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Mark jobs as inactive that haven't been seen in the last sync
    UPDATE jobs 
    SET is_active = FALSE,
        inactive_date = CURRENT_TIMESTAMP
    WHERE is_active = TRUE 
    AND id NOT IN (
        SELECT DISTINCT job_id 
        FROM job_mtb_tracking 
        WHERE mtb_sync_id = p_mtb_sync_id 
        AND is_present = TRUE
    );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Create history records for jobs marked inactive
    INSERT INTO job_status_history (job_id, old_category, new_category, change_reason, changed_by, mtb_sync_id)
    SELECT id, current_category, 'INACTIVE', 'No longer present in MTB', 'system', p_mtb_sync_id
    FROM jobs 
    WHERE is_active = FALSE 
    AND inactive_date = CURRENT_TIMESTAMP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- View for active jobs with current status
CREATE OR REPLACE VIEW active_jobs_view AS
SELECT 
    j.*,
    jsc.category_name,
    jsc.description as category_description,
    jsc.priority_level,
    CASE 
        WHEN j.current_category IN ('AA', 'A') THEN 'Hot'
        WHEN j.current_category = 'B' THEN 'Warm'
        WHEN j.current_category = 'C' THEN 'Cold'
        WHEN j.current_category = 'D' THEN 'Filled/Hold'
        WHEN j.current_category = 'X' THEN 'Closed'
        ELSE 'Unknown'
    END as priority_status
FROM jobs j
LEFT JOIN job_status_categories jsc ON j.current_category = jsc.category_code
WHERE j.is_active = TRUE
ORDER BY jsc.priority_level, j.last_mtb_seen DESC;

-- View for job status summary
CREATE OR REPLACE VIEW job_status_summary AS
SELECT 
    jsc.category_code,
    jsc.category_name,
    COUNT(j.id) as total_jobs,
    COUNT(CASE WHEN j.is_active THEN 1 END) as active_jobs,
    COUNT(CASE WHEN NOT j.is_active THEN 1 END) as inactive_jobs,
    MAX(j.last_mtb_seen) as last_seen
FROM job_status_categories jsc
LEFT JOIN jobs j ON jsc.category_code = j.current_category
GROUP BY jsc.category_code, jsc.category_name, jsc.priority_level
ORDER BY jsc.priority_level;