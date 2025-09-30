#!/bin/bash
echo "🚀 Starting BOTH Development and Production environments..."

# Stop any existing containers from previous setups
docker-compose down 2>/dev/null || true
docker-compose -f docker-compose.dev-parallel.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod-parallel.yml down 2>/dev/null || true

echo "📦 Starting Development Environment on different ports..."
docker-compose -f docker-compose.dev-parallel.yml up -d

echo "🏭 Starting Production Environment on standard ports..."
docker-compose -f docker-compose.prod-parallel.yml up -d

echo ""
echo "🎉 BOTH environments are now running!"
echo ""
echo "🔧 DEVELOPMENT Environment:"
echo "   Frontend Direct: http://localhost:3001"
echo "   Frontend Proxy: http://localhost:8080"
echo "   Backend Direct: http://localhost:8001"
echo "   Backend API Proxy: http://localhost:8080/api/*"
echo "   Database: localhost:5433"
echo ""
echo "🏭 PRODUCTION Environment:"
echo "   Frontend Direct: http://localhost:3000"
echo "   Frontend Proxy: http://localhost (HTTP)"
echo "   Frontend Proxy: https://localhost (HTTPS)"
echo "   Backend Direct: http://localhost:8000"
echo "   Backend API Proxy: http://localhost/api/*"
echo "   Database: localhost:5432"
echo ""
echo "📋 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
