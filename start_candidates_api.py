#!/usr/bin/env python3
"""
Simple candidates API server without AI dependencies
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from typing import List, Optional, Dict, Any
import pandas as pd
import os
from pathlib import Path
from datetime import datetime

# Create FastAPI app
app = FastAPI(
    title="Candidates Database API", 
    version="1.0.0",
    description="API for searching and managing candidates database",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000", "http://xai.eastus.cloudapp.azure.com", "https://xai.eastus.cloudapp.azure.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection for candidates
def get_candidates_db_engine():
    """Get database engine for candidates database"""
    db_path = Path(__file__).parent / "candidates_database.db"
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Candidates database not found")
    
    engine = create_engine(f"sqlite:///{db_path}")
    return engine

@app.get("/")
async def root():
    return {"message": "Candidates Database API is running!"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "candidates-api"}

@app.get("/api/candidates/search")
async def search_candidates(
    search: Optional[str] = Query(None, description="Search by name, email, or position"),
    status: Optional[str] = Query(None, description="Filter by candidate status (C, P)"),
    recruiter: Optional[str] = Query(None, description="Filter by recruiter name"),
    min_salary: Optional[float] = Query(None, description="Minimum salary filter"),
    max_salary: Optional[float] = Query(None, description="Maximum salary filter"),
    relocate: Optional[str] = Query(None, description="Filter by relocation preference"),
    sort_by: str = Query("last_name", description="Sort field"),
    limit: int = Query(100, description="Maximum number of results"),
    offset: int = Query(0, description="Number of results to skip")
):
    """Search candidates with various filters"""
    try:
        engine = get_candidates_db_engine()
        
        # Build the base query
        base_query = "SELECT * FROM candidates WHERE 1=1"
        count_query = "SELECT COUNT(*) as total FROM candidates WHERE 1=1"
        params = []
        
        # Add search conditions
        if search:
            search_condition = """
                (first_name LIKE :search OR 
                 last_name LIKE :search OR 
                 email_address LIKE :search OR 
                 last_pos_with_interview LIKE :search OR
                 notes LIKE :search)
            """
            base_query += f" AND {search_condition}"
            count_query += f" AND {search_condition}"
        
        if status:
            base_query += " AND candidate_status = :status"
            count_query += " AND candidate_status = :status"
        
        if recruiter:
            base_query += " AND recruiter LIKE :recruiter"
            count_query += " AND recruiter LIKE :recruiter"
        
        if min_salary is not None:
            base_query += " AND current_salary >= :min_salary"
            count_query += " AND current_salary >= :min_salary"
        
        if max_salary is not None:
            base_query += " AND current_salary <= :max_salary"
            count_query += " AND current_salary <= :max_salary"
        
        if relocate:
            base_query += " AND relocate LIKE :relocate"
            count_query += " AND relocate LIKE :relocate"
        
        # Add sorting
        valid_sort_fields = [
            "last_name", "first_name", "email_address", "current_salary", 
            "desired_salary", "date_entered", "recruiter", "candidate_status"
        ]
        if sort_by in valid_sort_fields:
            base_query += f" ORDER BY {sort_by}"
            if sort_by in ["current_salary", "desired_salary", "date_entered"]:
                base_query += " DESC"
        else:
            base_query += " ORDER BY last_name"
        
        # Add pagination
        base_query += f" LIMIT {limit} OFFSET {offset}"
        
        # Build parameters dictionary
        query_params = {}
        if search:
            query_params['search'] = f"%{search}%"
        if status:
            query_params['status'] = status
        if recruiter:
            query_params['recruiter'] = f"%{recruiter}%"
        if min_salary is not None:
            query_params['min_salary'] = min_salary
        if max_salary is not None:
            query_params['max_salary'] = max_salary
        if relocate:
            query_params['relocate'] = f"%{relocate}%"
        
        # Execute queries
        with engine.connect() as conn:
            # Get total count
            count_result = conn.execute(text(count_query), query_params)
            total = count_result.fetchone()[0]
            
            # Get candidates
            candidates_result = conn.execute(text(base_query), query_params)
            candidates_data = candidates_result.fetchall()
            
            # Convert to list of dictionaries
            candidates = []
            for row in candidates_data:
                candidate_dict = dict(row._mapping)
                # Convert None values to None for JSON serialization
                for key, value in candidate_dict.items():
                    if value is None or (isinstance(value, float) and pd.isna(value)):
                        candidate_dict[key] = None
                candidates.append(candidate_dict)
        
        return {
            "candidates": candidates,
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching candidates: {str(e)}")

@app.get("/api/candidates/recruiters")
async def get_recruiters():
    """Get list of unique recruiters"""
    try:
        engine = get_candidates_db_engine()
        
        query = """
        SELECT DISTINCT recruiter, COUNT(*) as candidate_count
        FROM candidates 
        WHERE recruiter IS NOT NULL AND recruiter != ''
        GROUP BY recruiter 
        ORDER BY candidate_count DESC, recruiter
        """
        
        with engine.connect() as conn:
            result = conn.execute(text(query))
            recruiters_data = result.fetchall()
            
            recruiters = [row[0] for row in recruiters_data if row[0]]
        
        return recruiters
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recruiters: {str(e)}")

@app.get("/api/candidates/stats")
async def get_candidates_stats():
    """Get summary statistics about candidates"""
    try:
        engine = get_candidates_db_engine()
        
        queries = {
            "total_candidates": "SELECT COUNT(*) FROM candidates",
            "unique_emails": "SELECT COUNT(DISTINCT email_address) FROM candidates WHERE email_address IS NOT NULL",
            "unique_recruiters": "SELECT COUNT(DISTINCT recruiter) FROM candidates WHERE recruiter IS NOT NULL",
            "status_distribution": """
                SELECT candidate_status, COUNT(*) as count 
                FROM candidates 
                GROUP BY candidate_status 
                ORDER BY count DESC
            """,
            "salary_stats": """
                SELECT 
                    MIN(current_salary) as min_salary,
                    MAX(current_salary) as max_salary,
                    AVG(current_salary) as avg_salary,
                    COUNT(CASE WHEN current_salary IS NOT NULL THEN 1 END) as with_salary
                FROM candidates 
                WHERE current_salary IS NOT NULL
            """,
            "top_recruiters": """
                SELECT recruiter, COUNT(*) as candidate_count
                FROM candidates 
                WHERE recruiter IS NOT NULL 
                GROUP BY recruiter 
                ORDER BY candidate_count DESC 
                LIMIT 10
            """
        }
        
        stats = {}
        
        with engine.connect() as conn:
            # Basic counts
            for key, query in queries.items():
                if key in ["total_candidates", "unique_emails", "unique_recruiters"]:
                    result = conn.execute(text(query))
                    stats[key] = result.fetchone()[0]
                elif key in ["status_distribution", "top_recruiters"]:
                    result = conn.execute(text(query))
                    stats[key] = [dict(row._mapping) for row in result.fetchall()]
                elif key == "salary_stats":
                    result = conn.execute(text(query))
                    row = result.fetchone()
                    if row:
                        stats[key] = {
                            "min_salary": row[0],
                            "max_salary": row[1],
                            "avg_salary": row[2],
                            "with_salary": row[3]
                        }
                    else:
                        stats[key] = {
                            "min_salary": None,
                            "max_salary": None,
                            "avg_salary": None,
                            "with_salary": 0
                        }
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching statistics: {str(e)}")

@app.get("/api/candidates/duplicates")
async def get_duplicate_emails():
    """Find duplicate email addresses"""
    try:
        engine = get_candidates_db_engine()
        
        query = """
        SELECT 
            email_address, 
            COUNT(*) as count,
            GROUP_CONCAT(first_name || ' ' || last_name) as names
        FROM candidates 
        WHERE email_address IS NOT NULL 
        GROUP BY email_address 
        HAVING COUNT(*) > 1 
        ORDER BY count DESC
        """
        
        with engine.connect() as conn:
            result = conn.execute(text(query))
            duplicates = [dict(row._mapping) for row in result.fetchall()]
        
        return duplicates
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding duplicates: {str(e)}")

@app.get("/api/candidates/{candidate_id}")
async def get_candidate(candidate_id: int):
    """Get a specific candidate by ID"""
    try:
        engine = get_candidates_db_engine()
        
        query = "SELECT * FROM candidates WHERE id = ?"
        
        with engine.connect() as conn:
            result = conn.execute(text(query), [candidate_id])
            candidate_data = result.fetchone()
            
            if not candidate_data:
                raise HTTPException(status_code=404, detail="Candidate not found")
            
            candidate_dict = dict(candidate_data._mapping)
            
            # Convert None values for JSON serialization
            for key, value in candidate_dict.items():
                if value is None or (isinstance(value, float) and pd.isna(value)):
                    candidate_dict[key] = None
            
            return candidate_dict
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching candidate: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Candidates API Server...")
    print("📊 Database: candidates_database.db")
    print("🌐 API Docs: http://localhost:8000/docs")
    print("🔍 Search API: http://localhost:8000/api/candidates/search")
    uvicorn.run(app, host="0.0.0.0", port=8000)
