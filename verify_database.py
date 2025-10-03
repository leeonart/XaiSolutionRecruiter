#!/usr/bin/env python3
"""
Database Verification Script
This script verifies the database contents and shows sample data.
"""

import sqlite3
import pandas as pd

def verify_database(db_path):
    """Verify database contents"""
    conn = sqlite3.connect(db_path)
    
    # Get table info
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables in database: {tables}")
    
    # Get basic statistics
    cursor.execute("SELECT COUNT(*) FROM candidates")
    total_records = cursor.fetchone()[0]
    print(f"Total records: {total_records}")
    
    # Check candidate status distribution
    cursor.execute("SELECT candidate_status, COUNT(*) FROM candidates GROUP BY candidate_status ORDER BY COUNT(*) DESC")
    status_counts = cursor.fetchall()
    print("\nCandidate Status Distribution:")
    for status, count in status_counts:
        print(f"  {status}: {count}")
    
    # Check salary statistics
    cursor.execute("SELECT MIN(current_salary), MAX(current_salary), AVG(current_salary) FROM candidates WHERE current_salary IS NOT NULL AND current_salary > 0")
    salary_stats = cursor.fetchone()
    print(f"\nSalary Statistics:")
    print(f"  Min: ${salary_stats[0]:,.2f}" if salary_stats[0] else "  Min: N/A")
    print(f"  Max: ${salary_stats[1]:,.2f}" if salary_stats[1] else "  Max: N/A")
    print(f"  Avg: ${salary_stats[2]:,.2f}" if salary_stats[2] else "  Avg: N/A")
    
    # Show sample data
    print("\nSample Records:")
    cursor.execute("SELECT first_name, last_name, candidate_status, current_salary, email_address FROM candidates LIMIT 5")
    sample_data = cursor.fetchall()
    for row in sample_data:
        print(f"  {row[0]} {row[1]} | Status: {row[2]} | Salary: ${row[3]:,.2f}" if row[3] else f"  {row[0]} {row[1]} | Status: {row[2]} | Salary: N/A")
    
    # Check for duplicate emails
    cursor.execute("SELECT email_address, COUNT(*) as count FROM candidates WHERE email_address IS NOT NULL GROUP BY email_address HAVING count > 1 ORDER BY count DESC LIMIT 10")
    duplicates = cursor.fetchall()
    print(f"\nTop Duplicate Emails:")
    for email, count in duplicates:
        print(f"  {email}: {count} occurrences")
    
    conn.close()

if __name__ == "__main__":
    db_path = "/home/leemax/projects/NewCompleteWorking/candidates_database.db"
    verify_database(db_path)
