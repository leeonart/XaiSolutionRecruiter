#!/usr/bin/env python3
"""
Debug script to test text extraction from job description files
"""

import os
import sys

# Add the modules directory to the path
sys.path.append('modules')

def test_text_extraction():
    """Test text extraction from job 8734 files"""

    files_to_check = [
        r'E:\JobDescription\20250903\8734 Capitol Aggregates Environmental Director San Antonio TX.docx',
        r'E:\JobDescription\20250903\8734 NOTES 8734.docx'
    ]

    print("=== TEXT EXTRACTION DEBUG ===")

    for file_path in files_to_check:
        print(f"\n--- Checking file: {os.path.basename(file_path)} ---")

        if not os.path.exists(file_path):
            print("[ERROR] FILE NOT FOUND")
            continue
    
            file_size = os.path.getsize(file_path)
            print(f"[OK] File exists, size: {file_size} bytes")
    
            # Try different text extraction methods
            try:
                from modules.text_combiner import extract_text_from_docx
                print("[INFO] Attempting text extraction with extract_text_from_docx...")
                text = extract_text_from_docx(file_path)
                print(f"[OK] Extraction successful, length: {len(text)} characters")
    
                if len(text.strip()) == 0:
                    print("[WARNING] Extracted text is empty!")
                else:
                    print("[CONTENT] Content preview:")
                    print(repr(text[:500]))
                    if len(text) > 500:
                        print("... (truncated)")
    
            except Exception as e:
                print(f"[ERROR] Text extraction failed: {e}")
                import traceback
                traceback.print_exc()
    
            # Try alternative method
            try:
                print("[INFO] Attempting alternative extraction...")
                # Check if python-docx is available
                import docx
                doc = docx.Document(file_path)
                alt_text = ""
                for para in doc.paragraphs:
                    alt_text += para.text + "\n"
    
                print(f"[OK] Alternative extraction successful, length: {len(alt_text)} characters")
                if len(alt_text.strip()) == 0:
                    print("[WARNING] Alternative extracted text is also empty!")
                else:
                    print("[CONTENT] Alternative content preview:")
                    print(repr(alt_text[:500]))
    
            except ImportError:
                print("[INFO] python-docx not available for alternative method")
            except Exception as e:
                print(f"[ERROR] Alternative extraction also failed: {e}")

if __name__ == "__main__":
    test_text_extraction()