#!/bin/bash

# AI Job Platform Backup Script
# This script creates backups of the database and important files

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
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="ai_job_platform_backup_${DATE}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

print_status "Starting backup process..."

# Check if containers are running
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    print_error "Containers are not running. Please start the application first."
    exit 1
fi

# Create backup directory for this backup
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup database
print_status "Backing up database..."
docker-compose -f docker-compose.production.yml exec -T db pg_dump -U postgres ai_job_platform > "$BACKUP_DIR/$BACKUP_NAME/database.sql"
print_success "Database backup completed"

# Backup important directories
print_status "Backing up data directories..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME/data.tar.gz" data/ 2>/dev/null || print_warning "No data directory found"
tar -czf "$BACKUP_DIR/$BACKUP_NAME/output.tar.gz" output/ 2>/dev/null || print_warning "No output directory found"
tar -czf "$BACKUP_DIR/$BACKUP_NAME/logs.tar.gz" logs/ 2>/dev/null || print_warning "No logs directory found"

# Backup configuration files
print_status "Backing up configuration files..."
cp .env "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || print_warning "No .env file found"
cp docker-compose.production.yml "$BACKUP_DIR/$BACKUP_NAME/"
cp -r credentials/ "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || print_warning "No credentials directory found"

# Create backup info file
cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << EOF
AI Job Platform Backup
=====================
Date: $(date)
Version: $(git describe --tags 2>/dev/null || echo "Unknown")
Docker Compose Version: $(docker-compose --version)
Database Size: $(du -sh "$BACKUP_DIR/$BACKUP_NAME/database.sql" | cut -f1)
Total Size: $(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)

Contents:
- database.sql: PostgreSQL database dump
- data.tar.gz: Application data directory
- output.tar.gz: Application output directory
- logs.tar.gz: Application logs
- .env: Environment configuration
- docker-compose.production.yml: Docker configuration
- credentials/: API keys and certificates

To restore:
1. Extract backup: tar -xzf $BACKUP_NAME.tar.gz
2. Copy files to application directory
3. Restore database: docker-compose exec -T db psql -U postgres ai_job_platform < database.sql
4. Restart services: docker-compose up -d
EOF

# Create compressed archive
print_status "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
cd - > /dev/null

# Remove uncompressed directory
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)

print_success "Backup completed successfully!"
echo ""
echo "=========================================="
echo "💾 Backup Information"
echo "=========================================="
echo "Backup file: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "Backup size: $BACKUP_SIZE"
echo "Date: $(date)"
echo ""
echo "📋 To restore this backup:"
echo "  1. Extract: tar -xzf $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "  2. Follow instructions in backup_info.txt"
echo ""

# Clean up old backups (keep last 7 days)
print_status "Cleaning up old backups..."
find "$BACKUP_DIR" -name "ai_job_platform_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
print_success "Old backups cleaned up"




