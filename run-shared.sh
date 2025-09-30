#!/bin/bash
echo "🚀 Starting SHARED backend/database with separate frontends..."

# Stop any existing containers from these configurations
docker-compose -f docker-compose.dev-parallel.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod-parallel.yml down 2>/dev/null || true

echo "📦 Starting Production Environment (backend + database + frontend)..."
docker-compose -f docker-compose.prod-parallel.yml up -d

echo "🔧 Starting Development Frontend (uses production backend)..."
docker-compose -f docker-compose.dev-parallel.yml up -d

echo ""
echo "🎉 SHARED setup is now running!"
echo ""
echo "🔧 DEVELOPMENT Environment:"
echo "   Frontend Direct: http://localhost:3001"
echo "   Frontend Proxy: http://localhost:8080"
echo "   Backend API: http://localhost:8000 (shared with production)"
echo "   Database: localhost:5432 (shared with production)"
echo ""
echo "🏭 PRODUCTION Environment:"
echo "   Frontend Direct: http://localhost:3000"
echo "   Frontend Proxy: http://localhost (HTTP)"
echo "   Frontend Proxy: https://localhost (HTTPS)"
echo "   Backend API: http://localhost:8000 (shared)"
echo "   Database: localhost:5432 (shared)"
echo ""
echo "📋 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"


