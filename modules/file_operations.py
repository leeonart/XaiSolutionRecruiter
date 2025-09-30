import os
import re
import shutil
from datetime import datetime

from .utils import sanitize_filename

def copy_files_with_numbers(source_dir: str, destination_dir: str, numbers_to_find: list[str]) -> None:
    """
    Copy files from source_dir to destination_dir if their names contain any of the numbers in numbers_to_find.
    
    Args:
        source_dir: Source directory path
        destination_dir: Destination directory path
        numbers_to_find: List of job ID numbers to search for in filenames
        
    Returns:
        None
    """
    if not os.path.isdir(source_dir):
        print(f"Error: Source directory '{source_dir}' not found.")
        return

    if not numbers_to_find:
        print("Error: No job IDs provided.")
        return

    os.makedirs(destination_dir, exist_ok=True)
    
    # Create a pattern that matches whole job IDs, not as part of larger numbers
    pattern = re.compile(rf"(?<!\d)({'|'.join(map(re.escape, numbers_to_find))})(?!\d)", re.IGNORECASE)
    found = set()
    copied_count = 0

    try:
        log_copied = open(os.path.join(destination_dir, "log_copied_files_local.txt"), "a", encoding="utf-8")
        log_missing = open(os.path.join(destination_dir, "log_missing_numbers.txt"), "a", encoding="utf-8")

        for entry in os.scandir(source_dir):
            if not entry.is_file():
                continue
            m = pattern.search(entry.name)
            if m:
                found.add(m.group(1))
                dest_path = os.path.join(destination_dir, sanitize_filename(entry.name))
                shutil.copy2(entry.path, dest_path)
                log_copied.write(f"{datetime.now()}: Copied {entry.name}\n")
                copied_count += 1

        missing = set(numbers_to_find) - {n.lower() for n in found}
        for num in sorted(missing):
            log_missing.write(f"{datetime.now()}: Missing {num}\n")

        print(f"Copied {copied_count} files; {len(missing)} numbers not found.")
    except Exception as e:
        print(f"Error during file copy operation: {e}")
    finally:
        if 'log_copied' in locals():
            log_copied.close()
        if 'log_missing' in locals():
            log_missing.close()
