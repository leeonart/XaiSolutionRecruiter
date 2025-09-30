#!/bin/bash
echo "🛠️  Switching to DEVELOPMENT mode..."

# Export environment variables for development
export NGINX_CONFIG_FILE="./nginx.dev.conf"
export ENVIRONMENT="development"

# Set frontend API URL for development
export VITE_API_URL=""

echo "✅ Environment set to DEVELOPMENT"
echo "📁 Using nginx config: $NGINX_CONFIG_FILE"
echo "🔧 Starting containers..."

# Start containers with development settings
docker-compose down
docker-compose up -d

echo "🎉 Running in DEVELOPMENT mode!"
echo "🌐 Frontend: http://localhost:3000 (direct)"
echo "🌐 Frontend: http://localhost (via nginx proxy)"
echo "🔌 Backend API: http://localhost:8000 (direct)"
echo "🏗️  Hot reloading enabled"


