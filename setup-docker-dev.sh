#!/bin/bash

# AI Job Processing Platform - Docker Development Setup
# This script sets up the Docker environment for local development

echo "🚀 Setting up AI Job Processing Platform for Docker development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp env.local.example .env.local
    echo "✅ Created .env.local file. Please edit it with your API keys if needed."
fi

# Create frontend directory if it doesn't exist
if [ ! -d "frontend" ]; then
    echo "📁 Creating frontend directory structure..."
    mkdir -p frontend/src/{components/ui,pages,lib,hooks}
fi

# Build and start services
echo "🔨 Building Docker containers..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 Starting services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "✅ Setup complete! Your development environment is ready:"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🗄️  Database: localhost:5432"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.dev.yml down"
echo "  Restart services: docker-compose -f docker-compose.dev.yml restart"
echo "  Enter backend container: docker-compose -f docker-compose.dev.yml exec backend bash"
echo "  Enter frontend container: docker-compose -f docker-compose.dev.yml exec frontend sh"
echo ""
echo "🎉 Happy coding!"





