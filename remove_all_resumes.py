#!/usr/bin/env python3
"""
Complete Resume Removal Script

This script removes ALL resumes and resume-related data from:
1. Database tables (Resume, WorkExperience, Education, Skills, Projects, Certifications, JobMatch)
2. File system directories (/app/data/resumes/*)
3. Any cached or temporary files

WARNING: This is a destructive operation that cannot be undone!
"""

import os
import sys
import shutil
from pathlib import Path
from sqlalchemy import create_engine, text, delete
from sqlmodel import Session
from typing import Dict, Any
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/ai_job_platform")

def get_database_connection():
    """Get database connection"""
    try:
        engine = create_engine(DATABASE_URL)
        return engine
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return None

def remove_resume_files():
    """Remove all resume files from the file system"""
    logger.info("🗂️  Starting file system cleanup...")
    
    resume_base_dir = Path("/app/data/resumes")
    if not resume_base_dir.exists():
        logger.warning(f"Resume directory {resume_base_dir} does not exist")
        return {"files_removed": 0, "directories_removed": 0}
    
    files_removed = 0
    directories_removed = 0
    
    try:
        # Remove all subdirectories and files
        for item in resume_base_dir.iterdir():
            if item.is_dir():
                logger.info(f"Removing directory: {item}")
                shutil.rmtree(item)
                directories_removed += 1
            elif item.is_file():
                logger.info(f"Removing file: {item}")
                item.unlink()
                files_removed += 1
        
        # Recreate empty directories structure
        resume_base_dir.mkdir(exist_ok=True)
        (resume_base_dir / "original").mkdir(exist_ok=True)
        (resume_base_dir / "extracted").mkdir(exist_ok=True)
        (resume_base_dir / "processed").mkdir(exist_ok=True)
        (resume_base_dir / "archived").mkdir(exist_ok=True)
        
        logger.info(f"✅ File cleanup completed: {files_removed} files, {directories_removed} directories removed")
        return {"files_removed": files_removed, "directories_removed": directories_removed}
        
    except Exception as e:
        logger.error(f"Error during file cleanup: {e}")
        return {"files_removed": files_removed, "directories_removed": directories_removed, "error": str(e)}

def remove_resume_database_entries(engine):
    """Remove all resume-related entries from database tables"""
    logger.info("🗄️  Starting database cleanup...")
    
    if not engine:
        logger.error("No database connection available")
        return {"error": "No database connection"}
    
    try:
        with Session(engine) as session:
            # Get counts before deletion for reporting
            counts = {}
            
            # Count existing records
            tables_to_clean = [
                "jobmatch",
                "certifications", 
                "projects",
                "skills", 
                "education",
                "workexperience",
                "resume"
            ]
            
            for table in tables_to_clean:
                try:
                    result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    counts[table] = count
                    logger.info(f"Found {count} records in {table} table")
                except Exception as e:
                    logger.warning(f"Could not count records in {table}: {e}")
                    counts[table] = 0
            
            # Delete in reverse dependency order (child tables first)
            deletion_order = [
                "jobmatch",
                "certifications", 
                "projects",
                "skills", 
                "education",
                "workexperience",
                "resume"
            ]
            
            total_deleted = 0
            
            for table in deletion_order:
                try:
                    result = session.execute(text(f"DELETE FROM {table}"))
                    deleted_count = result.rowcount
                    total_deleted += deleted_count
                    logger.info(f"Deleted {deleted_count} records from {table}")
                except Exception as e:
                    logger.error(f"Error deleting from {table}: {e}")
            
            # Commit all changes
            session.commit()
            
            logger.info(f"✅ Database cleanup completed: {total_deleted} total records deleted")
            return {
                "total_deleted": total_deleted,
                "counts_before": counts,
                "success": True
            }
            
    except Exception as e:
        logger.error(f"Error during database cleanup: {e}")
        return {"error": str(e)}

def cleanup_cache_and_temp_files():
    """Clean up any cached or temporary resume-related files"""
    logger.info("🧹 Starting cache and temp file cleanup...")
    
    cache_dirs = [
        "/app/data/cache",
        "/tmp",
        "/app/temp"
    ]
    
    files_removed = 0
    
    for cache_dir in cache_dirs:
        cache_path = Path(cache_dir)
        if cache_path.exists():
            try:
                # Look for resume-related files
                for pattern in ["*resume*", "*Resume*", "*RESUME*"]:
                    for file_path in cache_path.rglob(pattern):
                        if file_path.is_file():
                            logger.info(f"Removing cache file: {file_path}")
                            file_path.unlink()
                            files_removed += 1
            except Exception as e:
                logger.warning(f"Error cleaning cache directory {cache_dir}: {e}")
    
    logger.info(f"✅ Cache cleanup completed: {files_removed} files removed")
    return {"files_removed": files_removed}

def verify_cleanup(engine):
    """Verify that all resume data has been removed"""
    logger.info("🔍 Verifying cleanup...")
    
    verification_results = {}
    
    # Check database tables
    if engine:
        try:
            with Session(engine) as session:
                tables_to_check = [
                    "resume", "workexperience", "education", 
                    "skills", "projects", "certifications", "jobmatch"
                ]
                
                for table in tables_to_check:
                    try:
                        result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.scalar()
                        verification_results[f"db_{table}"] = count
                        if count > 0:
                            logger.warning(f"⚠️  {table} table still has {count} records!")
                        else:
                            logger.info(f"✅ {table} table is clean")
                    except Exception as e:
                        logger.error(f"Error checking {table}: {e}")
                        verification_results[f"db_{table}"] = "error"
        except Exception as e:
            logger.error(f"Error during database verification: {e}")
    
    # Check file system
    resume_base_dir = Path("/app/data/resumes")
    if resume_base_dir.exists():
        file_count = 0
        dir_count = 0
        
        for item in resume_base_dir.iterdir():
            if item.is_dir() and item.name not in ["original", "extracted", "processed", "archived"]:
                dir_count += 1
                logger.warning(f"⚠️  Unexpected directory found: {item}")
            elif item.is_file():
                file_count += 1
                logger.warning(f"⚠️  Unexpected file found: {item}")
        
        verification_results["files_remaining"] = file_count
        verification_results["dirs_remaining"] = dir_count
        
        if file_count == 0 and dir_count == 0:
            logger.info("✅ File system is clean")
        else:
            logger.warning(f"⚠️  File system has {file_count} files and {dir_count} directories remaining")
    
    return verification_results

def main():
    """Main cleanup function"""
    logger.info("🚨 STARTING COMPLETE RESUME REMOVAL")
    logger.info("=" * 50)
    
    # Confirmation prompt
    print("\n" + "=" * 60)
    print("⚠️  WARNING: DESTRUCTIVE OPERATION")
    print("=" * 60)
    print("This script will PERMANENTLY DELETE:")
    print("• ALL resume records from the database")
    print("• ALL resume files from the file system")
    print("• ALL related data (work experience, education, skills, etc.)")
    print("• ALL job-resume matches")
    print("\nThis action CANNOT be undone!")
    print("=" * 60)
    
    response = input("\nType 'DELETE ALL RESUMES' to confirm: ")
    if response != "DELETE ALL RESUMES":
        logger.info("❌ Operation cancelled by user")
        return
    
    logger.info("✅ User confirmation received, proceeding with cleanup...")
    
    # Initialize results
    results = {
        "start_time": None,
        "end_time": None,
        "file_cleanup": {},
        "database_cleanup": {},
        "cache_cleanup": {},
        "verification": {},
        "success": False
    }
    
    try:
        results["start_time"] = str(datetime.now())
        
        # Get database connection
        engine = get_database_connection()
        
        # Step 1: Remove files
        logger.info("\n📁 STEP 1: Removing resume files...")
        results["file_cleanup"] = remove_resume_files()
        
        # Step 2: Remove database entries
        logger.info("\n🗄️  STEP 2: Removing database entries...")
        results["database_cleanup"] = remove_resume_database_entries(engine)
        
        # Step 3: Clean cache and temp files
        logger.info("\n🧹 STEP 3: Cleaning cache and temp files...")
        results["cache_cleanup"] = cleanup_cache_and_temp_files()
        
        # Step 4: Verify cleanup
        logger.info("\n🔍 STEP 4: Verifying cleanup...")
        results["verification"] = verify_cleanup(engine)
        
        results["end_time"] = str(datetime.now())
        results["success"] = True
        
        # Final summary
        logger.info("\n" + "=" * 50)
        logger.info("🎉 CLEANUP COMPLETED SUCCESSFULLY!")
        logger.info("=" * 50)
        
        print(f"\n📊 CLEANUP SUMMARY:")
        print(f"Files removed: {results['file_cleanup'].get('files_removed', 0)}")
        print(f"Directories removed: {results['file_cleanup'].get('directories_removed', 0)}")
        print(f"Database records deleted: {results['database_cleanup'].get('total_deleted', 0)}")
        print(f"Cache files removed: {results['cache_cleanup'].get('files_removed', 0)}")
        
        # Check for any remaining data
        remaining_data = False
        for key, value in results['verification'].items():
            if isinstance(value, int) and value > 0:
                remaining_data = True
                break
        
        if remaining_data:
            logger.warning("⚠️  Some data may still remain - check verification results")
        else:
            logger.info("✅ All resume data has been completely removed")
        
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        results["error"] = str(e)
        results["success"] = False
    
    # Save results to file
    results_file = Path("/app/data/resume_cleanup_results.json")
    try:
        import json
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        logger.info(f"📄 Results saved to: {results_file}")
    except Exception as e:
        logger.warning(f"Could not save results file: {e}")
    
    return results

if __name__ == "__main__":
    from datetime import datetime
    main()
