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
