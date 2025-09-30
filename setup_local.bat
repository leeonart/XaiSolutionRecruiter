@echo off
echo Setting up local development environment...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

echo Python found. Installing dependencies...

REM Install dependencies
pip install -r requirements.txt

REM Create .env.local if it doesn't exist
if not exist .env.local (
    echo Creating .env.local from template...
    copy env.local.example .env.local
    echo.
    echo IMPORTANT: Edit .env.local and add your actual API keys!
    echo.
)

REM Create credentials directory if it doesn't exist
if not exist credentials (
    echo Creating credentials directory...
    mkdir credentials
    echo.
    echo IMPORTANT: Add your Google Drive credentials.json to the credentials/ folder!
    echo.
)

echo Setup complete!
echo.
echo To start the development server, run:
echo   python run_local.py
echo.
echo Or manually:
echo   uvicorn api.index:app --reload --host 0.0.0.0 --port 8000
echo.
pause



