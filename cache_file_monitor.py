#!/usr/bin/env python3
"""
Cache File Monitor - Monitor the actual cache statistics file during processing
"""

import json
import time
import requests
import os

def monitor_cache_file_during_processing():
    """Monitor the actual cache statistics file during processing"""
    print("🔍 CACHE FILE MONITORING TEST")
    print("=" * 60)
    
    cache_stats_file = "/app/data/cache/cache_stats_openai.json"
    
    # Get initial stats from file
    def get_stats_from_file():
        try:
            with open(cache_stats_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading cache stats file: {e}")
            return None
    
    initial_stats = get_stats_from_file()
    if initial_stats:
        print(f"\n📊 INITIAL CACHE STATS FROM FILE:")
        print(f"  Total Requests: {initial_stats['job_desc_cache_hits'] + initial_stats['job_desc_cache_misses'] + initial_stats['notes_cache_hits'] + initial_stats['notes_cache_misses'] + initial_stats['combined_cache_hits'] + initial_stats['combined_cache_misses']}")
        print(f"  Job Desc Hits: {initial_stats['job_desc_cache_hits']}")
        print(f"  Job Desc Misses: {initial_stats['job_desc_cache_misses']}")
        print(f"  Combined Hits: {initial_stats['combined_cache_hits']}")
        print(f"  Combined Misses: {initial_stats['combined_cache_misses']}")
    
    # Start processing and monitor file changes
    print(f"\n🚀 STARTING PROCESSING WITH FILE MONITORING:")
    
    base_url = "http://localhost:8000"
    test_job_ids = ["8724"]
    
    data = {
        'job_ids': ','.join(test_job_ids),
        'folder_path': '/app/data/jobs',
        'csv_path': '/app/data/MTB/MasterTrackingBoard.csv',
        'ai_agent': 'openai'
    }
    
    print(f"  🎯 Processing job: {test_job_ids[0]}")
    
    # Start processing
    try:
        response = requests.post(f"{base_url}/api/process-jobs", data=data)
        if response.status_code == 200:
            result = response.json()
            session_id = result.get('session_id')
            print(f"  ✅ Processing started - Session ID: {session_id}")
            
            # Monitor file changes every second
            for i in range(15):  # Monitor for 15 seconds
                time.sleep(1)
                
                current_stats = get_stats_from_file()
                if current_stats:
                    total_requests = (current_stats['job_desc_cache_hits'] + 
                                    current_stats['job_desc_cache_misses'] + 
                                    current_stats['notes_cache_hits'] + 
                                    current_stats['notes_cache_misses'] + 
                                    current_stats['combined_cache_hits'] + 
                                    current_stats['combined_cache_misses'])
                    
                    print(f"    Time {i+1}s: Requests={total_requests}, Job Desc Hits={current_stats['job_desc_cache_hits']}, Combined Hits={current_stats['combined_cache_hits']}")
                
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
            print(f"  📝 Response: {response.text}")
    except Exception as e:
        print(f"  ❌ Error during processing: {e}")
    
    # Final stats
    final_stats = get_stats_from_file()
    if final_stats and initial_stats:
        print(f"\n📈 CACHE PERFORMANCE ANALYSIS:")
        
        hits_gained = final_stats['job_desc_cache_hits'] - initial_stats['job_desc_cache_hits']
        misses_gained = final_stats['job_desc_cache_misses'] - initial_stats['job_desc_cache_misses']
        combined_hits_gained = final_stats['combined_cache_hits'] - initial_stats['combined_cache_hits']
        combined_misses_gained = final_stats['combined_cache_misses'] - initial_stats['combined_cache_misses']
        
        print(f"  Job Desc Hits Gained: {hits_gained}")
        print(f"  Job Desc Misses Gained: {misses_gained}")
        print(f"  Combined Hits Gained: {combined_hits_gained}")
        print(f"  Combined Misses Gained: {combined_misses_gained}")
        
        total_activity = hits_gained + misses_gained + combined_hits_gained + combined_misses_gained
        
        if total_activity > 0:
            print(f"  Total Cache Activity: {total_activity}")
            print(f"  ✅ Cache is being used during processing!")
        else:
            print(f"  ❌ No cache activity detected!")
            print(f"  🚨 CRITICAL ISSUE - Cache is not being called!")

if __name__ == "__main__":
    monitor_cache_file_during_processing()

