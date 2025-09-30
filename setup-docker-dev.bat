@echo off
REM AI Job Processing Platform - Docker Development Setup for Windows
REM This script sets up the Docker environment for local development

echo 🚀 Setting up AI Job Processing Platform for Docker development...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose and try again.
    pause
    exit /b 1
)

REM Create .env.local file if it doesn't exist
if not exist .env.local (
    echo 📝 Creating .env.local file...
    copy env.local.example .env.local
    echo ✅ Created .env.local file. Please edit it with your API keys if needed.
)

REM Create frontend directory if it doesn't exist
if not exist frontend (
    echo 📁 Creating frontend directory structure...
    mkdir frontend\src\components\ui
    mkdir frontend\src\pages
    mkdir frontend\src\lib
    mkdir frontend\src\hooks
)

REM Build and start services
echo 🔨 Building Docker containers...
docker-compose -f docker-compose.dev.yml build

echo 🚀 Starting services...
docker-compose -f docker-compose.dev.yml up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check if services are running
echo 🔍 Checking service status...
docker-compose -f docker-compose.dev.yml ps

echo.
echo ✅ Setup complete! Your development environment is ready:
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 📚 API Documentation: http://localhost:8000/docs
echo 🗄️  Database: localhost:5432
echo.
echo 📋 Useful commands:
echo   View logs: docker-compose -f docker-compose.dev.yml logs -f
echo   Stop services: docker-compose -f docker-compose.dev.yml down
echo   Restart services: docker-compose -f docker-compose.dev.yml restart
echo   Enter backend container: docker-compose -f docker-compose.dev.yml exec backend bash
echo   Enter frontend container: docker-compose -f docker-compose.dev.yml exec frontend sh
echo.
echo 🎉 Happy coding!
pause





