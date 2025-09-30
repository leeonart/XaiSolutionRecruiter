import re
from typing import Optional

def sanitize_filename(name: str) -> str:
    """
    Remove or replace illegal filesystem characters from a filename.
    
    This function replaces characters that are not allowed in filenames
    across common operating systems (Windows, macOS, Linux) with underscores.
    
    Args:
        name: The original filename to sanitize
        
    Returns:
        A sanitized filename with illegal characters replaced by underscores
    """
    if not name:
        return "unnamed_file"
    
    # Replace illegal characters with underscores
    sanitized = re.sub(r'[\\/:"*?<>|]+', '_', name)
    
    # Ensure the filename isn't just dots (which is problematic on some filesystems)
    if sanitized in ['.', '..'] or not sanitized.strip('.'):
        sanitized = 'dot_' + sanitized
        
    return sanitized

def clean_api_output(text: str) -> str:
    """
    Clean and format text output from API responses.
    
    This function handles common issues with API outputs, particularly
    from AI models that may return markdown-formatted JSON or include
    control characters:
    
    1. Extracts content from markdown code fences (e.g., ```json ... ```)
    2. If no markdown fence is found, extracts content between the first '{' and last '}'
    3. Strips control characters that might cause issues
    4. Trims whitespace from the beginning and end
    
    Args:
        text: The raw text output from an API
        
    Returns:
        Cleaned text, hopefully a valid JSON string, ready for parsing.
    """
    if not text:
        return ""

    cleaned_text = text

    # Try to extract content from markdown code block
    # Matches ```json ... ``` or ``` ... ``` (non-greedy)
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        cleaned_text = match.group(1)
    else:
        # If no markdown block, try to find the first '{' and last '}'
        # This handles cases where JSON is directly embedded or is the sole content.
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            # Extract the substring that looks like a JSON object or array
            cleaned_text = text[first_brace : last_brace + 1]
        # If no braces or markdown, cleaned_text remains the original text,
        # which will likely fail JSON parsing later if it's not JSON,
        # but this function's job is to extract potential JSON.

    # Remove control characters from the potentially extracted JSON
    # (ensure it's applied to the extracted part, not the original full text if extraction happened)
    cleaned_text = re.sub(r'[\x00-\x1F]+', ' ', cleaned_text)
    
    return cleaned_text.strip()
