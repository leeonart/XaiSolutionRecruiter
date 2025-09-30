# PowerShell setup script for local development
Write-Host "Setting up local development environment..." -ForegroundColor Green
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ and try again" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local from template..." -ForegroundColor Yellow
    Copy-Item "env.local.example" ".env.local"
    Write-Host ""
    Write-Host "IMPORTANT: Edit .env.local and add your actual API keys!" -ForegroundColor Red
    Write-Host ""
}

# Create credentials directory if it doesn't exist
if (-not (Test-Path "credentials")) {
    Write-Host "Creating credentials directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Name "credentials"
    Write-Host ""
    Write-Host "IMPORTANT: Add your Google Drive credentials.json to the credentials/ folder!" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the development server, run:" -ForegroundColor Cyan
Write-Host "  python run_local.py" -ForegroundColor White
Write-Host ""
Write-Host "Or manually:" -ForegroundColor Cyan
Write-Host "  uvicorn api.index:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"



