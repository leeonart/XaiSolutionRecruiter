#!/usr/bin/env python3
"""
Final Cache System Verification - Complete test of cache and statistics
"""

import sys
import os
sys.path.append('/app')

from modules.smart_cache_manager import SmartCacheManager
import requests
import time
import json

def final_cache_verification():
    """Final comprehensive verification of cache system"""
    print("🎯 FINAL CACHE SYSTEM VERIFICATION")
    print("=" * 60)
    
    # Initialize cache manager
    cache_manager = SmartCacheManager()
    
    # Get initial stats
    initial_stats = cache_manager.get_cache_statistics()
    print(f"\n📊 INITIAL CACHE STATISTICS:")
    print(f"  Total Requests: {initial_stats['statistics']['total_requests']}")
    print(f"  Cache Hit Rate: {initial_stats['statistics']['cache_hit_rate']}")
    print(f"  Job Desc Hits: {initial_stats['statistics']['job_desc_cache_hits']}")
    print(f"  Job Desc Misses: {initial_stats['statistics']['job_desc_cache_misses']}")
    print(f"  Combined Hits: {initial_stats['statistics']['combined_cache_hits']}")
    print(f"  Combined Misses: {initial_stats['statistics']['combined_cache_misses']}")
    print(f"  AI Calls Saved: {initial_stats['statistics']['ai_calls_saved']}")
    
    # Test cache operations
    print(f"\n🧪 TESTING CACHE OPERATIONS:")
    
    # Test job description cache
    job_file = '/app/data/jobs/8724 Buzzi Maintenance Supervisor Maryneal TX.docx'
    if os.path.exists(job_file):
        print(f"  Testing job description cache for 8724...")
        
        # Multiple calls to test cache hits
        for i in range(3):
            result = cache_manager.get_job_description_cache('8724', job_file)
            stats = cache_manager.get_cache_statistics()
            print(f"    Call {i+1}: Hits: {stats['statistics']['job_desc_cache_hits']}, Hit Rate: {stats['statistics']['cache_hit_rate']}")
        
        # Test combined cache
        print(f"  Testing combined cache for 8724...")
        result = cache_manager.get_combined_analysis_cache('8724', job_file, None)
        stats = cache_manager.get_cache_statistics()
        print(f"    Combined call: Hits: {stats['statistics']['combined_cache_hits']}, Hit Rate: {stats['statistics']['cache_hit_rate']}")
    
    # Test with real processing
    print(f"\n🚀 TESTING WITH REAL PROCESSING:")
    base_url = "http://localhost:8000"
    test_job_ids = ["8724", "8725"]
    
    data = {
        'job_ids': ','.join(test_job_ids),
        'folder_path': '/app/data/jobs',
        'csv_path': '/app/data/MTB/MasterTrackingBoard.csv',
        'ai_agent': 'openai'
    }
    
    try:
        response = requests.post(f"{base_url}/api/process-jobs", data=data)
        if response.status_code == 200:
            result = response.json()
            session_id = result.get('session_id')
            print(f"  ✅ Processing started - Session ID: {session_id}")
            
            # Wait for processing to complete
            for i in range(20):
                time.sleep(1)
                progress_response = requests.get(f"{base_url}/api/job-processing-progress")
                if progress_response.status_code == 200:
                    progress = progress_response.json()
                    if session_id in progress:
                        session_progress = progress[session_id]
                        if session_progress.get('status') == 'completed':
                            print(f"  ✅ Processing completed at {i+1}s!")
                            break
        else:
            print(f"  ❌ Processing failed: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Error during processing: {e}")
    
    # Final stats
    final_stats = cache_manager.get_cache_statistics()
    print(f"\n📊 FINAL CACHE STATISTICS:")
    print(f"  Total Requests: {final_stats['statistics']['total_requests']}")
    print(f"  Cache Hit Rate: {final_stats['statistics']['cache_hit_rate']}")
    print(f"  Job Desc Hits: {final_stats['statistics']['job_desc_cache_hits']}")
    print(f"  Job Desc Misses: {final_stats['statistics']['job_desc_cache_misses']}")
    print(f"  Combined Hits: {final_stats['statistics']['combined_cache_hits']}")
    print(f"  Combined Misses: {final_stats['statistics']['combined_cache_misses']}")
    print(f"  AI Calls Saved: {final_stats['statistics']['ai_calls_saved']}")
    
    # Calculate improvements
    print(f"\n📈 CACHE PERFORMANCE ANALYSIS:")
    hits_gained = final_stats['statistics']['job_desc_cache_hits'] - initial_stats['statistics']['job_desc_cache_hits']
    combined_hits_gained = final_stats['statistics']['combined_cache_hits'] - initial_stats['statistics']['combined_cache_hits']
    ai_calls_saved_gained = final_stats['statistics']['ai_calls_saved'] - initial_stats['statistics']['ai_calls_saved']
    
    print(f"  Job Desc Hits Gained: {hits_gained}")
    print(f"  Combined Hits Gained: {combined_hits_gained}")
    print(f"  AI Calls Saved Gained: {ai_calls_saved_gained}")
    
    # Check statistics file
    print(f"\n📁 STATISTICS FILE VERIFICATION:")
    stats_file = '/app/data/cache/cache_stats_openai.json'
    if os.path.exists(stats_file):
        with open(stats_file, 'r') as f:
            file_stats = json.load(f)
        
        # Compare with memory stats
        memory_stats = final_stats['statistics']
        if file_stats == memory_stats:
            print(f"  ✅ File and memory stats match perfectly!")
        else:
            print(f"  ❌ File and memory stats don't match!")
            print(f"  File: {file_stats}")
            print(f"  Memory: {memory_stats}")
    else:
        print(f"  ❌ Statistics file not found: {stats_file}")
    
    # Final recommendation
    print(f"\n🎯 FINAL RECOMMENDATION:")
    final_hit_rate = float(final_stats['statistics']['cache_hit_rate'].replace('%', ''))
    
    if final_hit_rate > 50:
        print(f"  ✅ Cache system is working excellently!")
        print(f"  🚀 Ready for production use!")
        print(f"  💰 Significant cost savings achieved!")
    elif final_hit_rate > 20:
        print(f"  ✅ Cache system is working well!")
        print(f"  🚀 Ready for production use!")
        print(f"  💰 Good cost savings achieved!")
    elif final_hit_rate > 10:
        print(f"  ⚠️  Cache system is working but needs optimization")
        print(f"  🔧 Consider cache warming strategies")
        print(f"  💰 Some cost savings achieved!")
    else:
        print(f"  ❌ Cache system needs improvement")
        print(f"  🛠️  Cache hit rate too low for production")
    
    # Summary
    print(f"\n📋 SUMMARY:")
    print(f"  Cache System: {'✅ Working' if final_hit_rate > 10 else '❌ Needs Fix'}")
    print(f"  Statistics System: {'✅ Working' if file_stats == memory_stats else '❌ Needs Fix'}")
    print(f"  Real-time Updates: {'✅ Working' if hits_gained > 0 else '❌ Needs Fix'}")
    print(f"  Production Ready: {'✅ Yes' if final_hit_rate > 10 and file_stats == memory_stats else '❌ No'}")

if __name__ == "__main__":
    final_cache_verification()

