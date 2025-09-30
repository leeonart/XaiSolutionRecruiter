#!/usr/bin/env python3
"""
Job ID Recovery and Cross-Folder Search Tool

This tool implements the requested functionality to:
1. Search for job IDs that might be misplaced in wrong folders
2. Look for 8xxx job IDs in 7xxx folders and vice versa
3. Search all subfolders for missing job IDs
4. Provide recovery options for misplaced files

Usage: python job_recovery_tool.py [--recover]
"""

import os
import re
import json
import shutil
import requests
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional
import argparse

class JobRecoveryTool:
    def __init__(self, base_path: str = "/home/leemax/projects/NewCompleteWorking/data"):
        self.base_path = Path(base_path)
        self.api_base_url = "http://localhost:8000"
        
    def extract_job_id_from_filename(self, filename: str) -> Optional[str]:
        """Extract job ID from filename."""
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

    def get_folder_pattern(self, path: Path) -> str:
        """Get the folder pattern (7xxx, 8xxx, etc.) from path."""
        for part in reversed(path.parts):
            if re.match(r'^\d{4}$', part):
                return part
        return "unknown"

    def scan_for_job_files(self) -> Dict[str, List[Tuple[str, str, str]]]:
        """
        Scan for all job files and categorize by folder pattern.
        
        Returns:
            Dict mapping folder_pattern -> List of (job_id, file_path, relative_path)
        """
        results = defaultdict(list)
        
        print(f"Scanning directory: {self.base_path}")
        
        for file_path in self.base_path.rglob('*'):
            if file_path.is_file():
                filename = file_path.name
                
                # Skip system files
                if any(skip in filename.lower() for skip in ['.zone.identifier', '.tmp', '.temp', '.log', '.pyc']):
                    continue
                    
                job_id = self.extract_job_id_from_filename(filename)
                if job_id:
                    folder_pattern = self.get_folder_pattern(file_path)
                    relative_path = file_path.relative_to(self.base_path)
                    results[folder_pattern].append((job_id, str(file_path), str(relative_path)))
        
        return results

    def find_misplaced_jobs(self, results: Dict[str, List[Tuple[str, str, str]]]) -> Dict[str, List[Tuple[str, str, str]]]:
        """
        Find jobs that are in the wrong folder pattern.
        
        Logic:
        - 8xxx jobs should be in 8xxx folders
        - 7xxx jobs should be in 7xxx folders
        - etc.
        """
        misplaced = defaultdict(list)
        
        for folder_pattern, jobs in results.items():
            if folder_pattern == "unknown":
                continue
                
            folder_num = int(folder_pattern)
            
            for job_id, file_path, relative_path in jobs:
                job_num = int(job_id)
                
                # Determine expected folder pattern
                expected_pattern = f"{(job_num // 1000) * 1000:04d}"
                
                # Check if job is in wrong folder
                if folder_pattern != expected_pattern:
                    misplaced[f"{job_id}_in_{folder_pattern}_should_be_{expected_pattern}"].append(
                        (job_id, file_path, relative_path)
                    )
        
        return misplaced

    def search_for_specific_job_ids(self, target_job_ids: List[str]) -> Dict[str, List[str]]:
        """Search for specific job IDs anywhere in the directory structure."""
        found_locations = defaultdict(list)
        
        print(f"Searching for specific job IDs: {target_job_ids}")
        
        for file_path in self.base_path.rglob('*'):
            if file_path.is_file():
                filename = file_path.name
                
                # Search in filename
                for job_id in target_job_ids:
                    if job_id in filename:
                        found_locations[job_id].append(str(file_path))
        
        return found_locations

    def get_database_job_ids(self) -> Set[str]:
        """Get all job IDs from the database via API."""
        try:
            response = requests.get(f"{self.api_base_url}/api/jobs", timeout=10)
            if response.status_code == 200:
                jobs = response.json()
                return {job['job_id'] for job in jobs}
            else:
                print(f"Warning: Could not fetch jobs from API. Status: {response.status_code}")
                return set()
        except Exception as e:
            print(f"Warning: Could not connect to API: {e}")
            return set()

    def analyze_job_8697_specifically(self):
        """Specific analysis for job 8697 as mentioned in the request."""
        print(f"\n{'='*60}")
        print("SPECIFIC ANALYSIS FOR JOB 8697")
        print(f"{'='*60}")
        
        # Search for 8697 files
        found_8697 = []
        for file_path in self.base_path.rglob('*'):
            if file_path.is_file() and '8697' in file_path.name:
                found_8697.append(str(file_path))
        
        print(f"Files containing '8697' in name:")
        for file_path in found_8697:
            print(f"  - {file_path}")
        
        # Search for 8696 (mentioned as the folder where 8697 might be)
        found_8696 = []
        for file_path in self.base_path.rglob('*'):
            if file_path.is_file() and '8696' in file_path.name:
                found_8696.append(str(file_path))
        
        print(f"\nFiles containing '8696' in name:")
        for file_path in found_8696:
            print(f"  - {file_path}")
        
        # Check if 8697 is in database
        db_job_ids = self.get_database_job_ids()
        if '8697' in db_job_ids:
            print(f"\n✅ Job 8697 IS in the database")
        else:
            print(f"\n❌ Job 8697 is NOT in the database")

    def find_cross_folder_mismatches(self) -> Dict[str, List[Tuple[str, str, str]]]:
        """
        Find jobs that are in wrong folder patterns (8xxx in 7xxx folders, etc.).
        This implements the specific request to search all 8000 folders for 8xxx numbers
        and all 7000 folders for 7xxx numbers.
        """
        print(f"\n{'='*60}")
        print("CROSS-FOLDER PATTERN ANALYSIS")
        print(f"{'='*60}")
        
        results = self.scan_for_job_files()
        misplaced = self.find_misplaced_jobs(results)
        
        # Group by type of mismatch
        mismatch_types = defaultdict(list)
        
        for pattern_key, jobs in misplaced.items():
            parts = pattern_key.split('_')
            job_id = parts[0]
            actual_folder = parts[2]
            expected_folder = parts[4]
            
            mismatch_type = f"{job_id[:1]}xxx_in_{actual_folder[:1]}xxx_folder"
            mismatch_types[mismatch_type].extend(jobs)
        
        return mismatch_types

    def recover_misplaced_files(self, misplaced_jobs: Dict[str, List[Tuple[str, str, str]]], dry_run: bool = True):
        """
        Recover misplaced files by moving them to correct locations.
        
        Args:
            misplaced_jobs: Dictionary of misplaced jobs
            dry_run: If True, only show what would be done without actually moving files
        """
        print(f"\n{'='*60}")
        print(f"{'DRY RUN: ' if dry_run else ''}FILE RECOVERY OPERATIONS")
        print(f"{'='*60}")
        
        if not misplaced_jobs:
            print("No misplaced files found to recover.")
            return
        
        for mismatch_type, jobs in misplaced_jobs.items():
            print(f"\n{mismatch_type}:")
            
            for job_id, file_path, relative_path in jobs:
                job_num = int(job_id)
                expected_folder = f"{(job_num // 1000) * 1000:04d}"
                
                # Determine correct destination
                current_path = Path(file_path)
                correct_folder = self.base_path / expected_folder
                correct_folder.mkdir(exist_ok=True)
                
                destination = correct_folder / current_path.name
                
                print(f"  Job {job_id}:")
                print(f"    From: {file_path}")
                print(f"    To:   {destination}")
                
                if not dry_run:
                    try:
                        shutil.move(str(current_path), str(destination))
                        print(f"    ✅ Moved successfully")
                    except Exception as e:
                        print(f"    ❌ Error moving file: {e}")
                else:
                    print(f"    🔍 Would move (dry run)")

    def generate_recovery_report(self):
        """Generate a comprehensive recovery report."""
        print("=" * 60)
        print("JOB ID RECOVERY AND CROSS-FOLDER SEARCH TOOL")
        print("=" * 60)
        
        # Scan for job files
        results = self.scan_for_job_files()
        
        print(f"\nFound {sum(len(jobs) for jobs in results.values())} job files across {len(results)} folder patterns:")
        for pattern, jobs in sorted(results.items()):
            print(f"  {pattern}: {len(jobs)} jobs")
        
        # Find misplaced jobs
        misplaced = self.find_misplaced_jobs(results)
        
        print(f"\n{'='*60}")
        print("MISPLACED JOB ANALYSIS")
        print(f"{'='*60}")
        
        if misplaced:
            print(f"Found {len(misplaced)} misplaced job patterns:")
            for pattern, jobs in sorted(misplaced.items()):
                print(f"\n{pattern}:")
                for job_id, file_path, relative_path in jobs:
                    print(f"  - {job_id}: {relative_path}")
        else:
            print("✅ No misplaced jobs found!")
        
        # Specific analysis for job 8697
        self.analyze_job_8697_specifically()
        
        # Cross-folder mismatch analysis
        mismatch_types = self.find_cross_folder_mismatches()
        
        if mismatch_types:
            print(f"\nCross-folder mismatches found:")
            for mismatch_type, jobs in mismatch_types.items():
                print(f"  {mismatch_type}: {len(jobs)} files")
        
        # Database comparison
        print(f"\n{'='*60}")
        print("DATABASE COMPARISON")
        print(f"{'='*60}")
        
        db_job_ids = self.get_database_job_ids()
        file_job_ids = set()
        
        for jobs in results.values():
            for job_id, _, _ in jobs:
                file_job_ids.add(job_id)
        
        missing_from_db = file_job_ids - db_job_ids
        missing_from_files = db_job_ids - file_job_ids
        
        if missing_from_files:
            print(f"\nJobs in database but missing from files ({len(missing_from_files)}):")
            for job_id in sorted(missing_from_files):
                print(f"  - {job_id}")
            
            # Search for these missing jobs
            found_missing = self.search_for_specific_job_ids(list(missing_from_files))
            
            for job_id, locations in found_missing.items():
                if locations:
                    print(f"\nFound references to {job_id}:")
                    for location in locations:
                        print(f"  - {location}")
        
        if missing_from_db:
            print(f"\nJobs found in files but missing from database ({len(missing_from_db)}):")
            for job_id in sorted(missing_from_db):
                print(f"  - {job_id}")
        
        # Summary
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print(f"Total job files found: {sum(len(jobs) for jobs in results.values())}")
        print(f"Unique job IDs found: {len(file_job_ids)}")
        print(f"Misplaced job patterns: {len(misplaced)}")
        print(f"Cross-folder mismatches: {len(mismatch_types)}")
        print(f"Jobs missing from database: {len(missing_from_db)}")
        print(f"Jobs missing from files: {len(missing_from_files)}")
        
        return {
            "results": dict(results),
            "misplaced": dict(misplaced),
            "mismatch_types": dict(mismatch_types),
            "missing_from_db": list(missing_from_db),
            "missing_from_files": list(missing_from_files)
        }

def main():
    parser = argparse.ArgumentParser(description="Job ID Recovery and Cross-Folder Search Tool")
    parser.add_argument("--recover", action="store_true", help="Actually move misplaced files (default is dry run)")
    parser.add_argument("--base-path", default="/home/leemax/projects/NewCompleteWorking/data", 
                       help="Base path to search for job files")
    
    args = parser.parse_args()
    
    tool = JobRecoveryTool(args.base_path)
    
    # Generate comprehensive report
    report_data = tool.generate_recovery_report()
    
    # If misplaced files found, offer recovery
    misplaced_jobs = report_data.get("misplaced", {})
    if misplaced_jobs:
        print(f"\n{'='*60}")
        print("RECOVERY OPTIONS")
        print(f"{'='*60}")
        
        if args.recover:
            print("Performing actual file recovery...")
            tool.recover_misplaced_files(misplaced_jobs, dry_run=False)
        else:
            print("To actually move misplaced files, run with --recover flag")
            tool.recover_misplaced_files(misplaced_jobs, dry_run=True)
    
    # Save detailed report
    report_file = "/home/leemax/projects/NewCompleteWorking/job_recovery_report.json"
    with open(report_file, 'w') as f:
        json.dump(report_data, f, indent=2)
    
    print(f"\nDetailed report saved to: {report_file}")

if __name__ == "__main__":
    main()




