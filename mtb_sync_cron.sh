#!/bin/bash
# MTB Sync Cron Job Wrapper
# This script runs the MTB synchronization process and logs the results

# Set up environment
export PATH="/usr/local/bin:/usr/bin:/bin"
cd /home/leemax/projects/NewCompleteWorking

# Log file with timestamp
LOG_FILE="/home/leemax/projects/NewCompleteWorking/logs/mtb_sync_$(date +%Y%m%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Start sync
log_with_timestamp "Starting MTB synchronization..."

# Run the sync via API
RESPONSE=$(curl -s -X POST "http://localhost:8000/api/mtb-sync/run" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    # Parse the response to extract key metrics
    JOBS_FOUND=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('jobs_found', 0))" 2>/dev/null || echo "0")
    JOBS_ADDED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('jobs_added', 0))" 2>/dev/null || echo "0")
    JOBS_UPDATED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('jobs_updated', 0))" 2>/dev/null || echo "0")
    JOBS_INACTIVE=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('jobs_marked_inactive', 0))" 2>/dev/null || echo "0")
    CATEGORY_CHANGES=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('category_changes', 0))" 2>/dev/null || echo "0")
    
    log_with_timestamp "MTB sync completed successfully"
    log_with_timestamp "Jobs found: $JOBS_FOUND, Added: $JOBS_ADDED, Updated: $JOBS_UPDATED, Marked inactive: $JOBS_INACTIVE, Category changes: $CATEGORY_CHANGES"
    
    # Log full response for debugging
    log_with_timestamp "Full response: $RESPONSE"
    
    # Send notification if there were significant changes
    if [ "$JOBS_ADDED" -gt 0 ] || [ "$JOBS_INACTIVE" -gt 0 ] || [ "$CATEGORY_CHANGES" -gt 0 ]; then
        log_with_timestamp "ALERT: Significant changes detected - Jobs added: $JOBS_ADDED, Inactive: $JOBS_INACTIVE, Category changes: $CATEGORY_CHANGES"
    fi
else
    log_with_timestamp "ERROR: MTB sync failed with exit code $EXIT_CODE"
    log_with_timestamp "Error response: $RESPONSE"
fi

# Check if backend is running
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/health" 2>/dev/null)
if [ "$BACKEND_STATUS" != "200" ]; then
    log_with_timestamp "WARNING: Backend appears to be down (HTTP $BACKEND_STATUS)"
fi

log_with_timestamp "MTB sync cron job completed"




