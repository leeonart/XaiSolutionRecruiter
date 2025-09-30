#!/usr/bin/env python3
"""
Job ID Cleaning Utility
Handles .x suffix removal and deduplication for job IDs
"""

import re
from typing import List, Set

def clean_job_ids(job_ids: List[str]) -> List[str]:
    """
    Clean job IDs by removing .x suffixes and deduplicating.
    
    Rules:
    1. Remove .x suffix from job IDs (e.g., "1234.1" -> "1234")
    2. If after cleaning there are duplicates, keep only the first occurrence
    3. Preserve order of first occurrence
    
    Args:
        job_ids: List of job ID strings
        
    Returns:
        List of cleaned and deduplicated job IDs
    """
    if not job_ids:
        return []
    
    cleaned_job_ids = []
    seen_cleaned_ids: Set[str] = set()
    
    for job_id in job_ids:
        if not job_id or not job_id.strip():
            continue
            
        original_job_id = job_id.strip()
        
        # Remove .x suffix if present
        # Pattern matches: number followed by .x where x is any character(s)
        cleaned_job_id = re.sub(r'\.\w+$', '', original_job_id)
        
        # Only add if we haven't seen this cleaned ID before
        if cleaned_job_id not in seen_cleaned_ids:
            cleaned_job_ids.append(cleaned_job_id)
            seen_cleaned_ids.add(cleaned_job_id)
        else:
            print(f"Removed duplicate job ID: {original_job_id} -> {cleaned_job_id} (already processed)")
    
    return cleaned_job_ids

def clean_job_id_string(job_id_string: str) -> str:
    """
    Clean a comma-separated string of job IDs.
    
    Args:
        job_id_string: Comma-separated string of job IDs
        
    Returns:
        Comma-separated string of cleaned job IDs
    """
    if not job_id_string or not job_id_string.strip():
        return ""
    
    # Split by comma and clean
    job_ids = [jid.strip() for jid in job_id_string.split(',') if jid.strip()]
    cleaned_job_ids = clean_job_ids(job_ids)
    
    return ','.join(cleaned_job_ids)

# Test function
def test_job_id_cleaning():
    """Test the job ID cleaning functionality"""
    print("Testing job ID cleaning functionality...")
    
    # Test cases
    test_cases = [
        {
            "input": ["1234", "1234.1", "1234.2", "5678", "5678.1"],
            "expected": ["1234", "5678"],
            "description": "Basic .x suffix removal and deduplication"
        },
        {
            "input": ["1234.1", "1234.2", "1234.3"],
            "expected": ["1234"],
            "description": "Multiple .x variants of same ID"
        },
        {
            "input": ["1234", "5678", "9012"],
            "expected": ["1234", "5678", "9012"],
            "description": "No .x suffixes, no changes needed"
        },
        {
            "input": ["1234.abc", "1234.xyz", "5678.1"],
            "expected": ["1234", "5678"],
            "description": "Non-numeric suffixes"
        },
        {
            "input": ["", "1234", "   ", "5678.1"],
            "expected": ["1234", "5678"],
            "description": "Empty strings and whitespace handling"
        }
    ]
    
    all_passed = True
    
    for i, test_case in enumerate(test_cases, 1):
        result = clean_job_ids(test_case["input"])
        passed = result == test_case["expected"]
        
        print(f"Test {i}: {test_case['description']}")
        print(f"  Input:    {test_case['input']}")
        print(f"  Expected: {test_case['expected']}")
        print(f"  Result:   {result}")
        print(f"  Status:   {'✅ PASS' if passed else '❌ FAIL'}")
        print()
        
        if not passed:
            all_passed = False
    
    # Test string cleaning
    string_test = "1234, 1234.1, 5678.2, 5678.3, 9012"
    expected_string = "1234,5678,9012"
    result_string = clean_job_id_string(string_test)
    
    print(f"String test:")
    print(f"  Input:    '{string_test}'")
    print(f"  Expected: '{expected_string}'")
    print(f"  Result:   '{result_string}'")
    print(f"  Status:   {'✅ PASS' if result_string == expected_string else '❌ FAIL'}")
    
    if result_string != expected_string:
        all_passed = False
    
    print(f"\nOverall result: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
    return all_passed

if __name__ == "__main__":
    test_job_id_cleaning()
