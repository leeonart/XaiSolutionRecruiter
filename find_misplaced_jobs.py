#!/usr/bin/env python3
"""
Job ID Cross-Folder Search Tool

This script searches for job IDs that might be misplaced in wrong folders.
It looks for patterns like:
- 8xxx job IDs in 7xxx folders
- 7xxx job IDs in 8xxx folders
- Any job ID in unexpected parent directories

Usage: python find_misplaced_jobs.py
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple

def extract_job_id_from_filename(filename: str) -> str:
    """Extract job ID from filename if it starts with a number."""
    # Look for patterns like "8697", "7430", etc. at the start of filename
    match = re.match(r'^(\d{4,5})', filename)
    if match:
        return match.group(1)
    return None

def get_parent_folder_pattern(path: Path) -> str:
    """Determine the parent folder pattern (7xxx, 8xxx, etc.)."""
    # Look at parent directories to find patterns like 7000, 8000, etc.
    for part in reversed(path.parts):
        if re.match(r'^\d{4}$', part):
            return part
    return "unknown"

def scan_directory_for_jobs(base_path: str) -> Dict[str, List[Tuple[str, str]]]:
    """
    Scan directory for job files and categorize by parent folder pattern.
    
    Returns:
        Dict mapping parent_folder_pattern -> List of (job_id, file_path)
    """
    results = defaultdict(list)
    base_path = Path(base_path)
    
    if not base_path.exists():
        print(f"Warning: Base path {base_path} does not exist")
        return results
    
    print(f"Scanning directory: {base_path}")
    
    # Walk through all files recursively
    for file_path in base_path.rglob('*'):
        if file_path.is_file():
            filename = file_path.name
            
            # Skip system files and temporary files
            if any(skip in filename.lower() for skip in ['.zone.identifier', '.tmp', '.temp', '.log']):
                continue
                
            job_id = extract_job_id_from_filename(filename)
            if job_id:
                parent_pattern = get_parent_folder_pattern(file_path)
                results[parent_pattern].append((job_id, str(file_path)))
    
    return results

def find_misplaced_jobs(results: Dict[str, List[Tuple[str, str]]]) -> Dict[str, List[Tuple[str, str]]]:
    """
    Find jobs that are in the wrong parent folder pattern.
    
    Logic:
    - 8xxx jobs should be in 8000+ folders
    - 7xxx jobs should be in 7000+ folders
    - 6xxx jobs should be in 6000+ folders
    - etc.
    """
    misplaced = defaultdict(list)
    
    for parent_pattern, jobs in results.items():
        if parent_pattern == "unknown":
            continue
            
        parent_num = int(parent_pattern)
        
        for job_id, file_path in jobs:
            job_num = int(job_id)
            
            # Determine expected parent folder
            expected_parent = f"{(job_num // 1000) * 1000:04d}"
            
            # Check if job is in wrong folder
            if parent_pattern != expected_parent:
                misplaced[f"{job_id}_in_{parent_pattern}_should_be_{expected_parent}"].append((job_id, file_path))
    
    return misplaced

def get_database_job_ids() -> Set[str]:
    """Get all job IDs from the database via API."""
    import requests
    
    try:
        response = requests.get("http://localhost:8000/api/jobs")
        if response.status_code == 200:
            jobs = response.json()
            return {job['job_id'] for job in jobs}
        else:
            print(f"Warning: Could not fetch jobs from API. Status: {response.status_code}")
            return set()
    except Exception as e:
        print(f"Warning: Could not connect to API: {e}")
        return set()

def main():
    print("=" * 60)
    print("JOB ID CROSS-FOLDER SEARCH TOOL")
    print("=" * 60)
    
    # Scan the data directory
    data_path = "/home/leemax/projects/NewCompleteWorking/data"
    results = scan_directory_for_jobs(data_path)
    
    print(f"\nFound {sum(len(jobs) for jobs in results.values())} job files across {len(results)} folder patterns:")
    for pattern, jobs in sorted(results.items()):
        print(f"  {pattern}: {len(jobs)} jobs")
    
    # Find misplaced jobs
    misplaced = find_misplaced_jobs(results)
    
    print(f"\n{'='*60}")
    print("MISPLACED JOB ANALYSIS")
    print(f"{'='*60}")
    
    if misplaced:
        print(f"\nFound {len(misplaced)} misplaced job patterns:")
        for pattern, jobs in sorted(misplaced.items()):
            print(f"\n{pattern}:")
            for job_id, file_path in jobs:
                print(f"  - {job_id}: {file_path}")
    else:
        print("\n✅ No misplaced jobs found!")
    
    # Check against database
    print(f"\n{'='*60}")
    print("DATABASE COMPARISON")
    print(f"{'='*60}")
    
    db_job_ids = get_database_job_ids()
    file_job_ids = set()
    
    for jobs in results.values():
        for job_id, _ in jobs:
            file_job_ids.add(job_id)
    
    missing_from_db = file_job_ids - db_job_ids
    missing_from_files = db_job_ids - file_job_ids
    
    if missing_from_db:
        print(f"\nJobs found in files but missing from database ({len(missing_from_db)}):")
        for job_id in sorted(missing_from_db):
            print(f"  - {job_id}")
    
    if missing_from_files:
        print(f"\nJobs in database but missing from files ({len(missing_from_files)}):")
        for job_id in sorted(missing_from_files):
            print(f"  - {job_id}")
    
    if not missing_from_db and not missing_from_files:
        print("\n✅ All jobs are properly synchronized between files and database!")
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total job files found: {sum(len(jobs) for jobs in results.values())}")
    print(f"Misplaced job patterns: {len(misplaced)}")
    print(f"Jobs missing from database: {len(missing_from_db)}")
    print(f"Jobs missing from files: {len(missing_from_files)}")
    
    # Save detailed report
    report = {
        "scan_timestamp": str(Path().cwd()),
        "total_files": sum(len(jobs) for jobs in results.values()),
        "folder_patterns": {k: len(v) for k, v in results.items()},
        "misplaced_jobs": dict(misplaced),
        "missing_from_db": list(missing_from_db),
        "missing_from_files": list(missing_from_files),
        "all_jobs_by_folder": dict(results)
    }
    
    report_file = "/home/leemax/projects/NewCompleteWorking/job_search_report.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nDetailed report saved to: {report_file}")

if __name__ == "__main__":
    main()




