#!/usr/bin/env python3
"""
Simple script to clean up candidate notes using the existing AI infrastructure
"""

import sqlite3
import sys
import os
from pathlib import Path

# Add the backend to the path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

try:
    from app.ai_resume_extractor import AIResumeExtractor
    AI_AVAILABLE = True
except ImportError as e:
    print(f"AI system not available: {e}")
    AI_AVAILABLE = False

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
    """Clean notes using the AI system"""
    if not AI_AVAILABLE:
        return None
    
    try:
        ai_extractor = AIResumeExtractor()
        
        # Create a prompt for cleaning notes
        prompt = f"""
Please clean up and reformat the following candidate notes for {candidate_name}.

Remove all metadata, timestamps, and system-generated content. Extract only the important information and format it in a clean, easy-to-read structure.

Guidelines:
1. Remove asterisks, timestamps, user IDs, and system metadata
2. Remove phrases like "Not Bookmarked, Not Edited" and random numbers
3. Extract key information: contact preferences, experience, salary expectations, qualifications
4. Format in clear, readable paragraphs
5. Preserve important details while removing clutter

Original notes:
{notes_content}

Please provide only the cleaned, formatted notes without any additional commentary.
"""
        
        # Use the AI extractor to process the text
        result = ai_extractor.process_text(prompt)
        
        if result and not result.get("error"):
            return result.get("processed_text", "").strip()
        else:
            print(f"AI processing error: {result.get('error', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"Error with AI processing: {e}")
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

def main():
    print("🧹 Starting Notes Cleanup with AI...")
    
    if not AI_AVAILABLE:
        print("❌ AI system not available. Please check the backend setup.")
        return
    
    # Get candidates with notes (limit to 2 for testing)
    candidates = get_candidates_with_notes(limit=2)
    print(f"📋 Found {len(candidates)} candidates with notes to process")
    
    if not candidates:
        print("❌ No candidates with notes found")
        return
    
    for i, candidate in enumerate(candidates, 1):
        print(f"\n{'='*60}")
        print(f"--- Processing Candidate {i}/{len(candidates)} ---")
        print(f"👤 Name: {candidate['first_name']} {candidate['last_name']}")
        print(f"🆔 ID: {candidate['id']}")
        
        # Show original notes
        print(f"\n📄 ORIGINAL NOTES:")
        print("-" * 40)
        print(candidate['notes'][:300] + "..." if len(candidate['notes']) > 300 else candidate['notes'])
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
            response = input(f"\n❓ Update notes for {candidate['first_name']} {candidate['last_name']}? (y/n): ")
            if response.lower() == 'y':
                update_candidate_notes(candidate['id'], cleaned_notes)
                print("✅ Notes updated successfully!")
            else:
                print("⏭️  Skipped updating notes")
        else:
            print("❌ Failed to clean notes with AI")
    
    print(f"\n🎉 Processing complete! Processed {len(candidates)} candidates.")

if __name__ == "__main__":
    main()
