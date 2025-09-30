#!/bin/bash

# Create Complete Deployment Package Script (Including All Data)
# This script creates a deployment package with ALL data files included

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
PACKAGE_NAME="ai-job-platform-complete-$(date +%Y%m%d_%H%M%S)"
PACKAGE_DIR="./deployment-package-complete"
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
    "deployment-package*"
)

print_status "Creating complete deployment package with ALL data for AI Job Platform..."

# Create package directory
mkdir -p "$PACKAGE_DIR"

# Check if Docker images exist
print_status "Checking for existing Docker images..."
if ! docker images | grep -q "newcompleteworking-backend\|newcompleteworking-frontend\|postgres:15-alpine"; then
    print_warning "Some Docker images not found. Building them now..."
    
    # Build backend image
    if ! docker images | grep -q "newcompleteworking-backend"; then
        print_status "Building backend image..."
        docker build -f Dockerfile.backend -t newcompleteworking-backend .
    fi
    
    # Build frontend image
    if ! docker images | grep -q "newcompleteworking-frontend"; then
        print_status "Building frontend image..."
        docker build -f frontend/Dockerfile -t newcompleteworking-frontend ./frontend
    fi
    
    # Pull postgres image if not present
    if ! docker images | grep -q "postgres:15-alpine"; then
        print_status "Pulling PostgreSQL image..."
        docker pull postgres:15-alpine
    fi
fi

# Save Docker images
print_status "Saving Docker images..."
docker save newcompleteworking-backend newcompleteworking-frontend postgres:15-alpine | gzip > "$PACKAGE_DIR/docker-images.tar.gz"

# Build exclude string for tar
EXCLUDE_STRING=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_STRING="$EXCLUDE_STRING --exclude='$pattern'"
done

# Create the complete application package (including ALL data)
print_status "Packaging ALL application files and data..."
eval "tar -czf '$PACKAGE_DIR/application-complete.tar.gz' $EXCLUDE_STRING ."

# Create docker-compose file that uses pre-built images
print_status "Creating docker-compose configuration for pre-built images..."
cat > "$PACKAGE_DIR/docker-compose.production.yml" << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_job_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secure_password_change_me}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database_schema_mtb_tracking.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

  # Backend API
  backend:
    image: newcompleteworking-backend
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:-secure_password_change_me}@db:5432/ai_job_platform
      GROK_API_KEY: ${GROK_API_KEY:-}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:-}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      DASHSCOPE_API_KEY: ${DASHSCOPE_API_KEY:-}
      ZAI_API_KEY: ${ZAI_API_KEY:-}
      CLAUDE_API_KEY: ${CLAUDE_API_KEY:-}
      DEFAULT_AI_AGENT: ${DEFAULT_AI_AGENT:-openai}
      MAX_WORKERS: ${MAX_WORKERS:-8}
      ENVIRONMENT: production
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./data:/app/data:rw
      - ./output:/app/output:rw
      - ./temp:/app/temp:rw
      - ./logs:/app/logs:rw
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    image: newcompleteworking-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      VITE_API_URL: ${FRONTEND_API_URL:-http://localhost:8000}
      NODE_ENV: production
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy (Optional but recommended for production)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:
    driver: local

networks:
  app-network:
    driver: bridge
EOF

# Create deployment script for complete package
print_status "Creating deployment script for complete package..."
cat > "$PACKAGE_DIR/deploy-complete.sh" << 'EOF'
#!/bin/bash

# AI Job Platform Complete Deployment Script
# This script deploys using pre-built Docker images with ALL data included

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Starting AI Job Platform deployment with ALL data..."

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f env.production ]; then
        cp env.production .env
        print_warning "Please edit .env file with your API keys and configuration before continuing."
        print_warning "Press Enter when you're ready to continue..."
        read
    else
        print_error "env.production file not found. Cannot create .env file."
        exit 1
    fi
fi

# Load Docker images
print_status "Loading Docker images..."
if [ -f docker-images.tar.gz ]; then
    docker load < docker-images.tar.gz
    print_success "Docker images loaded successfully"
else
    print_error "docker-images.tar.gz not found. Cannot load images."
    exit 1
fi

# Create necessary directories (if they don't exist)
print_status "Creating necessary directories..."
mkdir -p data output temp logs ssl

# Set proper permissions
print_status "Setting proper permissions..."
chmod 755 data output temp logs
chmod 600 .env 2>/dev/null || true

# Stop any existing containers
print_status "Stopping any existing containers..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# Start services
print_status "Starting services with pre-built images and ALL data..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check database
if docker-compose -f docker-compose.production.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    print_success "Database is healthy"
else
    print_error "Database is not responding"
    exit 1
fi

# Check backend
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    print_success "Backend API is healthy"
else
    print_error "Backend API is not responding"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is healthy"
else
    print_error "Frontend is not responding"
    exit 1
fi

# Display deployment information
print_success "Deployment completed successfully!"
echo ""
echo "=========================================="
echo "🚀 AI Job Platform is now running with ALL data!"
echo "=========================================="
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🗄️  Database: localhost:5432"
echo ""
echo "📊 Data included:"
echo "  - All job files and resumes"
echo "  - Cache data and JSON outputs"
echo "  - Log files and temporary data"
echo "  - Complete application state"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.production.yml down"
echo "  Restart services: docker-compose -f docker-compose.production.yml restart"
echo ""
echo "🔒 Security reminder:"
echo "  - Change default passwords in .env file"
echo "  - Set up SSL certificates for production"
echo "  - Configure firewall rules"
echo "  - Regular security updates"
echo ""

# Show container status
print_status "Container status:"
docker-compose -f docker-compose.production.yml ps
EOF

chmod +x "$PACKAGE_DIR/deploy-complete.sh"

# Create deployment instructions
print_status "Creating deployment instructions..."
cat > "$PACKAGE_DIR/DEPLOYMENT_INSTRUCTIONS.txt" << 'EOF'
AI Job Platform - Complete Deployment with ALL Data
==================================================

This package contains everything needed to deploy the AI Job Platform to a new server,
including pre-built Docker images and ALL your data files.

QUICK DEPLOYMENT STEPS:
======================

1. Transfer this package to your server:
   scp -r ai-job-platform-complete-* user@your-server:/tmp/

2. On your server, extract and setup:
   cd /opt
   sudo tar -xzf /tmp/ai-job-platform-complete-*/application-complete.tar.gz
   sudo mv NewCompleteWorking ai-job-platform
   cd ai-job-platform
   sudo cp /tmp/ai-job-platform-complete-*/docker-images.tar.gz .
   sudo cp /tmp/ai-job-platform-complete-*/docker-compose.production.yml .
   sudo cp /tmp/ai-job-platform-complete-*/deploy-complete.sh .
   sudo chmod +x deploy-complete.sh
   
3. Setup the server (if not already done):
   sudo ./setup-server.sh
   
4. Configure environment:
   su - deploy
   cd /opt/ai-job-platform
   cp env.production .env
   nano .env  # Add your API keys and change passwords
   
5. Deploy the application:
   ./deploy-complete.sh

6. Access your application:
   - Frontend: http://your-server-ip:3000
   - Backend API: http://your-server-ip:8000
   - API Docs: http://your-server-ip:8000/docs

WHAT'S INCLUDED:
===============

✅ Complete application code
✅ Pre-built Docker images
✅ ALL your data files (jobs, resumes, cache, etc.)
✅ Log files and temporary data
✅ Complete application state
✅ Database schema and configurations

ADVANTAGES OF THIS PACKAGE:
==========================

✅ Faster deployment (no image building required)
✅ Complete data migration (nothing lost)
✅ Consistent images across environments
✅ Offline deployment capability
✅ Reduced server resource requirements
✅ Preserves all your work and data

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

# Create package info
print_status "Creating package information..."
cat > "$PACKAGE_DIR/PACKAGE_INFO.txt" << EOF
AI Job Platform Complete Deployment Package
==========================================

Package Name: ${PACKAGE_NAME}
Created: $(date)
Application Size: $(du -sh "$PACKAGE_DIR/application-complete.tar.gz" | cut -f1)
Images Size: $(du -sh "$PACKAGE_DIR/docker-images.tar.gz" | cut -f1)
Total Size: $(du -sh "$PACKAGE_DIR" | cut -f1)

Contents:
- Complete AI Job Platform application
- Pre-built Docker images (backend, frontend, postgres)
- ALL your data files (jobs, resumes, cache, logs, temp)
- Production Docker configuration
- Deployment scripts and documentation
- Environment configuration templates
- Security and monitoring setup

Files in package:
- application-complete.tar.gz (main application + ALL data)
- docker-images.tar.gz (pre-built Docker images)
- docker-compose.production.yml (production configuration)
- deploy-complete.sh (deployment script)
- DEPLOYMENT_INSTRUCTIONS.txt (quick start guide)
- PACKAGE_INFO.txt (this file)

System Requirements:
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose
- 2GB+ RAM
- 10GB+ disk space
- Internet connection for API access

Advantages:
- Faster deployment (no image building)
- Complete data migration (nothing lost)
- Consistent images across environments
- Offline deployment capability
- Reduced server resource requirements
- Preserves all your work and data

For detailed deployment instructions, extract the package and see:
- DEPLOYMENT_GUIDE.md
- README_DEPLOYMENT.md
EOF

# Calculate package size
TOTAL_SIZE=$(du -sh "$PACKAGE_DIR" | cut -f1)
APP_SIZE=$(du -sh "$PACKAGE_DIR/application-complete.tar.gz" | cut -f1)
IMAGES_SIZE=$(du -sh "$PACKAGE_DIR/docker-images.tar.gz" | cut -f1)

print_success "Complete deployment package with ALL data created successfully!"
echo ""
echo "=========================================="
echo "📦 Package Information"
echo "=========================================="
echo "Package: $PACKAGE_DIR/"
echo "Total Size: $TOTAL_SIZE"
echo "  - Application + Data: $APP_SIZE"
echo "  - Docker Images: $IMAGES_SIZE"
echo "Created: $(date)"
echo ""
echo "📋 Package Contents:"
echo "  - Complete AI Job Platform application"
echo "  - Pre-built Docker images (backend, frontend, postgres)"
echo "  - ALL your data files (jobs, resumes, cache, logs, temp)"
echo "  - Production Docker configuration"
echo "  - Deployment scripts and documentation"
echo "  - Environment configuration templates"
echo "  - Security and monitoring setup"
echo ""
echo "🚀 Next Steps:"
echo "  1. Transfer package to your server:"
echo "     scp -r $PACKAGE_DIR/ user@your-server:/tmp/"
echo ""
echo "  2. On your server:"
echo "     cd /opt"
echo "     sudo tar -xzf /tmp/$PACKAGE_NAME/application-complete.tar.gz"
echo "     sudo mv NewCompleteWorking ai-job-platform"
echo "     cd ai-job-platform"
echo "     sudo cp /tmp/$PACKAGE_NAME/docker-images.tar.gz ."
echo "     sudo cp /tmp/$PACKAGE_NAME/docker-compose.production.yml ."
echo "     sudo cp /tmp/$PACKAGE_NAME/deploy-complete.sh ."
echo "     sudo chmod +x deploy-complete.sh"
echo "     sudo ./setup-server.sh"
echo "     su - deploy"
echo "     cd /opt/ai-job-platform"
echo "     cp env.production .env"
echo "     nano .env  # Configure your settings"
echo "     ./deploy-complete.sh"
echo ""
echo "📚 For detailed instructions, see:"
echo "  - DEPLOYMENT_GUIDE.md (complete guide)"
echo "  - README_DEPLOYMENT.md (overview)"
echo "  - DEPLOYMENT_INSTRUCTIONS.txt (quick start)"
echo ""
echo "🎉 Your AI Job Platform with ALL data is ready for deployment!"




