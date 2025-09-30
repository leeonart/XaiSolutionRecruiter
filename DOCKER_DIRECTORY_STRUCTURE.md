# Docker Directory Structure

This document explains the directory structure used in the Docker container for file storage and access.

## Directory Structure

```
/app/
├── data/                    # Main data directory (mounted to ./data)
│   └── JobDescription_YYYYMMDD/  # Auto-generated daily folders
│       ├── job_files/       # Downloaded job description files
│       └── processed_files/ # Processed files
├── output/                  # Output directory (mounted to ./output)
│   ├── jobs_YYYYMMDD_optimized.json
│   ├── jobs_YYYYMMDD_final_optimized.json
│   ├── MasterTrackingBoard_YYYYMMDD.csv
│   └── download_report_YYYYMMDD.csv
├── temp/                    # Temporary directory (mounted to ./temp)
│   └── temp_files/         # Temporary processing files
└── backend/                 # Application code
    └── app/
        └── main.py
```

## Volume Mounts

The following directories are mounted as volumes for persistent storage and external access:

- `./data` → `/app/data` - Main data storage
- `./output` → `/app/output` - Generated reports and processed files
- `./temp` → `/app/temp` - Temporary files

## File Naming Conventions

All files follow the same naming conventions as the original `main.py`:

- **Job Description Folders**: `JobDescription_YYYYMMDD` (e.g., `JobDescription_20250906`)
- **Jobs JSON**: `jobs_YYYYMMDD_optimized.json`
- **Final Optimized**: `jobs_YYYYMMDD_final_optimized.json`
- **Master Tracking Board**: `MasterTrackingBoard_YYYYMMDD.csv`
- **Download Reports**: `download_report_YYYYMMDD.csv`

## Accessing Files

### From Host Machine
Files are accessible from the host machine in the following directories:
- `./data/` - Contains all downloaded and processed data
- `./output/` - Contains all generated reports and JSON files
- `./temp/` - Contains temporary files (can be cleaned up)

### From Other Scripts
Other scripts can access files by mounting the same volumes or accessing the host directories directly.

### From Web Interface
The web interface automatically uses the correct Docker paths and saves files to the mounted volumes.

## Environment Variables

The following environment variables control the directory paths:

- `DATA_DIR` - Main data directory (default: `/app/data`)
- `OUTPUT_DIR` - Output directory (default: `/app/output`)
- `TEMP_DIR` - Temporary directory (default: `/app/temp`)

## Example Usage

### Downloading Files from Google Drive
Files downloaded from Google Drive will be saved to:
- `/app/data/JobDescription_20250906/` (inside container)
- `./data/JobDescription_20250906/` (on host machine)

### Generated Reports
All reports and processed files will be saved to:
- `/app/output/` (inside container)
- `./output/` (on host machine)

### Accessing Files from Host
```bash
# View downloaded files
ls ./data/JobDescription_20250906/

# View generated reports
ls ./output/

# View specific files
cat ./output/jobs_20250906_optimized.json
cat ./output/MasterTrackingBoard_20250906.csv
```

## File Permissions

All directories are created with proper permissions for the application user, and files are accessible for reading and writing from both inside the container and from the host machine.




