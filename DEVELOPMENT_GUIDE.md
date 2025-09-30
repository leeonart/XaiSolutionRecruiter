# Development & Production Setup Guide

This guide explains how to use the flexible container setup for both development and production environments.

## 🚀 Quick Start

### Development Mode (Default)
```bash
# Start in development mode
./switch-to-dev.sh

# Or manually
export NGINX_CONFIG_FILE=./nginx.dev.conf
docker-compose up -d
```

### Production Mode
```bash
# Switch to production mode
./switch-to-prod.sh

# Or manually
export NGINX_CONFIG_FILE=./nginx.prod.conf
docker-compose up -d
```

## 📁 Configuration Files

### Nginx Configurations

- **`nginx.dev.conf`** - Development mode
  - HTTP only (no SSL)
  - CORS headers enabled
  - WebSocket support for Vite
  - More permissive rate limiting
  - Accepts localhost and public domains

- **`nginx.prod.conf`** - Production mode
  - HTTP → HTTPS redirect
  - SSL/TLS with Let's Encrypt
  - Security headers (HSTS, XSS protection)
  - Strict rate limiting
  - Production optimizations

### Docker Compose Files

- **`docker-compose.yml`** - Main configuration (flexible)
- **`docker-compose.dev.yml`** - Development-specific overrides
- **`docker-compose.production.yml`** - Production-specific overrides

## 🌐 Access Points

### Development Mode
- **Frontend Direct**: http://localhost:3000
- **Frontend Proxy**: http://localhost (via nginx)
- **Backend Direct**: http://localhost:8000
- **Backend API**: http://localhost/api/* (via nginx proxy)

### Production Mode
- **HTTP**: http://xai.eastus.cloudapp.azure.com (redirects to HTTPS)
- **HTTPS**: https://xai.eastus.cloudapp.azure.com
- **Backend API**: https://xai.eastus.cloudapp.azure.com/api/*

## 🛠️ Development Features

- **Hot Reloading**: Frontend changes reflect immediately
- **Direct Access**: Can access services directly or via proxy
- **CORS Enabled**: No cross-origin issues
- **WebSocket Support**: Vite dev server features work
- **Debug-Friendly**: More verbose logging

## 🏭 Production Features

- **SSL/TLS**: Secure HTTPS connections
- **Security Headers**: Protection against XSS, clickjacking
- **Rate Limiting**: Protection against abuse
- **Optimized**: Better performance settings
- **Hardened**: Stricter security configuration

## 🔧 Manual Configuration

### Using Environment Variables
```bash
# Development
export NGINX_CONFIG_FILE=./nginx.dev.conf
export ENVIRONMENT=development
docker-compose up -d

# Production
export NGINX_CONFIG_FILE=./nginx.prod.conf
export ENVIRONMENT=production
docker-compose up -d
```

### Environment Files
Create these files for automatic configuration:

- **`.env.dev`** - Development environment variables
- **`.env.prod`** - Production environment variables

## 🐛 Troubleshooting

### Development Issues
- **502 Bad Gateway**: Wait for backend to fully start
- **CORS Errors**: Make sure nginx.dev.conf is loaded
- **Hot Reload Not Working**: Check WebSocket proxy settings

### Production Issues
- **SSL Errors**: Ensure Let's Encrypt certificates exist
- **Redirect Loops**: Check nginx.prod.conf redirect settings
- **API Not Found**: Verify proxy_pass configuration

### Common Commands
```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs nginx
docker-compose logs backend
docker-compose logs frontend

# Restart specific service
docker-compose restart nginx

# Test nginx configuration
docker-compose exec nginx nginx -t
```

## 📋 Switching Between Modes

1. **Stop current containers**: `docker-compose down`
2. **Switch mode**: `./switch-to-dev.sh` or `./switch-to-prod.sh`
3. **Verify**: Check `docker-compose ps` and access URLs

## 🔐 SSL Certificates (Production)

For production mode to work fully, you need SSL certificates:

1. **Manual SSL Setup**: Use certbot manually
2. **Automatic Renewal**: certbot container handles renewals
3. **Certificate Location**: `/etc/letsencrypt/live/xai.eastus.cloudapp.azure.com/`

```bash
# Generate certificates (production only)
docker-compose run --rm certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d xai.eastus.cloudapp.azure.com
```

This setup gives you complete flexibility between development and production environments! 🎉


