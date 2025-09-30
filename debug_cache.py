#!/usr/bin/env python3
"""
Cache Debugging Script
This script will help identify why the cache isn't working properly
"""

import os
import json
import hashlib
from pathlib import Path

def get_file_hash(file_path):
    """Get MD5 hash of file content"""
    if not file_path or not os.path.exists(file_path):
        return ""
    
    try:
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except Exception as e:
        print(f"Error hashing file {file_path}: {e}")
        return ""

def debug_cache_issue():
    """Debug the cache issue"""
    cache_dir = Path("/app/data/cache")
    jobs_dir = Path("/app/data/jobs")
    
    print("🔍 CACHE DEBUGGING REPORT")
    print("=" * 50)
    
    # Check cache files
    cache_files = {
        "job_desc": cache_dir / "job_desc_cache_openai.json",
        "notes": cache_dir / "notes_cache_openai.json", 
        "combined": cache_dir / "combined_cache_openai.json",
        "stats": cache_dir / "cache_stats_openai.json"
    }
    
    print("\n📁 CACHE FILES STATUS:")
    for name, file_path in cache_files.items():
        if file_path.exists():
            size = file_path.stat().st_size
            print(f"  ✅ {name}: {size:,} bytes")
        else:
            print(f"  ❌ {name}: Missing")
    
    # Load cache statistics
    if cache_files["stats"].exists():
        with open(cache_files["stats"], 'r') as f:
            stats = json.load(f)
        
        total_requests = (stats["job_desc_cache_hits"] + stats["job_desc_cache_misses"] + 
                         stats["notes_cache_hits"] + stats["notes_cache_misses"] + 
                         stats["combined_cache_hits"] + stats["combined_cache_misses"])
        
        total_hits = stats["job_desc_cache_hits"] + stats["notes_cache_hits"] + stats["combined_cache_hits"]
        hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
        
        print(f"\n📊 CACHE STATISTICS:")
        print(f"  Total Requests: {total_requests}")
        print(f"  Total Hits: {total_hits}")
        print(f"  Hit Rate: {hit_rate:.1f}%")
        print(f"  AI Calls Saved: {stats['ai_calls_saved']}")
    
    # Load job description cache
    if cache_files["job_desc"].exists():
        with open(cache_files["job_desc"], 'r') as f:
            job_desc_cache = json.load(f)
        
        print(f"\n📋 JOB DESCRIPTION CACHE:")
        print(f"  Entries: {len(job_desc_cache)}")
        
        # Check first few entries
        sample_keys = list(job_desc_cache.keys())[:5]
        print(f"  Sample Keys: {sample_keys}")
        
        # Check if any job files match these keys
        print(f"\n🔍 FILE MATCHING ANALYSIS:")
        job_files = list(jobs_dir.glob("*.docx"))[:10]  # Check first 10 files
        
        for job_file in job_files:
            file_hash = get_file_hash(str(job_file))
            job_id = job_file.stem.split('_')[0] if '_' in job_file.stem else job_file.stem.split()[0]
            expected_key = f"{job_id}_{file_hash}"
            
            if expected_key in job_desc_cache:
                print(f"  ✅ {job_file.name} -> {expected_key} (CACHED)")
            else:
                print(f"  ❌ {job_file.name} -> {expected_key} (NOT CACHED)")
    
    # Check for potential issues
    print(f"\n🚨 POTENTIAL ISSUES:")
    
    # Issue 1: File path differences
    print("  1. File path differences between cache creation and lookup")
    
    # Issue 2: File content changes
    print("  2. File content may have changed since caching")
    
    # Issue 3: Cache key generation
    print("  3. Cache key generation may be inconsistent")
    
    # Issue 4: Cache validation
    print("  4. Cache validation logic may be too strict")
    
    print(f"\n💡 RECOMMENDATIONS:")
    print("  1. Fix cache key generation to be more consistent")
    print("  2. Add better logging for cache hits/misses")
    print("  3. Implement cache warming strategy")
    print("  4. Add cache debugging tools")

if __name__ == "__main__":
    debug_cache_issue()

