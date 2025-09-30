#!/bin/bash
# MTB Sync Cron Job Wrapper

cd /home/leemax/projects/NewCompleteWorking
LOG_FILE="/home/leemax/projects/NewCompleteWorking/logs/mtb_sync_$(date +%Y%m%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting MTB synchronization..." >> "$LOG_FILE"

RESPONSE=$(curl -s -X POST "http://localhost:8000/api/mtb-sync/run" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] MTB sync completed successfully" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Response: $RESPONSE" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: MTB sync failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] MTB sync cron job completed" >> "$LOG_FILE"
