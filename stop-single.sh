#!/bin/bash
echo "🛑 Stopping SINGLE environment..."
docker-compose -f docker-compose.single.yml down --remove-orphans
echo "✅ Single environment stopped."


