#!/usr/bin/env python3
"""
Script to clean up and format candidate notes using AI
"""

import sqlite3
import requests
import json
import time
from pathlib import Path

# AI Agent configuration
AI_AGENT_URL = "http://localhost/api/ai-agents/process-text"
AI_AGENT = "openai"  # or "grok", "gemini", etc.

def get_candidates_with_notes(limit=None):
    """Get candidates that have notes"""
    db_path = Path(__file__).parent / "candidates_database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    query = "SELECT id, first_name, last_name, notes FROM candidates WHERE notes IS NOT NULL AND notes != ''"
    if limit:
        query += f" LIMIT {limit}"
    
    cursor.execute(query)
    results = cursor.fetchall()
    conn.close()
    
    return [{"id": row[0], "first_name": row[1], "last_name": row[2], "notes": row[3]} for row in results]

def clean_notes_with_ai(notes_content):
    """Send notes to AI for cleaning and formatting"""
    prompt = """
Please clean up and reformat the following candidate notes. Remove all metadata, timestamps, and system-generated content. Extract only the important information and format it in a clean, easy-to-read structure.

Guidelines:
1. Remove all asterisks, timestamps, user IDs, and system metadata
2. Remove phrases like "Not Bookmarked, Not Edited" and random numbers
3. Extract and organize key information such as:
   - Contact preferences and interest areas
   - Experience highlights
   - Salary expectations
   - Contact information
   - Key qualifications
4. Format the information in clear, readable paragraphs
5. Preserve important details while removing clutter
6. If multiple entries exist, consolidate them logically

Original notes:
"""
    
    try:
        response = requests.post(
            AI_AGENT_URL,
            json={
                "text": prompt + notes_content,
                "ai_agent": AI_AGENT,
                "max_tokens": 500
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get("processed_text", "Error: No processed text returned")
        else:
            print(f"AI API error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Error calling AI API: {e}")
        return None

def update_candidate_notes(candidate_id, cleaned_notes):
    """Update the candidate's notes in the database"""
    db_path = Path(__file__).parent / "candidates_database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE candidates SET notes = ? WHERE id = ?",
        (cleaned_notes, candidate_id)
    )
    
    conn.commit()
    conn.close()
    print(f"Updated notes for candidate ID {candidate_id}")

def main():
    print("🧹 Starting Notes Cleanup with AI...")
    print(f"🤖 Using AI Agent: {AI_AGENT}")
    
    # Get candidates with notes (limit to 3 for testing)
    candidates = get_candidates_with_notes(limit=3)
    print(f"📋 Found {len(candidates)} candidates with notes to process")
    
    if not candidates:
        print("❌ No candidates with notes found")
        return
    
    for i, candidate in enumerate(candidates, 1):
        print(f"\n--- Processing Candidate {i}/{len(candidates)} ---")
        print(f"👤 {candidate['first_name']} {candidate['last_name']} (ID: {candidate['id']})")
        print(f"📝 Original notes length: {len(candidate['notes'])} characters")
        
        # Show original notes preview
        print(f"📄 Original notes preview: {candidate['notes'][:200]}...")
        
        # Clean with AI
        print("🤖 Sending to AI for cleaning...")
        cleaned_notes = clean_notes_with_ai(candidate['notes'])
        
        if cleaned_notes:
            print(f"✅ AI cleaned notes length: {len(cleaned_notes)} characters")
            print(f"📄 Cleaned notes preview: {cleaned_notes[:200]}...")
            
            # Ask for confirmation before updating
            response = input(f"\n❓ Update notes for {candidate['first_name']} {candidate['last_name']}? (y/n): ")
            if response.lower() == 'y':
                update_candidate_notes(candidate['id'], cleaned_notes)
                print("✅ Notes updated successfully!")
            else:
                print("⏭️  Skipped updating notes")
        else:
            print("❌ Failed to clean notes with AI")
        
        # Add delay to avoid rate limiting
        if i < len(candidates):
            print("⏳ Waiting 2 seconds before next candidate...")
            time.sleep(2)
    
    print(f"\n🎉 Processing complete! Processed {len(candidates)} candidates.")

if __name__ == "__main__":
    main()
