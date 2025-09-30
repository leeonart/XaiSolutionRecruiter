#!/usr/bin/env python3
"""
Helper script to install Google Drive dependencies for the AI Resume Matcher.
Run this script if you want to use Google Drive functionality.
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
    print("Installing Google Drive dependencies for AI Resume Matcher...")
    print("=" * 60)
    
    packages = [
        "google-auth",
        "google-auth-oauthlib", 
        "google-api-python-client",
        "pydrive2",
        "pydrive"  # Alternative option
    ]
    
    success_count = 0
    for package in packages:
        if install_package(package):
            success_count += 1
    
    print("=" * 60)
    if success_count == len(packages):
        print("🎉 All Google Drive dependencies installed successfully!")
        print("You can now use Google Drive functionality in the AI Resume Matcher.")
    else:
        print(f"⚠️  {len(packages) - success_count} packages failed to install.")
        print("Google Drive functionality may be limited.")
        print("\nYou can try installing manually:")
        print("pip install google-auth google-auth-oauthlib google-api-python-client pydrive2")
        print("Or try the alternative: pip install pydrive")

if __name__ == "__main__":
    main()
