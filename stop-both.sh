#!/bin/bash
echo "🛑 Stopping BOTH Development and Production environments..."

echo "📦 Stopping Development Environment..."
docker-compose -f docker-compose.dev-parallel.yml down

echo "🏭 Stopping Production Environment..."
docker-compose -f docker-compose.prod-parallel.yml down

echo "🎉 Both environments stopped!"


