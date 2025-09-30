#!/bin/bash
echo "🛑 Stopping SHARED Development and Production environments..."
docker-compose -f docker-compose.dev-parallel.yml down --remove-orphans
docker-compose -f docker-compose.prod-parallel.yml down --remove-orphans
echo "✅ Both environments stopped."


