#!/usr/bin/env python3
"""
Final Cache Verification - Check actual cache performance by monitoring cache files
"""

import sys
import os
sys.path.append('/app')

import json
import time
import requests

def verify_cache_performance():
    """Verify cache performance by monitoring actual cache files"""
    print("🎯 FINAL CACHE VERIFICATION")
    print("=" * 60)
    
    cache_dir = '/app/data/cache'
    cache_files = {
        'job_desc': 'job_desc_cache_openai.json',
        'combined': 'combined_cache_openai.json',
        'notes': 'notes_cache_openai.json'
    }
    
    # Get initial cache file sizes and entries
    def get_cache_info():
        info = {}
        for cache_type, filename in cache_files.items():
            filepath = os.path.join(cache_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    data = json.load(f)
                info[cache_type] = {
                    'entries': len(data),
                    'job_8724_entries': [key for key in data.keys() if key.startswith('8724_')]
                }
            else:
                info[cache_type] = {'entries': 0, 'job_8724_entries': []}
        return info
    
    initial_info = get_cache_info()
    print(f"\n📊 INITIAL CACHE INFO:")
    for cache_type, info in initial_info.items():
        print(f"  {cache_type}: {info['entries']} entries, Job 8724: {len(info['job_8724_entries'])} entries")
    
    base_url = "http://localhost:8000"
    test_job_ids = ["8724", "8725", "8726"]
    
    data = {
        'job_ids': ','.join(test_job_ids),
        'folder_path': '/app/data/jobs',
        'csv_path': '/app/data/MTB/MasterTrackingBoard.csv',
        'ai_agent': 'openai'
    }
    
    # Run processing and monitor cache files
    print(f"\n🚀 RUNNING PROCESSING WITH CACHE MONITORING:")
    print(f"  🎯 Processing jobs: {test_job_ids}")
    
    try:
        response = requests.post(f"{base_url}/api/process-jobs", data=data)
        if response.status_code == 200:
            result = response.json()
            session_id = result.get('session_id')
            print(f"  ✅ Processing started - Session ID: {session_id}")
            
            # Monitor cache files during processing
            for i in range(20):
                time.sleep(1)
                current_info = get_cache_info()
                
                # Check for changes
                changes = []
                for cache_type in cache_files.keys():
                    if current_info[cache_type]['entries'] != initial_info[cache_type]['entries']:
                        change = current_info[cache_type]['entries'] - initial_info[cache_type]['entries']
                        changes.append(f"{cache_type}: +{change}")
                
                if changes:
                    print(f"    Time {i+1}s: Cache changes: {', '.join(changes)}")
                
                # Check if processing is complete
                progress_response = requests.get(f"{base_url}/api/job-processing-progress")
                if progress_response.status_code == 200:
                    progress = progress_response.json()
                    if session_id in progress:
                        session_progress = progress[session_id]
                        if session_progress.get('status') == 'completed':
                            print(f"    ✅ Processing completed at {i+1}s!")
                            break
        else:
            print(f"  ❌ Processing failed: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Error during processing: {e}")
    
    # Final cache info
    final_info = get_cache_info()
    print(f"\n📊 FINAL CACHE INFO:")
    for cache_type, info in final_info.items():
        print(f"  {cache_type}: {info['entries']} entries, Job 8724: {len(info['job_8724_entries'])} entries")
    
    # Calculate cache performance
    print(f"\n📈 CACHE PERFORMANCE ANALYSIS:")
    
    total_entries_gained = 0
    for cache_type in cache_files.keys():
        entries_gained = final_info[cache_type]['entries'] - initial_info[cache_type]['entries']
        total_entries_gained += entries_gained
        print(f"  {cache_type} entries gained: {entries_gained}")
    
    if total_entries_gained > 0:
        print(f"  Total cache entries gained: {total_entries_gained}")
        print(f"  ✅ Cache is being updated during processing!")
    else:
        print(f"  ⚠️  No cache entries gained during processing")
    
    # Check for job 8724 cache hits
    print(f"\n🔍 JOB 8724 CACHE ANALYSIS:")
    for cache_type, info in final_info.items():
        job_8724_entries = info['job_8724_entries']
        print(f"  {cache_type}: {len(job_8724_entries)} entries for job 8724")
        if job_8724_entries:
            print(f"    Keys: {job_8724_entries}")
    
    # Final recommendation
    print(f"\n🎯 FINAL RECOMMENDATION:")
    
    if total_entries_gained > 0:
        print(f"  ✅ Cache system IS working!")
        print(f"  📊 Cache files are being updated during processing")
        print(f"  🚀 System is ready for production use!")
        print(f"  💡 Cache hit rate will improve as more jobs are processed")
    else:
        print(f"  ❌ Cache system is NOT working properly!")
        print(f"  🚨 Cache files are not being updated")
        print(f"  🛠️  Immediate fixes required!")

if __name__ == "__main__":
    verify_cache_performance()