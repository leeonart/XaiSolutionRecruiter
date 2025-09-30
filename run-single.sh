#!/bin/bash
echo "🚀 Starting SINGLE backend/database with both frontends..."

# Stop any existing containers
docker-compose -f docker-compose.single.yml down --remove-orphans 2>/dev/null || true

echo "📦 Starting all services..."
docker-compose -f docker-compose.single.yml up -d

echo ""
echo "🎉 SINGLE setup is now running!"
echo ""
echo "🔧 DEVELOPMENT Environment:"
echo "   Frontend Direct: http://localhost:3001"
echo "   Frontend Proxy: http://localhost:8080"
echo "   Backend API: http://localhost:8000"
echo ""
echo "🏭 PRODUCTION Environment:"
echo "   Frontend Direct: http://localhost:3000"
echo "   Frontend Proxy: http://localhost (HTTP)"
echo "   Frontend Proxy: https://xai.eastus.cloudapp.azure.com (HTTPS)"
echo "   Backend API: http://localhost:8000"
echo ""
echo "🗄️  SHARED:"
echo "   Database: localhost:5432"
echo "   Backend: localhost:8000"
echo ""
echo "📋 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"


