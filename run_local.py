#!/usr/bin/env python3
"""
Local Development Server for AI Job Processing Platform
Run this to test the application locally before deploying to Vercel
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def main():
    """Run the local development server"""
    print("🚀 Starting AI Job Processing Platform - Local Development Server")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not Path("api/index.py").exists():
        print("❌ Error: api/index.py not found!")
        print("Make sure you're running this from the project root directory.")
        sys.exit(1)
    
    # Check for environment file
    env_file = Path(".env.local")
    if not env_file.exists():
        print("⚠️  Warning: .env.local not found!")
        print("Copy env.example to .env.local and add your API keys:")
        print("  cp env.example .env.local")
        print("  # Then edit .env.local with your actual API keys")
        print()
    
    # Check for credentials
    creds_dir = Path("credentials")
    if not creds_dir.exists():
        print("⚠️  Warning: credentials/ directory not found!")
        print("Create it and add your Google Drive credentials.json file")
        print()
    
    print("🌐 Starting server...")
    print("📱 Web Interface: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔧 ReDoc Documentation: http://localhost:8000/redoc")
    print("=" * 60)
    print("Press Ctrl+C to stop the server")
    print()
    
    try:
        # Run the FastAPI server
        uvicorn.run(
            "api.index:app",
            host="0.0.0.0",
            port=8000,
            reload=True,  # Auto-reload on code changes
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped. Goodbye!")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()



