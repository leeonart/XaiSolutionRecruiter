#!/usr/bin/env python3
"""
Database Query Interface for Candidates Database
This script provides a simple interface to query the candidates database.
"""

import sqlite3
import pandas as pd
from typing import List, Dict, Any

class CandidatesDatabase:
    def __init__(self, db_path: str = "candidates_database.db"):
        """Initialize the database connection"""
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row  # Enable column access by name
    
    def close(self):
        """Close the database connection"""
        self.conn.close()
    
    def get_table_info(self) -> pd.DataFrame:
        """Get information about the database table structure"""
        cursor = self.conn.cursor()
        cursor.execute("PRAGMA table_info(candidates)")
        columns = cursor.fetchall()
        return pd.DataFrame(columns, columns=['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'])
    
    def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics about the database"""
        cursor = self.conn.cursor()
        
        # Total records
        cursor.execute("SELECT COUNT(*) as total FROM candidates")
        total = cursor.fetchone()['total']
        
        # Candidate status distribution
        cursor.execute("SELECT candidate_status, COUNT(*) as count FROM candidates GROUP BY candidate_status")
        status_dist = {row['candidate_status']: row['count'] for row in cursor.fetchall()}
        
        # Unique emails
        cursor.execute("SELECT COUNT(DISTINCT email_address) as unique_emails FROM candidates WHERE email_address IS NOT NULL")
        unique_emails = cursor.fetchone()['unique_emails']
        
        # Unique recruiters
        cursor.execute("SELECT COUNT(DISTINCT recruiter) as unique_recruiters FROM candidates WHERE recruiter IS NOT NULL")
        unique_recruiters = cursor.fetchone()['unique_recruiters']
        
        # Salary statistics
        cursor.execute("SELECT MIN(current_salary) as min_salary, MAX(current_salary) as max_salary, AVG(current_salary) as avg_salary FROM candidates WHERE current_salary IS NOT NULL")
        salary_stats = cursor.fetchone()
        
        return {
            'total_records': total,
            'unique_emails': unique_emails,
            'unique_recruiters': unique_recruiters,
            'status_distribution': status_dist,
            'salary_stats': {
                'min': salary_stats['min_salary'],
                'max': salary_stats['max_salary'],
                'avg': salary_stats['avg_salary']
            }
        }
    
    def search_candidates(self, 
                         first_name: str = None,
                         last_name: str = None,
                         email: str = None,
                         status: str = None,
                         recruiter: str = None,
                         min_salary: float = None,
                         max_salary: float = None,
                         limit: int = 100) -> pd.DataFrame:
        """Search for candidates with various filters"""
        
        query = "SELECT * FROM candidates WHERE 1=1"
        params = []
        
        if first_name:
            query += " AND first_name LIKE ?"
            params.append(f"%{first_name}%")
        
        if last_name:
            query += " AND last_name LIKE ?"
            params.append(f"%{last_name}%")
        
        if email:
            query += " AND email_address LIKE ?"
            params.append(f"%{email}%")
        
        if status:
            query += " AND candidate_status = ?"
            params.append(status)
        
        if recruiter:
            query += " AND recruiter LIKE ?"
            params.append(f"%{recruiter}%")
        
        if min_salary:
            query += " AND current_salary >= ?"
            params.append(min_salary)
        
        if max_salary:
            query += " AND current_salary <= ?"
            params.append(max_salary)
        
        query += f" ORDER BY last_name, first_name LIMIT {limit}"
        
        return pd.read_sql_query(query, self.conn, params=params)
    
    def get_candidates_by_recruiter(self, recruiter: str = None) -> pd.DataFrame:
        """Get candidates grouped by recruiter"""
        if recruiter:
            query = "SELECT * FROM candidates WHERE recruiter LIKE ? ORDER BY last_name, first_name"
            params = [f"%{recruiter}%"]
        else:
            query = "SELECT * FROM candidates WHERE recruiter IS NOT NULL ORDER BY recruiter, last_name, first_name"
            params = []
        
        return pd.read_sql_query(query, self.conn, params=params)
    
    def get_top_recruiters(self, limit: int = 10) -> pd.DataFrame:
        """Get top recruiters by number of candidates"""
        query = """
        SELECT recruiter, COUNT(*) as candidate_count, 
               AVG(current_salary) as avg_salary,
               COUNT(CASE WHEN candidate_status = 'C' THEN 1 END) as active_candidates,
               COUNT(CASE WHEN candidate_status = 'P' THEN 1 END) as placed_candidates
        FROM candidates 
        WHERE recruiter IS NOT NULL 
        GROUP BY recruiter 
        ORDER BY candidate_count DESC 
        LIMIT ?
        """
        return pd.read_sql_query(query, self.conn, params=[limit])
    
    def get_salary_analysis(self) -> pd.DataFrame:
        """Get salary analysis by various dimensions"""
        query = """
        SELECT 
            candidate_status,
            COUNT(*) as count,
            MIN(current_salary) as min_salary,
            MAX(current_salary) as max_salary,
            AVG(current_salary) as avg_salary,
            COUNT(CASE WHEN current_salary IS NOT NULL THEN 1 END) as with_salary
        FROM candidates 
        GROUP BY candidate_status
        ORDER BY avg_salary DESC
        """
        return pd.read_sql_query(query, self.conn)
    
    def get_duplicate_emails(self) -> pd.DataFrame:
        """Find duplicate email addresses"""
        query = """
        SELECT email_address, COUNT(*) as count, 
               GROUP_CONCAT(first_name || ' ' || last_name) as names
        FROM candidates 
        WHERE email_address IS NOT NULL 
        GROUP BY email_address 
        HAVING COUNT(*) > 1 
        ORDER BY count DESC
        """
        return pd.read_sql_query(query, self.conn)

def main():
    """Main function to demonstrate the database interface"""
    db = CandidatesDatabase()
    
    try:
        print("=== Candidates Database Summary ===")
        stats = db.get_summary_stats()
        print(f"Total Records: {stats['total_records']:,}")
        print(f"Unique Emails: {stats['unique_emails']:,}")
        print(f"Unique Recruiters: {stats['unique_recruiters']:,}")
        print(f"\nCandidate Status Distribution:")
        for status, count in stats['status_distribution'].items():
            print(f"  {status}: {count:,}")
        
        salary = stats['salary_stats']
        print(f"\nSalary Statistics:")
        print(f"  Min: ${salary['min']:,.2f}")
        print(f"  Max: ${salary['max']:,.2f}")
        print(f"  Average: ${salary['avg']:,.2f}")
        
        print("\n=== Top Recruiters ===")
        top_recruiters = db.get_top_recruiters(5)
        print(top_recruiters.to_string(index=False))
        
        print("\n=== Salary Analysis by Status ===")
        salary_analysis = db.get_salary_analysis()
        print(salary_analysis.to_string(index=False))
        
        print("\n=== Duplicate Emails ===")
        duplicates = db.get_duplicate_emails()
        if not duplicates.empty:
            print(duplicates.to_string(index=False))
        else:
            print("No duplicate emails found")
        
        print("\n=== Sample Active Candidates ===")
        sample = db.search_candidates(status='C', limit=5)
        if not sample.empty:
            display_cols = ['first_name', 'last_name', 'email_address', 'candidate_status', 'current_salary', 'recruiter']
            print(sample[display_cols].to_string(index=False))
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
