#!/usr/bin/env python3
"""
Cache Rate Monitor - Stop app if job description cache rate falls below 75%
"""

import sys
import os
sys.path.append('/app')

from modules.smart_cache_manager import SmartCacheManager
import time
import requests
import json

class CacheRateMonitor:
    def __init__(self, threshold=75.0):
        self.threshold = threshold
        self.cache_manager = SmartCacheManager()
        self.base_url = "http://localhost:8000"
        self.monitoring = False
        
    def get_current_cache_rate(self):
        """Get current job description cache hit rate"""
        stats = self.cache_manager.get_cache_statistics()
        
        # Calculate job description cache hit rate
        job_desc_hits = stats['statistics']['job_desc_cache_hits']
        job_desc_misses = stats['statistics']['job_desc_cache_misses']
        total_job_desc_requests = job_desc_hits + job_desc_misses
        
        if total_job_desc_requests == 0:
            return 100.0  # No requests yet, consider it 100%
        
        hit_rate = (job_desc_hits / total_job_desc_requests) * 100
        return hit_rate
    
    def check_cache_rate(self):
        """Check if cache rate is above threshold"""
        current_rate = self.get_current_cache_rate()
        
        print(f"🔍 Cache Rate Check: {current_rate:.1f}% (Threshold: {self.threshold}%)")
        
        if current_rate < self.threshold:
            print(f"🚨 ALERT: Job description cache rate ({current_rate:.1f}%) is below threshold ({self.threshold}%)!")
            return False
        else:
            print(f"✅ Cache rate is healthy: {current_rate:.1f}%")
            return True
    
    def stop_processing(self):
        """Stop any running processing"""
        try:
            # Try to stop processing by sending a stop signal
            response = requests.post(f"{self.base_url}/api/stop-processing")
            if response.status_code == 200:
                print("🛑 Processing stopped successfully")
            else:
                print("⚠️  Could not stop processing via API")
        except Exception as e:
            print(f"❌ Error stopping processing: {e}")
    
    def monitor_during_processing(self, job_ids, max_duration_minutes=30):
        """Monitor cache rate during processing"""
        print(f"🎯 Starting cache rate monitoring for jobs: {job_ids}")
        print(f"📊 Threshold: {self.threshold}% job description cache hit rate")
        print(f"⏱️  Max duration: {max_duration_minutes} minutes")
        
        self.monitoring = True
        start_time = time.time()
        max_duration_seconds = max_duration_minutes * 60
        
        # Start processing
        data = {
            'job_ids': ','.join(job_ids) if isinstance(job_ids, list) else job_ids,
            'folder_path': '/app/data/jobs',
            'csv_path': '/app/data/MTB/MasterTrackingBoard.csv',
            'ai_agent': 'openai'
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/process-jobs", data=data)
            if response.status_code == 200:
                result = response.json()
                session_id = result.get('session_id')
                print(f"✅ Processing started - Session ID: {session_id}")
                
                # Monitor during processing
                while self.monitoring:
                    current_time = time.time()
                    elapsed_time = current_time - start_time
                    
                    # Check if max duration exceeded
                    if elapsed_time > max_duration_seconds:
                        print(f"⏰ Max duration ({max_duration_minutes} minutes) exceeded")
                        self.stop_processing()
                        break
                    
                    # Check cache rate
                    if not self.check_cache_rate():
                        print(f"🚨 STOPPING PROCESSING: Cache rate below threshold!")
                        self.stop_processing()
                        break
                    
                    # Check if processing is complete
                    try:
                        progress_response = requests.get(f"{self.base_url}/api/job-processing-progress")
                        if progress_response.status_code == 200:
                            progress = progress_response.json()
                            if session_id in progress:
                                session_progress = progress[session_id]
                                if session_progress.get('status') == 'completed':
                                    print(f"✅ Processing completed successfully!")
                                    break
                                elif session_progress.get('status') == 'failed':
                                    print(f"❌ Processing failed!")
                                    break
                    except Exception as e:
                        print(f"⚠️  Error checking progress: {e}")
                    
                    # Wait before next check
                    time.sleep(10)  # Check every 10 seconds
                    
            else:
                print(f"❌ Processing failed to start: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error during processing: {e}")
        
        self.monitoring = False
        
        # Final cache rate check
        final_rate = self.get_current_cache_rate()
        print(f"\n📊 FINAL CACHE RATE: {final_rate:.1f}%")
        
        if final_rate < self.threshold:
            print(f"🚨 FINAL ALERT: Cache rate ({final_rate:.1f}%) is still below threshold ({self.threshold}%)!")
            print(f"🔧 Please investigate cache issues before continuing!")
            return False
        else:
            print(f"✅ Final cache rate is healthy: {final_rate:.1f}%")
            return True

def main():
    """Main function to run cache rate monitoring"""
    print("🛡️  CACHE RATE MONITOR")
    print("=" * 60)
    
    # Initialize monitor with 75% threshold
    monitor = CacheRateMonitor(threshold=75.0)
    
    # Get current cache rate
    current_rate = monitor.get_current_cache_rate()
    print(f"📊 Current job description cache rate: {current_rate:.1f}%")
    
    if current_rate < 75.0:
        print(f"🚨 WARNING: Current cache rate ({current_rate:.1f}%) is below 75% threshold!")
        print(f"🔧 Please investigate cache issues before running processing!")
        return False
    
    # Test with a few jobs
    test_job_ids = ["8724", "8725", "8726", "8727", "8728"]
    
    print(f"\n🎯 Starting monitored processing with jobs: {test_job_ids}")
    success = monitor.monitor_during_processing(test_job_ids, max_duration_minutes=10)
    
    if success:
        print(f"\n✅ Cache monitoring completed successfully!")
        print(f"🚀 System is ready for full processing!")
    else:
        print(f"\n❌ Cache monitoring detected issues!")
        print(f"🛠️  Please fix cache issues before continuing!")
    
    return success

if __name__ == "__main__":
    main()

