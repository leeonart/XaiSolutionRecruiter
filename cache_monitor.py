#!/usr/bin/env python3
"""
Cache Monitoring Script - This will monitor cache during real processing
"""

import sys
import os
sys.path.append('/app')

from modules.smart_cache_manager import SmartCacheManager
import time
import requests

def monitor_cache_during_processing():
    """Monitor cache performance during real processing"""
    print("🔍 CACHE MONITORING DURING PROCESSING")
    print("=" * 60)
    
    # Initialize cache manager
    cache_manager = SmartCacheManager()
    
    # Get initial stats
    initial_stats = cache_manager.get_cache_statistics()
    print(f"\n📊 INITIAL CACHE STATS:")
    print(f"  Total Requests: {initial_stats['statistics']['total_requests']}")
    print(f"  Cache Hit Rate: {initial_stats['statistics']['cache_hit_rate']}")
    print(f"  Job Desc Hits: {initial_stats['statistics']['job_desc_cache_hits']}")
    print(f"  Job Desc Misses: {initial_stats['statistics']['job_desc_cache_misses']}")
    
    # Start a small processing job and monitor cache
    print(f"\n🚀 STARTING PROCESSING JOB WITH CACHE MONITORING:")
    
    base_url = "http://localhost:8000"
    test_job_ids = ["8724", "8725", "8726"]  # Jobs we know exist
    
    data = {
        'job_ids': ','.join(test_job_ids),
        'folder_path': '/app/data/jobs',
        'csv_path': '/app/data/MTB/MasterTrackingBoard.csv',
        'ai_agent': 'openai'
    }
    
    print(f"  🎯 Processing jobs: {test_job_ids}")
    
    # Start processing
    try:
        response = requests.post(f"{base_url}/api/process-jobs", data=data)
        if response.status_code == 200:
            result = response.json()
            session_id = result.get('session_id')
            print(f"  ✅ Processing started - Session ID: {session_id}")
            
            # Monitor progress and cache stats
            for i in range(10):  # Monitor for 20 seconds
                time.sleep(2)
                
                # Get progress
                progress_response = requests.get(f"{base_url}/api/job-processing-progress")
                if progress_response.status_code == 200:
                    progress = progress_response.json()
                    if session_id in progress:
                        session_progress = progress[session_id]
                        print(f"    Progress {i+1}: {session_progress.get('completed_jobs', 0)}/{session_progress.get('total_jobs', 0)} jobs completed")
                
                # Get updated cache stats
                updated_stats = cache_manager.get_cache_statistics()
                print(f"    Cache Stats {i+1}: Hit Rate = {updated_stats['statistics']['cache_hit_rate']}")
                
                # Check if processing is complete
                if progress_response.status_code == 200:
                    progress = progress_response.json()
                    if session_id in progress:
                        session_progress = progress[session_id]
                        if session_progress.get('status') == 'completed':
                            print(f"    ✅ Processing completed!")
                            break
        else:
            print(f"  ❌ Processing failed: {response.status_code}")
            print(f"  📝 Response: {response.text}")
    except Exception as e:
        print(f"  ❌ Error during processing: {e}")
    
    # Final cache stats
    final_stats = cache_manager.get_cache_statistics()
    print(f"\n📊 FINAL CACHE STATS:")
    print(f"  Total Requests: {final_stats['statistics']['total_requests']}")
    print(f"  Cache Hit Rate: {final_stats['statistics']['cache_hit_rate']}")
    print(f"  Job Desc Hits: {final_stats['statistics']['job_desc_cache_hits']}")
    print(f"  Job Desc Misses: {final_stats['statistics']['job_desc_cache_misses']}")
    
    # Calculate improvement
    initial_hits = initial_stats['statistics']['job_desc_cache_hits']
    final_hits = final_stats['statistics']['job_desc_cache_hits']
    hits_gained = final_hits - initial_hits
    
    initial_misses = initial_stats['statistics']['job_desc_cache_misses']
    final_misses = final_stats['statistics']['job_desc_cache_misses']
    misses_gained = final_misses - initial_misses
    
    print(f"\n📈 CACHE PERFORMANCE ANALYSIS:")
    print(f"  Cache Hits Gained: {hits_gained}")
    print(f"  Cache Misses Gained: {misses_gained}")
    print(f"  Total Requests: {hits_gained + misses_gained}")
    
    if hits_gained + misses_gained > 0:
        hit_rate_during_test = (hits_gained / (hits_gained + misses_gained)) * 100
        print(f"  Hit Rate During Test: {hit_rate_during_test:.1f}%")
        
        if hit_rate_during_test > 50:
            print(f"  ✅ Cache is working well during processing!")
        elif hit_rate_during_test > 20:
            print(f"  ⚠️  Cache is partially working during processing")
        else:
            print(f"  ❌ Cache is NOT working during processing!")
            print(f"  🚨 CRITICAL ISSUE - Cache system is broken!")
    else:
        print(f"  ⚠️  No cache activity detected during test")

if __name__ == "__main__":
    monitor_cache_during_processing()

