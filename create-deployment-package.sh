#!/bin/bash

# Create Deployment Package Script
# This script creates a complete deployment package for the AI Job Platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PACKAGE_NAME="ai-job-platform-deployment-$(date +%Y%m%d_%H%M%S)"
PACKAGE_DIR="./deployment-package"
EXCLUDE_PATTERNS=(
    ".git"
    "node_modules"
    "__pycache__"
    "venv"
    ".env"
    "*.pyc"
    "*.pyo"
    "*.pyd"
    ".pytest_cache"
    ".coverage"
    "htmlcov"
    ".tox"
    ".mypy_cache"
    ".DS_Store"
    "Thumbs.db"
    "*.log"
    "logs/*"
    "temp/*"
    "output/*"
    "data/*"
    "backups/*"
    "deployment-package"
)

print_status "Creating deployment package for AI Job Platform..."

# Create package directory
mkdir -p "$PACKAGE_DIR"

# Build exclude string for tar
EXCLUDE_STRING=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_STRING="$EXCLUDE_STRING --exclude='$pattern'"
done

# Create the package
print_status "Packaging project files..."
eval "tar -czf '$PACKAGE_DIR/${PACKAGE_NAME}.tar.gz' $EXCLUDE_STRING ."

# Create deployment instructions
print_status "Creating deployment instructions..."
cat > "$PACKAGE_DIR/DEPLOYMENT_INSTRUCTIONS.txt" << 'EOF'
AI Job Platform - Deployment Instructions
=========================================

This package contains everything needed to deploy the AI Job Platform to a new server.

QUICK DEPLOYMENT STEPS:
======================

1. Transfer this package to your server:
   scp ai-job-platform-deployment-*.tar.gz user@your-server:/tmp/

2. On your server, extract and setup:
   cd /opt
   sudo tar -xzf /tmp/ai-job-platform-deployment-*.tar.gz
   sudo mv NewCompleteWorking ai-job-platform
   cd ai-job-platform
   
3. Setup the server:
   sudo ./setup-server.sh
   
4. Configure environment:
   su - deploy
   cd /opt/ai-job-platform
   cp env.production .env
   nano .env  # Add your API keys and change passwords
   
5. Deploy the application:
   ./deploy.sh

6. Access your application:
   - Frontend: http://your-server-ip:3000
   - Backend API: http://your-server-ip:8000
   - API Docs: http://your-server-ip:8000/docs

IMPORTANT CONFIGURATIONS:
========================

- Change POSTGRES_PASSWORD in .env file
- Add your AI API keys (OpenAI, Grok, Gemini, etc.)
- Set FRONTEND_API_URL to your domain (if you have one)
- Configure ALLOWED_HOSTS for security

SECURITY REMINDERS:
==================

- Change all default passwords
- Set up SSL certificates for production
- Configure firewall rules
- Keep API keys secure
- Regular security updates

For detailed instructions, see DEPLOYMENT_GUIDE.md in the package.

SUPPORT:
========

If you encounter issues:
1. Check logs: docker-compose -f docker-compose.production.yml logs -f
2. Verify .env configuration
3. Check service status: docker-compose -f docker-compose.production.yml ps
4. Review DEPLOYMENT_GUIDE.md for troubleshooting
EOF

# Create a simple deployment script for the package
print_status "Creating package deployment script..."
cat > "$PACKAGE_DIR/deploy-package.sh" << 'EOF'
#!/bin/bash

# Simple deployment script for the AI Job Platform package

set -e

echo "🚀 AI Job Platform - Package Deployment"
echo "======================================="
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f env.production ]; then
        cp env.production .env
        echo "📝 Please edit .env file with your API keys and configuration"
        echo "   Press Enter when ready to continue..."
        read
    else
        echo "❌ env.production template not found"
        exit 1
    fi
fi

echo "🚀 Starting deployment..."
echo ""

# Create directories
mkdir -p data output temp logs ssl

# Deploy
docker-compose -f docker-compose.production.yml up --build -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 30

# Check health
echo "🔍 Checking service health..."

if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API is not responding"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend is not responding"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  Stop: docker-compose -f docker-compose.production.yml down"
echo "  Restart: docker-compose -f docker-compose.production.yml restart"
EOF

chmod +x "$PACKAGE_DIR/deploy-package.sh"

# Create package info
print_status "Creating package information..."
cat > "$PACKAGE_DIR/PACKAGE_INFO.txt" << EOF
AI Job Platform Deployment Package
==================================

Package Name: ${PACKAGE_NAME}
Created: $(date)
Size: $(du -sh "$PACKAGE_DIR/${PACKAGE_NAME}.tar.gz" | cut -f1)

Contents:
- Complete AI Job Platform application
- Production Docker configuration
- Deployment scripts and documentation
- Environment configuration templates
- Security and monitoring setup

Files in package:
- ${PACKAGE_NAME}.tar.gz (main application)
- DEPLOYMENT_INSTRUCTIONS.txt (quick start guide)
- deploy-package.sh (simple deployment script)
- PACKAGE_INFO.txt (this file)

System Requirements:
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose
- 2GB+ RAM
- 10GB+ disk space
- Internet connection for API access

For detailed deployment instructions, extract the package and see:
- DEPLOYMENT_GUIDE.md
- README_DEPLOYMENT.md
EOF

# Calculate package size
PACKAGE_SIZE=$(du -sh "$PACKAGE_DIR/${PACKAGE_NAME}.tar.gz" | cut -f1)

print_success "Deployment package created successfully!"
echo ""
echo "=========================================="
echo "📦 Package Information"
echo "=========================================="
echo "Package: $PACKAGE_DIR/${PACKAGE_NAME}.tar.gz"
echo "Size: $PACKAGE_SIZE"
echo "Created: $(date)"
echo ""
echo "📋 Package Contents:"
echo "  - Complete AI Job Platform application"
echo "  - Production Docker configuration"
echo "  - Deployment scripts and documentation"
echo "  - Environment configuration templates"
echo "  - Security and monitoring setup"
echo ""
echo "🚀 Next Steps:"
echo "  1. Transfer package to your server:"
echo "     scp $PACKAGE_DIR/${PACKAGE_NAME}.tar.gz user@your-server:/tmp/"
echo ""
echo "  2. On your server:"
echo "     cd /opt"
echo "     sudo tar -xzf /tmp/${PACKAGE_NAME}.tar.gz"
echo "     sudo mv NewCompleteWorking ai-job-platform"
echo "     cd ai-job-platform"
echo "     sudo ./setup-server.sh"
echo "     su - deploy"
echo "     cd /opt/ai-job-platform"
echo "     cp env.production .env"
echo "     nano .env  # Configure your settings"
echo "     ./deploy.sh"
echo ""
echo "📚 For detailed instructions, see:"
echo "  - DEPLOYMENT_GUIDE.md (complete guide)"
echo "  - README_DEPLOYMENT.md (overview)"
echo "  - DEPLOYMENT_INSTRUCTIONS.txt (quick start)"
echo ""
echo "🎉 Your AI Job Platform is ready for deployment!"




