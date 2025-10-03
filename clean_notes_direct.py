#!/usr/bin/env python3
"""
Direct script to clean up candidate notes using AI client
"""

import sqlite3
import sys
import os
from pathlib import Path

# Add the backend to the path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

try:
    import openai
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
    """Clean notes using AI directly"""
    if not AI_AVAILABLE:
        return None
    
    try:
        # Initialize AI extractor to get the client
        ai_extractor = AIResumeExtractor()
        
        # Create a focused prompt for cleaning notes
        prompt = f"""Clean up and reformat the following candidate notes for {candidate_name}.

TASK: Remove all metadata and system clutter, extract only valuable information.

REMOVE:
- Asterisks (*****)
- Timestamps and dates
- User IDs (BNEWMAN, API, etc.)
- System flags ("Not Bookmarked, Not Edited")
- Random numbers and codes

EXTRACT AND ORGANIZE:
- Professional experience
- Contact information
- Salary expectations
- Job interests
- Key qualifications
- Current status

FORMAT: Clean, readable paragraphs with proper capitalization.

Original notes:
{notes_content}

Provide only the cleaned notes, no additional commentary:"""

        # Use the AI client directly
        response = ai_extractor.grok_client.chat.completions.create(
            model="grok-4-fast",
            messages=[
                {"role": "system", "content": "You are a data cleaning specialist. Clean up messy text data while preserving all important information."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=0.2
        )
        
        cleaned_text = response.choices[0].message.content.strip()
        return cleaned_text if cleaned_text else None
        
    except Exception as e:
        print(f"Error with AI processing: {e}")
        return None

def update_candidate_notes(candidate_id, cleaned_notes):
    """Update the candidate's notes in the database"""
    db_path = Path(__file__).parent / "candidates_database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add backup column if it doesn't exist
    try:
        cursor.execute("ALTER TABLE candidates ADD COLUMN notes_backup TEXT")
        print("📋 Created notes_backup column")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Backup original notes if not already backed up
    cursor.execute("UPDATE candidates SET notes_backup = notes WHERE id = ? AND notes_backup IS NULL", (candidate_id,))
    
    # Update with cleaned notes
    cursor.execute(
        "UPDATE candidates SET notes = ? WHERE id = ?",
        (cleaned_notes, candidate_id)
    )
    
    conn.commit()
    conn.close()
    print(f"✅ Updated notes for candidate ID {candidate_id}")

def main():
    print("🧹 Starting Direct Notes Cleanup with AI...")
    
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
        print(f"📝 Original notes length: {len(candidate['notes'])} characters")
        
        # Show original notes preview
        print(f"\n📄 ORIGINAL NOTES (first 400 chars):")
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
    
    print(f"\n🎉 Processing complete! Processed {i} candidates.")

if __name__ == "__main__":
    main()
