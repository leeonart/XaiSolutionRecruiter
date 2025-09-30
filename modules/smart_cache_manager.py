"""
Smart Cache Manager for AI Job Processing
Implements hybrid caching with content-based segmentation and time-based validation
"""

import os
import json
import hashlib
import datetime
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
import config

class SmartCacheManager:
    def __init__(self, cache_dir: str = "/app/data/cache", ai_agent: str = "openai"):
        """
        Initialize the Smart Cache Manager
        
        Args:
            cache_dir: Directory for cache files
            ai_agent: AI agent being used (for cache file naming)
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.ai_agent = ai_agent
        
        # Cache policies (configurable)
        self.cache_policies = {
            "job_description": {
                "max_age_hours": None,  # No time limit - only invalidate on file change
                "description": "Job descriptions rarely change - cache indefinitely until file changes"
            },
            "notes": {
                "max_age_hours": 2,  # 2-hour limit for notes
                "description": "Notes change frequently - 2-hour cache limit"
            },
            "combined_analysis": {
                "max_age_hours": 1,  # 1-hour limit for combined analysis
                "description": "Combined analysis depends on both - 1-hour cache limit"
            }
        }
        
        # Cache file paths
        self.cache_files = {
            "job_description": self.cache_dir / f"job_desc_cache_{ai_agent}.json",
            "notes": self.cache_dir / f"notes_cache_{ai_agent}.json",
            "combined_analysis": self.cache_dir / f"combined_cache_{ai_agent}.json",
            "metadata": self.cache_dir / f"cache_metadata_{ai_agent}.json"
        }
        
        # Load existing caches
        self.caches = self._load_all_caches()
        
        # Load existing statistics
        self.stats = self._load_statistics()
    
    def _load_all_caches(self) -> Dict[str, Dict]:
        """Load all cache files"""
        caches = {}
        for cache_type, cache_file in self.cache_files.items():
            caches[cache_type] = self._load_cache_file(cache_file)
        return caches
    
    def _load_statistics(self) -> Dict[str, Any]:
        """Load persistent statistics"""
        stats_file = self.cache_dir / f"cache_stats_{self.ai_agent}.json"
        if stats_file.exists():
            try:
                with open(stats_file, 'r', encoding='utf-8') as f:
                    loaded_stats = json.load(f)
                
                # Handle both old format (raw stats) and new format (comprehensive stats)
                if "total_cache_hits" in loaded_stats:
                    # New format - return as is
                    return loaded_stats
                else:
                    # Old format - return raw stats only
                    return loaded_stats
            except Exception as e:
                print(f"Error loading statistics file {stats_file}: {e}")
        
        # Return default statistics if file doesn't exist or error
        return {
            "job_desc_cache_hits": 0,
            "job_desc_cache_misses": 0,
            "notes_cache_hits": 0,
            "notes_cache_misses": 0,
            "combined_cache_hits": 0,
            "combined_cache_misses": 0,
            "ai_calls_saved": 0,
            "tokens_saved": 0
        }
    
    def _save_statistics(self):
        """Save persistent statistics"""
        stats_file = self.cache_dir / f"cache_stats_{self.ai_agent}.json"
        try:
            # Calculate comprehensive statistics for saving
            total_hits = (self.stats["job_desc_cache_hits"] + 
                         self.stats["notes_cache_hits"] + 
                         self.stats["combined_cache_hits"])
            
            total_misses = (self.stats["job_desc_cache_misses"] + 
                           self.stats["notes_cache_misses"] + 
                           self.stats["combined_cache_misses"])
            
            total_requests = total_hits + total_misses
            hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
            
            # Save comprehensive statistics
            comprehensive_stats = {
                **self.stats,
                "total_cache_hits": total_hits,
                "total_cache_misses": total_misses,
                "total_requests": total_requests,
                "cache_hit_rate": f"{hit_rate:.1f}%"
            }
            
            with open(stats_file, 'w', encoding='utf-8') as f:
                json.dump(comprehensive_stats, f, indent=2)
        except Exception as e:
            print(f"Error saving statistics file {stats_file}: {e}")
    
    def _load_cache_file(self, cache_file: Path) -> Dict:
        """Load a single cache file"""
        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cache = json.load(f)
                    cache_type_name = cache_file.stem.replace(f'_cache_{self.ai_agent}', '')
                    print(f"Loaded {cache_type_name} cache with {len(cache)} entries")
                    return cache
            except Exception as e:
                print(f"Error loading cache file {cache_file}: {e}")
        return {}
    
    def _save_cache_file(self, cache_type: str, cache_data: Dict):
        """Save a cache file"""
        cache_file = self.cache_files[cache_type]
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
            print(f"Saved {cache_type} cache with {len(cache_data)} entries")
        except Exception as e:
            print(f"Error saving cache file {cache_file}: {e}")
    
    def _get_file_hash(self, file_path: str) -> str:
        """Get MD5 hash of file content"""
        if not os.path.exists(file_path):
            return ""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return ""
    
    def _get_cache_key(self, job_id: str, file_path: str = None, content_hash: str = None) -> str:
        """Generate cache key for job ID and content"""
        if content_hash:
            return f"{job_id}_{content_hash}"
        elif file_path:
            file_hash = self._get_file_hash(file_path)
            return f"{job_id}_{file_hash}"
        else:
            return job_id
    
    def _get_flexible_cache_key(self, job_id: str, file_path: str = None) -> str:
        """Generate flexible cache key that can match even if file paths differ"""
        if not file_path:
            return job_id
        
        # Try to find existing cache entry by job_id first
        for existing_key in self.caches["job_description"].keys():
            if existing_key.startswith(f"{job_id}_"):
                # Check if the file content matches
                file_hash = self._get_file_hash(file_path)
                if existing_key.endswith(f"_{file_hash}"):
                    return existing_key
        
        # If no match found, create new key
        file_hash = self._get_file_hash(file_path)
        return f"{job_id}_{file_hash}"
    
    def _is_cache_entry_valid(self, cache_entry: Dict, cache_type: str) -> bool:
        """Check if a cache entry is still valid based on policy"""
        if not cache_entry:
            return False
        
        # Check if cache entry has required fields
        if "cached_at" not in cache_entry:
            return False
        
        # Parse cached timestamp
        try:
            cached_at = datetime.datetime.fromisoformat(cache_entry["cached_at"])
        except:
            return False
        
        # Get cache policy for this type
        policy = self.cache_policies.get(cache_type, {})
        max_age_hours = policy.get("max_age_hours")
        
        # For job descriptions, be more lenient - cache indefinitely unless explicitly invalidated
        if cache_type == "job_description":
            return True
        
        # If no time limit, cache is valid (content-based validation handles file changes)
        if max_age_hours is None:
            return True
        
        # Check time-based expiration
        now = datetime.datetime.now()
        age_hours = (now - cached_at).total_seconds() / 3600
        
        if age_hours > max_age_hours:
            print(f"Cache entry expired: {age_hours:.1f} hours > {max_age_hours} hours limit")
            return False
        
        return True
    
    def get_job_description_cache(self, job_id: str, job_file: str) -> Optional[Dict]:
        """Get cached job description analysis"""
        # Try flexible cache key first
        cache_key = self._get_flexible_cache_key(job_id, job_file)
        cache_entry = self.caches["job_description"].get(cache_key)
        
        if self._is_cache_entry_valid(cache_entry, "job_description"):
            self.stats["job_desc_cache_hits"] += 1
            self.stats["ai_calls_saved"] += 1
            self.stats["tokens_saved"] += cache_entry.get("estimated_tokens", 0)
            self._save_statistics()
            print(f"[CACHE HIT] Job description for {job_id} - using cached result")
            return cache_entry.get("data")
        
        self.stats["job_desc_cache_misses"] += 1
        self._save_statistics()
        return None
    
    def get_notes_cache(self, job_id: str, notes_file: str = None) -> Optional[Dict]:
        """Get cached notes analysis"""
        cache_key = self._get_cache_key(job_id, notes_file) if notes_file else job_id
        cache_entry = self.caches["notes"].get(cache_key)
        
        if self._is_cache_entry_valid(cache_entry, "notes"):
            self.stats["notes_cache_hits"] += 1
            self._save_statistics()
            print(f"[CACHE HIT] Notes for {job_id} - using cached result")
            
            # Log cache hit for audit trail
            self._log_notes_audit(job_id, notes_file, cache_hit=True, cache_key=cache_key)
            
            return cache_entry.get("data")
        
        self.stats["notes_cache_misses"] += 1
        self._save_statistics()
        return None
    
    def get_combined_analysis_cache(self, job_id: str, job_file: str, notes_file: str = None) -> Optional[Dict]:
        """Get cached combined analysis"""
        # Create composite key for combined analysis
        job_hash = self._get_file_hash(job_file) if job_file else ""
        notes_hash = self._get_file_hash(notes_file) if notes_file else ""
        cache_key = f"{job_id}_{job_hash}_{notes_hash}"
        
        cache_entry = self.caches["combined_analysis"].get(cache_key)
        
        if self._is_cache_entry_valid(cache_entry, "combined_analysis"):
            self.stats["combined_cache_hits"] += 1
            self._save_statistics()
            print(f"[CACHE HIT] Combined analysis for {job_id} - using cached result")
            return cache_entry.get("data")
        
        self.stats["combined_cache_misses"] += 1
        self._save_statistics()
        return None
    
    def save_job_description_cache(self, job_id: str, job_file: str, analysis_data: Dict, estimated_tokens: int = 0):
        """Save job description analysis to cache"""
        cache_key = self._get_cache_key(job_id, job_file)
        
        self.caches["job_description"][cache_key] = {
            "data": analysis_data,
            "cached_at": datetime.datetime.now().isoformat(),
            "ai_agent": self.ai_agent,
            "estimated_tokens": estimated_tokens,
            "cache_type": "job_description"
        }
        
        self._save_cache_file("job_description", self.caches["job_description"])
        print(f"[CACHE SAVE] Job description for {job_id} cached")
    
    def save_notes_cache(self, job_id: str, notes_file: str, analysis_data: Dict, 
                        old_notes_content: str = None, new_notes_content: str = None,
                        processing_session_id: str = None):
        """Save notes analysis to cache"""
        cache_key = self._get_cache_key(job_id, notes_file) if notes_file else job_id
        
        self.caches["notes"][cache_key] = {
            "data": analysis_data,
            "cached_at": datetime.datetime.now().isoformat(),
            "ai_agent": self.ai_agent,
            "cache_type": "notes"
        }
        
        self._save_cache_file("notes", self.caches["notes"])
        print(f"[CACHE SAVE] Notes for {job_id} cached")
        
        # Log cache save for audit trail
        self._log_notes_audit(job_id, notes_file, old_notes_content=old_notes_content,
                             new_notes_content=new_notes_content, ai_extracted_data=analysis_data,
                             processing_session_id=processing_session_id, cache_key=cache_key)
    
    def save_combined_analysis_cache(self, job_id: str, job_file: str, notes_file: str, combined_data: Dict):
        """Save combined analysis to cache"""
        job_hash = self._get_file_hash(job_file) if job_file else ""
        notes_hash = self._get_file_hash(notes_file) if notes_file else ""
        cache_key = f"{job_id}_{job_hash}_{notes_hash}"
        
        self.caches["combined_analysis"][cache_key] = {
            "data": combined_data,
            "cached_at": datetime.datetime.now().isoformat(),
            "ai_agent": self.ai_agent,
            "cache_type": "combined_analysis"
        }
        
        self._save_cache_file("combined_analysis", self.caches["combined_analysis"])
        print(f"[CACHE SAVE] Combined analysis for {job_id} cached")
    
    def smart_process_job(self, job_id: str, job_file: str, notes_file: str = None, 
                         ai_processor_func=None) -> Dict[str, Any]:
        """
        Smart job processing with hybrid caching
        
        Args:
            job_id: Job ID to process
            job_file: Path to job description file
            notes_file: Path to notes file (optional)
            ai_processor_func: Function to call for AI processing
            
        Returns:
            Combined analysis data
        """
        print(f"\n[SMART CACHE] Processing job {job_id} with hybrid caching")
        
        # Step 1: Check for cached combined analysis first
        combined_cache = self.get_combined_analysis_cache(job_id, job_file, notes_file)
        if combined_cache:
            return combined_cache
        
        # Step 2: Check individual component caches
        job_desc_cache = self.get_job_description_cache(job_id, job_file)
        notes_cache = self.get_notes_cache(job_id, notes_file)
        
        # Step 3: Determine what needs AI processing
        needs_job_desc_ai = job_desc_cache is None
        needs_notes_ai = notes_cache is None and notes_file
        
        if not needs_job_desc_ai and not needs_notes_ai:
            # Both components are cached, combine them
            print(f"[SMART CACHE] Combining cached components for {job_id}")
            combined_data = self._combine_cached_components(job_desc_cache, notes_cache, job_id)
            
            # Cache the combined result
            self.save_combined_analysis_cache(job_id, job_file, notes_file, combined_data)
            return combined_data
        
        # Step 4: Process missing components with AI
        if ai_processor_func:
            if needs_job_desc_ai:
                print(f"[SMART CACHE] Running AI for job description: {job_id}")
                job_desc_data = ai_processor_func(job_id, job_file, "job_description")
                if job_desc_data:
                    self.save_job_description_cache(job_id, job_file, job_desc_data)
                    job_desc_cache = job_desc_data
            
            if needs_notes_ai:
                print(f"[SMART CACHE] Running AI for notes: {job_id}")
                notes_data = ai_processor_func(job_id, notes_file, "notes")
                if notes_data:
                    self.save_notes_cache(job_id, notes_file, notes_data)
                    notes_cache = notes_data
        
        # Step 5: Combine all available data
        combined_data = self._combine_cached_components(job_desc_cache, notes_cache, job_id)
        
        # Step 6: Cache the combined result
        self.save_combined_analysis_cache(job_id, job_file, notes_file, combined_data)
        
        return combined_data
    
    def _combine_cached_components(self, job_desc_data: Dict, notes_data: Dict, job_id: str) -> Dict:
        """Combine cached job description and notes data"""
        # Start with job description data as base
        combined = job_desc_data.copy() if job_desc_data else {}
        
        # Add notes data if available
        if notes_data:
            # Merge notes-specific fields
            notes_fields = ['hr_notes_key_requirements', 'internal_notes', 'additional_context']
            for field in notes_fields:
                if field in notes_data:
                    combined[field] = notes_data[field]
            
            # Add metadata about combination
            combined['cache_metadata'] = {
                'job_id': job_id,
                'combined_at': datetime.datetime.now().isoformat(),
                'job_desc_cached': job_desc_data is not None,
                'notes_cached': notes_data is not None
            }
        
        return combined
    
    def get_cache_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        # Reload statistics from file to ensure we have the latest data
        self.stats = self._load_statistics()
        
        # Check if we already have comprehensive statistics
        if "total_cache_hits" in self.stats:
            # Statistics are already comprehensive
            return {
                "cache_policies": self.cache_policies,
                "statistics": self.stats,
                "cache_sizes": {
                    "job_description": len(self.caches["job_description"]),
                    "notes": len(self.caches["notes"]),
                    "combined_analysis": len(self.caches["combined_analysis"])
                }
            }
        
        # Calculate comprehensive statistics from raw stats
        total_hits = (self.stats["job_desc_cache_hits"] + 
                     self.stats["notes_cache_hits"] + 
                     self.stats["combined_cache_hits"])
        
        total_misses = (self.stats["job_desc_cache_misses"] + 
                       self.stats["notes_cache_misses"] + 
                       self.stats["combined_cache_misses"])
        
        total_requests = total_hits + total_misses
        hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "cache_policies": self.cache_policies,
            "statistics": {
                **self.stats,
                "total_cache_hits": total_hits,
                "total_cache_misses": total_misses,
                "total_requests": total_requests,
                "cache_hit_rate": f"{hit_rate:.1f}%"
            },
            "cache_sizes": {
                "job_description": len(self.caches["job_description"]),
                "notes": len(self.caches["notes"]),
                "combined_analysis": len(self.caches["combined_analysis"])
            }
        }
    
    def print_cache_statistics(self):
        """Print detailed cache statistics"""
        stats = self.get_cache_statistics()
        
        print(f"\n🚀 SMART CACHE STATISTICS:")
        print(f"📊 Total Requests: {stats['statistics']['total_requests']}")
        print(f"🎯 Cache Hit Rate: {stats['statistics']['cache_hit_rate']}")
        print(f"🤖 AI Calls Saved: {stats['statistics']['ai_calls_saved']}")
        print(f"💰 Tokens Saved: {stats['statistics']['tokens_saved']:,}")
        
        print(f"\n📋 Component Breakdown:")
        print(f"   Job Description: {stats['statistics']['job_desc_cache_hits']} hits, {stats['statistics']['job_desc_cache_misses']} misses")
        print(f"   Notes: {stats['statistics']['notes_cache_hits']} hits, {stats['statistics']['notes_cache_misses']} misses")
        print(f"   Combined: {stats['statistics']['combined_cache_hits']} hits, {stats['statistics']['combined_cache_misses']} misses")
        
        print(f"\n💾 Cache Sizes:")
        for cache_type, size in stats['cache_sizes'].items():
            print(f"   {cache_type.replace('_', ' ').title()}: {size} entries")
        
        print(f"\n⚙️ Cache Policies:")
        for policy_type, policy in stats['cache_policies'].items():
            max_age = policy['max_age_hours']
            age_str = f"{max_age} hours" if max_age else "No limit (content-based)"
            print(f"   {policy_type.replace('_', ' ').title()}: {age_str}")
            print(f"      {policy['description']}")
    
    def clear_cache(self, cache_type: str = None):
        """Clear cache(s)"""
        if cache_type and cache_type in self.caches:
            self.caches[cache_type].clear()
            self._save_cache_file(cache_type, self.caches[cache_type])
            print(f"Cleared {cache_type} cache")
        else:
            for cache_type in self.caches:
                self.caches[cache_type].clear()
                self._save_cache_file(cache_type, self.caches[cache_type])
            print("Cleared all caches")
    
    def _log_notes_audit(self, job_id: str, notes_file: str = None, 
                        old_notes_content: str = None, new_notes_content: str = None,
                        ai_extracted_data: Dict = None, processing_session_id: str = None,
                        cache_hit: bool = False, cache_key: str = None, 
                        processing_status: str = "completed", processing_note: str = None):
        """
        Log notes processing for audit trail
        This method will be called by the backend to create audit logs
        """
        # Store audit data for later processing by the backend
        if not hasattr(self, '_audit_queue'):
            self._audit_queue = []
        
        audit_data = {
            'job_id': job_id,
            'notes_file_path': notes_file,
            'old_notes_content': old_notes_content,
            'new_notes_content': new_notes_content,
            'ai_agent': self.ai_agent,
            'processing_session_id': processing_session_id,
            'ai_extracted_data': ai_extracted_data,
            'processing_status': processing_status,
            'processing_note': processing_note,
            'cache_hit': cache_hit,
            'cache_key': cache_key,
            'timestamp': datetime.datetime.now().isoformat()
        }
        
        self._audit_queue.append(audit_data)
        print(f"[AUDIT QUEUE] Added notes audit entry for job {job_id}")
    
    def get_pending_audit_logs(self) -> List[Dict]:
        """Get and clear pending audit logs"""
        if not hasattr(self, '_audit_queue'):
            return []
        
        logs = self._audit_queue.copy()
        self._audit_queue.clear()
        return logs
        
        # Reset statistics
        for key in self.stats:
            self.stats[key] = 0
