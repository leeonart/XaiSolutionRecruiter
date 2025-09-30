#!/bin/bash
echo "🚀 Switching to PRODUCTION mode..."

# Export environment variables for production
export NGINX_CONFIG_FILE="./nginx.prod.conf"
export ENVIRONMENT="production"

# Set frontend API URL for production
export VITE_API_URL="http://xai.eastus.cloudapp.azure.com"

echo "✅ Environment set to PRODUCTION"
echo "📁 Using nginx config: $NGINX_CONFIG_FILE"
echo "🔧 Starting containers..."

# Start containers with production settings
docker-compose down
docker-compose up -d

echo "🎉 Running in PRODUCTION mode!"
echo "🌐 Frontend: http://xai.eastus.cloudapp.azure.com:80 (HTTP)"
echo "🔒 Frontend: https://xai.eastus.cloudapp.azure.com:443 (HTTPS)"
echo "🔌 Backend API: http://xai.eastus.cloudapp.azure.com/api/* (via proxy)"
echo "💾 SSL certificates expected"


