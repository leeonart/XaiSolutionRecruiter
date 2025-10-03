#!/usr/bin/env python3
"""
Improved script to clean up and format candidate notes using AI
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

def clean_notes_with_ai(notes_content, candidate_name):
    """Send notes to AI for cleaning and formatting"""
    prompt = f"""
You are a data cleaning specialist. Please clean up and reformat the following candidate notes for {candidate_name}. 

TASK: Transform messy, metadata-heavy notes into clean, professional candidate information.

ORIGINAL NOTES:
{notes_content}

CLEANING INSTRUCTIONS:
1. Remove ALL metadata including:
   - Asterisks (*****)
   - Timestamps (dates and times)
   - User IDs (like BNEWMAN, API, etc.)
   - System flags ("Not Bookmarked, Not Edited")
   - Random numbers and codes
   - Database IDs

2. Extract and organize ONLY the valuable information:
   - Professional experience and background
   - Contact information (email, phone, LinkedIn)
   - Salary expectations
   - Job interests and preferences
   - Key qualifications and skills
   - Current employment status

3. Format the output as clean, readable text with:
   - Clear paragraphs
   - Proper capitalization
   - Logical organization
   - Professional tone

4. If multiple entries exist, consolidate them into a single coherent summary

5. Keep all important business information but remove technical clutter

OUTPUT FORMAT: Clean, professional candidate summary ready for human review.

CLEANED NOTES:
"""
    
    try:
        response = requests.post(
            AI_AGENT_URL,
            json={
                "text": prompt,
                "ai_agent": AI_AGENT,
                "max_tokens": 800,
                "temperature": 0.3  # Lower temperature for more consistent formatting
            },
            timeout=45
        )
        
        if response.status_code == 200:
            result = response.json()
            cleaned_text = result.get("processed_text", "").strip()
            
            # Remove any remaining prompt text that might have been included
            if "CLEANED NOTES:" in cleaned_text:
                cleaned_text = cleaned_text.split("CLEANED NOTES:")[-1].strip()
            
            return cleaned_text if cleaned_text else None
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
    print(f"✅ Updated notes for candidate ID {candidate_id}")

def backup_original_notes():
    """Create a backup of original notes"""
    db_path = Path(__file__).parent / "candidates_database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add backup column if it doesn't exist
    try:
        cursor.execute("ALTER TABLE candidates ADD COLUMN notes_backup TEXT")
        print("📋 Created notes_backup column")
    except sqlite3.OperationalError:
        print("📋 notes_backup column already exists")
    
    # Copy original notes to backup
    cursor.execute("UPDATE candidates SET notes_backup = notes WHERE notes IS NOT NULL AND notes_backup IS NULL")
    conn.commit()
    conn.close()
    print("💾 Backed up original notes to notes_backup column")

def main():
    print("🧹 Starting Improved Notes Cleanup with AI...")
    print(f"🤖 Using AI Agent: {AI_AGENT}")
    
    # Create backup first
    print("\n📋 Creating backup of original notes...")
    backup_original_notes()
    
    # Get candidates with notes (limit to 2 for initial testing)
    candidates = get_candidates_with_notes(limit=2)
    print(f"\n📋 Found {len(candidates)} candidates with notes to process")
    
    if not candidates:
        print("❌ No candidates with notes found")
        return
    
    for i, candidate in enumerate(candidates, 1):
        print(f"\n{'='*60}")
        print(f"--- Processing Candidate {i}/{len(candidates)} ---")
        print(f"👤 Name: {candidate['first_name']} {candidate['last_name']}")
        print(f"🆔 ID: {candidate['id']}")
        print(f"📝 Original notes length: {len(candidate['notes'])} characters")
        
        # Show original notes
        print(f"\n📄 ORIGINAL NOTES:")
        print("-" * 40)
        print(candidate['notes'][:400] + "..." if len(candidate['notes']) > 400 else candidate['notes'])
        print("-" * 40)
        
        # Clean with AI
        print(f"\n🤖 Sending to AI for cleaning...")
        cleaned_notes = clean_notes_with_ai(candidate['notes'], f"{candidate['first_name']} {candidate['last_name']}")
        
        if cleaned_notes:
            print(f"✅ AI cleaned notes length: {len(cleaned_notes)} characters")
            print(f"\n📄 CLEANED NOTES:")
            print("-" * 40)
            print(cleaned_notes)
            print("-" * 40)
            
            # Ask for confirmation before updating
            response = input(f"\n❓ Update notes for {candidate['first_name']} {candidate['last_name']}? (y/n/s to skip remaining): ")
            if response.lower() == 'y':
                update_candidate_notes(candidate['id'], cleaned_notes)
                print("✅ Notes updated successfully!")
            elif response.lower() == 's':
                print("⏭️  Skipping remaining candidates...")
                break
            else:
                print("⏭️  Skipped updating notes")
        else:
            print("❌ Failed to clean notes with AI")
        
        # Add delay to avoid rate limiting
        if i < len(candidates):
            print("\n⏳ Waiting 3 seconds before next candidate...")
            time.sleep(3)
    
    print(f"\n🎉 Processing complete! Processed {i} candidates.")

if __name__ == "__main__":
    main()
