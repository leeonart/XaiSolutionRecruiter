#!/usr/bin/env python3
"""
Installation script for AI Resume Matcher dependencies.
This script will install the required Google API packages to resolve import errors.
"""

import subprocess
import sys

def install_package(package):
    """Install a package using pip."""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✓ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError:
        print(f"✗ Failed to install {package}")
        return False

def main():
    print("Installing required Google API dependencies...")
    print("=" * 50)
    
    # Core Google API packages
    google_packages = [
        "google-auth",
        "google-auth-oauthlib", 
        "google-api-python-client"
    ]
    
    success_count = 0
    for package in google_packages:
        if install_package(package):
            success_count += 1
    
    print("=" * 50)
    if success_count == len(google_packages):
        print("✓ All Google API dependencies installed successfully!")
        print("The import error should now be resolved.")
    else:
        print(f"⚠ {len(google_packages) - success_count} packages failed to install.")
        print("You may need to install them manually or check your Python environment.")
    
    print("\nYou can now run the AI Resume Matcher without import errors.")

if __name__ == "__main__":
    main()

