#!/usr/bin/env python3
"""
Demo script to show notes cleaning without interactive prompts
"""

import sqlite3
import re
from pathlib import Path

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

def clean_notes_with_rules(notes_content):
    """Clean notes using rule-based approach"""
    if not notes_content:
        return ""
    
    # Start with the original content
    cleaned = notes_content
    
    # Remove metadata patterns
    # Remove asterisk blocks with timestamps and user info
    cleaned = re.sub(r'\*{5,}.*?\*{5,}', '', cleaned, flags=re.DOTALL)
    
    # Remove remaining asterisks
    cleaned = re.sub(r'\*+', '', cleaned)
    
    # Remove timestamps (various formats)
    cleaned = re.sub(r'\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}', '', cleaned)
    cleaned = re.sub(r'\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}', '', cleaned)
    
    # Remove user IDs and system metadata
    cleaned = re.sub(r'[A-Z]{2,}\s*\([^)]+\)', '', cleaned)  # BNEWMAN (API)
    cleaned = re.sub(r'Not Bookmarked, Not Edited', '', cleaned)
    cleaned = re.sub(r'\d{12,}', '', cleaned)  # Long numbers (like 225778834852349)
    
    # Remove common system phrases
    cleaned = re.sub(r'DOCONNOR\s*\(CGI\)', '', cleaned)
    
    # Clean up multiple spaces and newlines
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = re.sub(r'\n\s*\n', '\n\n', cleaned)
    
    # Clean up common patterns
    cleaned = re.sub(r'JO#\s*\d+', '', cleaned)  # Remove job numbers like JO# 7690
    cleaned = re.sub(r'Cell\s*-\s*', 'Phone: ', cleaned)  # Format phone numbers
    
    # Extract and format contact information
    # Look for email addresses
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', cleaned)
    # Look for phone numbers
    phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', cleaned)
    # Look for LinkedIn URLs
    linkedin_urls = re.findall(r'linkedin\.com/in/[^\s]+', cleaned, re.IGNORECASE)
    
    # Remove contact info from main text to avoid duplication
    cleaned = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', cleaned)
    cleaned = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '', cleaned)
    cleaned = re.sub(r'linkedin\.com/in/[^\s]+', '', cleaned, re.IGNORECASE)
    
    # Clean up again after removing contact info
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = cleaned.strip()
    
    # Create structured output
    result_parts = []
    
    # Add main content if it exists
    if cleaned and len(cleaned) > 10:
        result_parts.append("PROFESSIONAL SUMMARY:")
        result_parts.append(cleaned)
    
    # Add contact information if found
    contact_info = []
    if emails:
        contact_info.append(f"Email: {', '.join(emails)}")
    if phones:
        contact_info.append(f"Phone: {', '.join(phones)}")
    if linkedin_urls:
        contact_info.append(f"LinkedIn: {', '.join(linkedin_urls)}")
    
    if contact_info:
        result_parts.append("\nCONTACT INFORMATION:")
        result_parts.extend(contact_info)
    
    # Join all parts
    result = '\n\n'.join(result_parts)
    
    # Final cleanup
    result = re.sub(r'\n\s*\n\s*\n', '\n\n', result)  # Remove excessive newlines
    result = result.strip()
    
    return result if result else "No clean information available"

def main():
    print("🧹 Notes Cleaning Demo - Rule-Based Approach")
    print("=" * 60)
    
    # Get candidates with notes (limit to 3 for demo)
    candidates = get_candidates_with_notes(limit=3)
    print(f"📋 Found {len(candidates)} candidates with notes to demo")
    
    if not candidates:
        print("❌ No candidates with notes found")
        return
    
    for i, candidate in enumerate(candidates, 1):
        print(f"\n{'='*60}")
        print(f"--- DEMO: Candidate {i}/{len(candidates)} ---")
        print(f"👤 Name: {candidate['first_name']} {candidate['last_name']}")
        print(f"🆔 ID: {candidate['id']}")
        print(f"📝 Original notes length: {len(candidate['notes'])} characters")
        
        # Show original notes
        print(f"\n📄 ORIGINAL NOTES:")
        print("-" * 50)
        print(candidate['notes'])
        print("-" * 50)
        
        # Clean with rules
        print(f"\n🔧 CLEANING RESULTS:")
        cleaned_notes = clean_notes_with_rules(candidate['notes'])
        
        if cleaned_notes:
            print(f"✅ Cleaned notes length: {len(cleaned_notes)} characters")
            print(f"\n📄 CLEANED NOTES:")
            print("-" * 50)
            print(cleaned_notes)
            print("-" * 50)
            
            # Show improvement
            original_length = len(candidate['notes'])
            cleaned_length = len(cleaned_notes)
            improvement = ((original_length - cleaned_length) / original_length) * 100 if original_length > 0 else 0
            
            print(f"\n📊 IMPROVEMENT:")
            print(f"   Original: {original_length} characters")
            print(f"   Cleaned:  {cleaned_length} characters")
            print(f"   Reduction: {improvement:.1f}% less clutter")
        else:
            print("❌ Failed to clean notes")
    
    print(f"\n🎉 Demo complete! Processed {len(candidates)} candidates.")
    print(f"\n💡 SUGGESTED PROMPT FOR AI CLEANING:")
    print("=" * 60)
    print("""
Clean up and reformat the following candidate notes. Remove all metadata, 
timestamps, and system-generated content. Extract only the important information 
and format it in a clean, easy-to-read structure.

Guidelines:
1. Remove asterisks, timestamps, user IDs, and system metadata
2. Remove phrases like "Not Bookmarked, Not Edited" and random numbers  
3. Extract key information: contact preferences, experience, salary expectations
4. Format in clear, readable paragraphs
5. Preserve important details while removing clutter
6. Organize contact information separately

The rule-based approach above shows what can be achieved without AI.
For AI cleaning, use this prompt with your preferred AI agent.
""")

if __name__ == "__main__":
    main()
