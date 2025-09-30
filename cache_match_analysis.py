#!/usr/bin/env python3
"""
Cache Match Analysis - Count job descriptions and notes with cache matches
"""

import sys
import os
sys.path.append('/app')

from modules.smart_cache_manager import SmartCacheManager
import json
import glob

def analyze_cache_matches():
    """Analyze how many job descriptions and notes have cache matches"""
    print("📊 CACHE MATCH ANALYSIS")
    print("=" * 60)
    
    # Initialize cache manager
    cache_manager = SmartCacheManager()
    
    # Get cache statistics
    stats = cache_manager.get_cache_statistics()
    print(f"\n📈 CURRENT CACHE STATISTICS:")
    print(f"  Total Requests: {stats['statistics']['total_requests']}")
    print(f"  Cache Hit Rate: {stats['statistics']['cache_hit_rate']}")
    print(f"  Job Desc Hits: {stats['statistics']['job_desc_cache_hits']}")
    print(f"  Job Desc Misses: {stats['statistics']['job_desc_cache_misses']}")
    print(f"  Notes Hits: {stats['statistics']['notes_cache_hits']}")
    print(f"  Notes Misses: {stats['statistics']['notes_cache_misses']}")
    print(f"  Combined Hits: {stats['statistics']['combined_cache_hits']}")
    print(f"  Combined Misses: {stats['statistics']['combined_cache_misses']}")
    print(f"  AI Calls Saved: {stats['statistics']['ai_calls_saved']}")
    
    # Analyze cache contents
    print(f"\n🔍 CACHE CONTENTS ANALYSIS:")
    
    # Job Description Cache Analysis
    job_desc_cache = cache_manager.caches["job_description"]
    print(f"\n📄 JOB DESCRIPTION CACHE:")
    print(f"  Total cached entries: {len(job_desc_cache)}")
    
    # Extract unique job IDs from cache keys
    job_desc_job_ids = set()
    for cache_key in job_desc_cache.keys():
        job_id = cache_key.split('_')[0]
        job_desc_job_ids.add(job_id)
    
    print(f"  Unique job IDs cached: {len(job_desc_job_ids)}")
    print(f"  Sample cached job IDs: {sorted(list(job_desc_job_ids))[:10]}")
    
    # Notes Cache Analysis
    notes_cache = cache_manager.caches["notes"]
    print(f"\n📝 NOTES CACHE:")
    print(f"  Total cached entries: {len(notes_cache)}")
    
    # Extract unique job IDs from cache keys
    notes_job_ids = set()
    for cache_key in notes_cache.keys():
        job_id = cache_key.split('_')[0]
        notes_job_ids.add(job_id)
    
    print(f"  Unique job IDs cached: {len(notes_job_ids)}")
    print(f"  Sample cached job IDs: {sorted(list(notes_job_ids))[:10]}")
    
    # Combined Cache Analysis
    combined_cache = cache_manager.caches["combined_analysis"]
    print(f"\n🔄 COMBINED CACHE:")
    print(f"  Total cached entries: {len(combined_cache)}")
    
    # Extract unique job IDs from cache keys
    combined_job_ids = set()
    for cache_key in combined_cache.keys():
        job_id = cache_key.split('_')[0]
        combined_job_ids.add(job_id)
    
    print(f"  Unique job IDs cached: {len(combined_job_ids)}")
    print(f"  Sample cached job IDs: {sorted(list(combined_job_ids))[:10]}")
    
    # Find jobs with both job description and notes cached
    jobs_with_both = job_desc_job_ids.intersection(notes_job_ids)
    print(f"\n🎯 JOBS WITH BOTH JOB DESCRIPTION AND NOTES CACHED:")
    print(f"  Count: {len(jobs_with_both)}")
    print(f"  Job IDs: {sorted(list(jobs_with_both))}")
    
    # Find jobs with only job description cached
    jobs_desc_only = job_desc_job_ids - notes_job_ids
    print(f"\n📄 JOBS WITH ONLY JOB DESCRIPTION CACHED:")
    print(f"  Count: {len(jobs_desc_only)}")
    print(f"  Job IDs: {sorted(list(jobs_desc_only))}")
    
    # Find jobs with only notes cached
    jobs_notes_only = notes_job_ids - job_desc_job_ids
    print(f"\n📝 JOBS WITH ONLY NOTES CACHED:")
    print(f"  Count: {len(jobs_notes_only)}")
    print(f"  Job IDs: {sorted(list(jobs_notes_only))}")
    
    # Analyze actual files in the jobs directory
    print(f"\n📁 ACTUAL FILES ANALYSIS:")
    jobs_dir = "/app/data/jobs"
    
    if os.path.exists(jobs_dir):
        # Find all job files
        all_files = os.listdir(jobs_dir)
        
        # Separate job descriptions and notes
        job_desc_files = [f for f in all_files if 'note' not in f.lower() and f.endswith(('.docx', '.pdf', '.txt'))]
        notes_files = [f for f in all_files if 'note' in f.lower() and f.endswith(('.docx', '.pdf', '.txt'))]
        
        print(f"  Total files in jobs directory: {len(all_files)}")
        print(f"  Job description files: {len(job_desc_files)}")
        print(f"  Notes files: {len(notes_files)}")
        
        # Extract job IDs from filenames
        job_desc_file_job_ids = set()
        for file in job_desc_files:
            # Extract job ID from filename (first part before space)
            job_id = file.split()[0] if file.split() else file
            job_desc_file_job_ids.add(job_id)
        
        notes_file_job_ids = set()
        for file in notes_files:
            # Extract job ID from filename (first part before space)
            job_id = file.split()[0] if file.split() else file
            notes_file_job_ids.add(job_id)
        
        print(f"  Unique job IDs with job description files: {len(job_desc_file_job_ids)}")
        print(f"  Unique job IDs with notes files: {len(notes_file_job_ids)}")
        
        # Calculate cache coverage
        print(f"\n📊 CACHE COVERAGE ANALYSIS:")
        
        # Job Description Coverage
        job_desc_cached = job_desc_file_job_ids.intersection(job_desc_job_ids)
        job_desc_coverage = (len(job_desc_cached) / len(job_desc_file_job_ids) * 100) if job_desc_file_job_ids else 0
        print(f"  Job Description Cache Coverage: {len(job_desc_cached)}/{len(job_desc_file_job_ids)} ({job_desc_coverage:.1f}%)")
        
        # Notes Coverage
        notes_cached = notes_file_job_ids.intersection(notes_job_ids)
        notes_coverage = (len(notes_cached) / len(notes_file_job_ids) * 100) if notes_file_job_ids else 0
        print(f"  Notes Cache Coverage: {len(notes_cached)}/{len(notes_file_job_ids)} ({notes_coverage:.1f}%)")
        
        # Combined Coverage
        combined_cached = job_desc_file_job_ids.intersection(combined_job_ids)
        combined_coverage = (len(combined_cached) / len(job_desc_file_job_ids) * 100) if job_desc_file_job_ids else 0
        print(f"  Combined Cache Coverage: {len(combined_cached)}/{len(job_desc_file_job_ids)} ({combined_coverage:.1f}%)")
        
        # Show which jobs are not cached
        job_desc_not_cached = job_desc_file_job_ids - job_desc_job_ids
        notes_not_cached = notes_file_job_ids - notes_job_ids
        
        print(f"\n❌ JOBS NOT CACHED:")
        print(f"  Job Descriptions not cached: {len(job_desc_not_cached)}")
        if job_desc_not_cached:
            print(f"    Job IDs: {sorted(list(job_desc_not_cached))[:10]}")
        print(f"  Notes not cached: {len(notes_not_cached)}")
        if notes_not_cached:
            print(f"    Job IDs: {sorted(list(notes_not_cached))[:10]}")
    
    # Summary
    print(f"\n🎯 SUMMARY:")
    print(f"  Job Descriptions with cache matches: {len(job_desc_job_ids)}")
    print(f"  Notes with cache matches: {len(notes_job_ids)}")
    print(f"  Jobs with both cached: {len(jobs_with_both)}")
    print(f"  Total unique jobs cached: {len(job_desc_job_ids.union(notes_job_ids))}")
    
    # Calculate potential cache hits for future processing
    total_jobs = len(job_desc_job_ids.union(notes_job_ids))
    if total_jobs > 0:
        print(f"\n💡 CACHE PERFORMANCE PREDICTION:")
        print(f"  If processing {total_jobs} jobs:")
        print(f"  Expected job description cache hits: {len(job_desc_job_ids)}")
        print(f"  Expected notes cache hits: {len(notes_job_ids)}")
        print(f"  Expected combined cache hits: {len(combined_job_ids)}")
        print(f"  Total expected cache hits: {len(job_desc_job_ids) + len(notes_job_ids) + len(combined_job_ids)}")
        print(f"  Expected AI calls saved: {len(job_desc_job_ids) + len(notes_job_ids) + len(combined_job_ids)}")

if __name__ == "__main__":
    analyze_cache_matches()

