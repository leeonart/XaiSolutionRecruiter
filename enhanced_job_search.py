#!/usr/bin/env python3
"""
Enhanced Job ID Search Tool

This script performs comprehensive searches for job IDs including:
1. Cross-folder pattern matching (8xxx in 7xxx folders, etc.)
2. Deep recursive search for any job ID in any subfolder
3. Pattern-based search for missing job IDs
4. Database vs file comparison

Usage: python enhanced_job_search.py
"""

import os
import re
import json
import requests
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional

def extract_job_id_from_filename(filename: str) -> Optional[str]:
    """Extract job ID from filename if it contains a number pattern."""
    # Look for patterns like "8697", "7430", etc. anywhere in filename
    patterns = [
        r'^(\d{4,5})',  # At start
        r'(\d{4,5})',   # Anywhere
        r'job[_\s]*(\d{4,5})',  # After "job"
        r'(\d{4,5})[_\s]*job',  # Before "job"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            return match.group(1)
    return None

def get_folder_hierarchy_pattern(path: Path) -> List[str]:
    """Get the folder hierarchy pattern for a path."""
    patterns = []
    for part in path.parts:
        if re.match(r'^\d{4,5}$', part):
            patterns.append(part)
    return patterns

def scan_directory_comprehensive(base_path: str) -> Dict[str, List[Tuple[str, str, List[str]]]]:
    """
    Comprehensive scan of directory for job files.
    
    Returns:
        Dict mapping job_id -> List of (job_id, file_path, folder_patterns)
    """
    results = defaultdict(list)
    base_path = Path(base_path)
    
    if not base_path.exists():
        print(f"Warning: Base path {base_path} does not exist")
        return results
    
    print(f"Scanning directory comprehensively: {base_path}")
    
    # Walk through all files recursively
    for file_path in base_path.rglob('*'):
        if file_path.is_file():
            filename = file_path.name
            
            # Skip system files and temporary files
            if any(skip in filename.lower() for skip in ['.zone.identifier', '.tmp', '.temp', '.log', '.pyc']):
                continue
                
            job_id = extract_job_id_from_filename(filename)
            if job_id:
                folder_patterns = get_folder_hierarchy_pattern(file_path)
                results[job_id].append((job_id, str(file_path), folder_patterns))
    
    return results

def find_pattern_mismatches(results: Dict[str, List[Tuple[str, str, List[str]]]]) -> Dict[str, List[Tuple[str, str, List[str]]]]:
    """
    Find jobs that don't follow expected folder patterns.
    
    Expected patterns:
    - 8xxx jobs should be in folders containing 8xxx
    - 7xxx jobs should be in folders containing 7xxx
    - etc.
    """
    mismatches = defaultdict(list)
    
    for job_id, locations in results.items():
        job_num = int(job_id)
        expected_prefix = str(job_num // 1000)
        
        for job_id, file_path, folder_patterns in locations:
            # Check if any folder pattern matches the expected prefix
            has_correct_pattern = any(pattern.startswith(expected_prefix) for pattern in folder_patterns)
            
            if not has_correct_pattern and folder_patterns:
                mismatches[job_id].append((job_id, file_path, folder_patterns))
    
    return mismatches

def search_for_specific_job_ids(target_job_ids: List[str], base_path: str) -> Dict[str, List[str]]:
    """Search for specific job IDs anywhere in the directory structure."""
    found_locations = defaultdict(list)
    base_path = Path(base_path)
    
    print(f"\nSearching for specific job IDs: {target_job_ids}")
    
    for file_path in base_path.rglob('*'):
        if file_path.is_file():
            filename = file_path.name
            file_content = ""
            
            # Try to read file content for text files
            try:
                if filename.lower().endswith(('.txt', '.docx', '.pdf', '.md')):
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        file_content = f.read(1000)  # Read first 1000 chars
            except:
                pass
            
            # Search in filename and content
            search_text = f"{filename} {file_content}".lower()
            
            for job_id in target_job_ids:
                if job_id.lower() in search_text:
                    found_locations[job_id].append(str(file_path))
    
    return found_locations

def get_database_job_ids() -> Set[str]:
    """Get all job IDs from the database via API."""
    try:
        response = requests.get("http://localhost:8000/api/jobs", timeout=10)
        if response.status_code == 200:
            jobs = response.json()
            return {job['job_id'] for job in jobs}
        else:
            print(f"Warning: Could not fetch jobs from API. Status: {response.status_code}")
            return set()
    except Exception as e:
        print(f"Warning: Could not connect to API: {e}")
        return set()

def analyze_job_8697_specifically():
    """Specific analysis for job 8697 as mentioned in the request."""
    print(f"\n{'='*60}")
    print("SPECIFIC ANALYSIS FOR JOB 8697")
    print(f"{'='*60}")
    
    base_path = Path("/home/leemax/projects/NewCompleteWorking/data")
    
    # Search for 8697 specifically
    found_8697 = []
    for file_path in base_path.rglob('*'):
        if file_path.is_file() and '8697' in file_path.name:
            found_8697.append(str(file_path))
    
    print(f"Files containing '8697' in name:")
    for file_path in found_8697:
        print(f"  - {file_path}")
    
    # Search for 8696 (mentioned as the folder where 8697 might be)
    found_8696 = []
    for file_path in base_path.rglob('*'):
        if file_path.is_file() and '8696' in file_path.name:
            found_8696.append(str(file_path))
    
    print(f"\nFiles containing '8696' in name:")
    for file_path in found_8696:
        print(f"  - {file_path}")
    
    # Check if 8697 is in database
    db_job_ids = get_database_job_ids()
    if '8697' in db_job_ids:
        print(f"\n✅ Job 8697 IS in the database")
    else:
        print(f"\n❌ Job 8697 is NOT in the database")

def main():
    print("=" * 60)
    print("ENHANCED JOB ID SEARCH TOOL")
    print("=" * 60)
    
    # Comprehensive scan
    data_path = "/home/leemax/projects/NewCompleteWorking/data"
    results = scan_directory_comprehensive(data_path)
    
    print(f"\nFound {sum(len(locations) for locations in results.values())} job files for {len(results)} unique job IDs:")
    
    # Group by job ID ranges
    ranges = defaultdict(list)
    for job_id in results.keys():
        prefix = job_id[:1] if len(job_id) >= 4 else "other"
        ranges[prefix].append(job_id)
    
    for prefix, job_ids in sorted(ranges.items()):
        print(f"  {prefix}xxx range: {len(job_ids)} jobs")
    
    # Find pattern mismatches
    mismatches = find_pattern_mismatches(results)
    
    print(f"\n{'='*60}")
    print("FOLDER PATTERN MISMATCHES")
    print(f"{'='*60}")
    
    if mismatches:
        print(f"Found {len(mismatches)} job IDs with folder pattern mismatches:")
        for job_id, locations in sorted(mismatches.items()):
            print(f"\nJob {job_id}:")
            for job_id, file_path, folder_patterns in locations:
                print(f"  - {file_path}")
                print(f"    Folder patterns: {folder_patterns}")
    else:
        print("✅ No folder pattern mismatches found!")
    
    # Specific analysis for job 8697
    analyze_job_8697_specifically()
    
    # Search for missing job IDs from database
    print(f"\n{'='*60}")
    print("DATABASE COMPARISON")
    print(f"{'='*60}")
    
    db_job_ids = get_database_job_ids()
    file_job_ids = set(results.keys())
    
    missing_from_db = file_job_ids - db_job_ids
    missing_from_files = db_job_ids - file_job_ids
    
    if missing_from_files:
        print(f"\nJobs in database but missing from files ({len(missing_from_files)}):")
        for job_id in sorted(missing_from_files):
            print(f"  - {job_id}")
        
        # Search for these missing jobs specifically
        print(f"\nSearching for missing job IDs in all files...")
        found_missing = search_for_specific_job_ids(list(missing_from_files), data_path)
        
        for job_id, locations in found_missing.items():
            if locations:
                print(f"\nFound references to {job_id}:")
                for location in locations:
                    print(f"  - {location}")
            else:
                print(f"\nNo references found for {job_id}")
    
    if missing_from_db:
        print(f"\nJobs found in files but missing from database ({len(missing_from_db)}):")
        for job_id in sorted(missing_from_db):
            print(f"  - {job_id}")
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total unique job IDs found in files: {len(results)}")
    print(f"Total job files found: {sum(len(locations) for locations in results.values())}")
    print(f"Folder pattern mismatches: {len(mismatches)}")
    print(f"Jobs missing from database: {len(missing_from_db)}")
    print(f"Jobs missing from files: {len(missing_from_files)}")
    
    # Save detailed report
    report = {
        "scan_timestamp": str(Path().cwd()),
        "total_unique_jobs": len(results),
        "total_files": sum(len(locations) for locations in results.values()),
        "jobs_by_range": dict(ranges),
        "pattern_mismatches": dict(mismatches),
        "missing_from_db": list(missing_from_db),
        "missing_from_files": list(missing_from_files),
        "all_jobs": dict(results)
    }
    
    report_file = "/home/leemax/projects/NewCompleteWorking/enhanced_job_search_report.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nDetailed report saved to: {report_file}")

if __name__ == "__main__":
    main()




