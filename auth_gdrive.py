#!/usr/bin/env python3
"""
Simple Google Drive authentication script
This script will help re-authenticate with Google Drive
"""

import os
import sys
sys.path.append('.')

def authenticate_google_drive():
    """Authenticate with Google Drive and save credentials"""
    try:
        from modules.gdrive_operations import authenticate_drive
        
        print("🔐 Starting Google Drive authentication...")
        print("📁 Checking credentials directory...")
        
        if not os.path.exists('credentials'):
            print("❌ Credentials directory not found!")
            return False
            
        if not os.path.exists('credentials/client_secrets.json'):
            print("❌ client_secrets.json not found!")
            print("Please ensure you have set up Google Drive API credentials.")
            return False
            
        print("✅ Credentials files found")
        print("🔑 Attempting authentication...")
        
        # This will trigger the authentication flow
        drive = authenticate_drive()
        
        if drive:
            print("✅ Google Drive authentication successful!")
            print("🎉 You can now use Google Drive features in the web app.")
            return True
        else:
            print("❌ Google Drive authentication failed!")
            print("💡 You may need to run this script in a browser-enabled environment.")
            return False
            
    except Exception as e:
        print(f"❌ Error during authentication: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Google Drive Authentication Helper")
    print("=" * 50)
    
    success = authenticate_google_drive()
    
    if success:
        print("\n✅ Authentication completed successfully!")
        print("🌐 Your web application should now have Google Drive access.")
    else:
        print("\n❌ Authentication failed.")
        print("💡 Alternative solutions:")
        print("   1. Run this script in a local environment with browser access")
        print("   2. Use the web app without Google Drive features")
        print("   3. Upload files directly through the web interface")
