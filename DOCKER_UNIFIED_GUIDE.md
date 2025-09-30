# Unified Docker Setup Guide

This guide explains how to use the unified Docker setup that supports both development and production modes simultaneously with automatic code reloading.

## Overview

The unified Docker setup allows you to:
- Run development and production modes in the same containers
- Automatically reload code changes in development mode
- Switch between development and production configurations using environment variables
- Use hot reloading for both frontend and backend during development
- Deploy production builds with optimized settings

## Quick Start

### Development Mode (Default)
```bash
# Start all services in development mode
docker-compose up -d

# View logs
docker-compose logs -f

# Access your application
# Frontend: http://localhost
# Backend API: http://localhost/api
# Health check: http://localhost/health
```

### Production Mode
```bash
# Start all services in production mode
NODE_ENV=production docker-compose up -d

# Or set environment variable first
export NODE_ENV=production
docker-compose up -d
```

### Custom Configuration
```bash
# Set custom database password
POSTGRES_PASSWORD=secure_password docker-compose up -d

# Set custom domain for SSL
DOMAIN=yourdomain.com docker-compose up -d

# Set custom API URL for frontend
FRONTEND_API_URL=https://yourdomain.com/api docker-compose up -d
```

## Environment Variables

### Core Configuration
- `NODE_ENV=development|production` - Controls development vs production mode
- `DOMAIN=localhost` - Domain name for SSL certificates
- `POSTGRES_PASSWORD=password` - Database password

### API Configuration
- `GROK_API_KEY` - AI service API keys
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `DASHSCOPE_API_KEY`
- `ZAI_API_KEY`
- `DEFAULT_AI_AGENT=openai` - Default AI agent to use
- `MAX_WORKERS=8` - Number of backend worker threads

### Frontend Configuration
- `FRONTEND_API_URL=http://localhost/api` - API URL for frontend
- `VITE_API_URL` - Vite-specific API URL (auto-configured)

## Development Mode Features

### Hot Reloading
- **Frontend**: File changes automatically trigger Vite dev server reload
- **Backend**: Python code changes automatically restart the server
- **No rebuild required**: Changes are reflected immediately

### Development Optimizations
- Source code mounted as volumes for instant updates
- Development-specific error pages and logging
- CORS enabled for local development
- WebSocket support for Vite HMR

### Accessing Services
- **Frontend**: http://localhost (Vite dev server)
- **Backend API**: http://localhost/api
- **Database**: postgresql://localhost:5432/ai_job_platform
- **Health Check**: http://localhost/health

## Production Mode Features

### Optimized Performance
- **Frontend**: Built and served as static files with preview server
- **Backend**: Runs with multiple workers (no reload for performance)
- **SSL Support**: Automatic HTTPS with Let's Encrypt
- **Security Headers**: Production-grade security headers

### SSL/HTTPS Setup
1. Set your domain: `DOMAIN=yourdomain.com`
2. Start in production mode: `NODE_ENV=production docker-compose up -d`
3. Certbot will automatically request SSL certificates
4. Access via HTTPS: https://yourdomain.com

### Production Optimizations
- Gzip compression enabled
- Static file caching
- Rate limiting
- Request timeouts
- Health checks for all services

## File Structure

```
├── docker-compose.yml          # Main unified configuration
├── nginx.unified.conf          # Unified nginx config (dev + prod)
├── Dockerfile.backend          # Backend Dockerfile
├── Dockerfile.frontend         # Frontend Dockerfile
├── backend/                    # Backend source code
├── frontend/                   # Frontend source code
└── modules/                    # Shared modules
```

## Advanced Usage

### Custom Nginx Configuration
```bash
# Use custom nginx config
NGINX_CONFIG_FILE=./custom.nginx.conf docker-compose up -d
```

### Database Management
```bash
# Access database directly
docker-compose exec db psql -U postgres -d ai_job_platform

# Backup database
docker-compose exec db pg_dump -U postgres ai_job_platform > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres ai_job_platform < backup.sql
```

### Logs and Debugging
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# View last 100 lines
docker-compose logs --tail=100 backend
```

### Service Management
```bash
# Restart specific service
docker-compose restart backend
docker-compose restart frontend

# Rebuild specific service
docker-compose up -d --build backend

# Scale services (if needed)
docker-compose up -d --scale backend=2
```

## Troubleshooting

### Common Issues

**Containers not starting:**
```bash
# Check status
docker-compose ps

# View logs for errors
docker-compose logs

# Clean restart
docker-compose down
docker-compose up -d
```

**SSL certificate issues:**
```bash
# Check certbot logs
docker-compose logs certbot

# Manually renew certificates
docker-compose exec certbot certbot renew
```

**Database connection issues:**
```bash
# Check database health
docker-compose exec db pg_isready -U postgres

# Reset database (WARNING: destroys data)
docker-compose down -v
docker-compose up -d
```

**Hot reloading not working:**
```bash
# Check file permissions
ls -la backend/ frontend/

# Restart containers
docker-compose restart backend frontend
```

### Health Checks
```bash
# Check all services
curl http://localhost/health

# Check backend API
curl http://localhost/api/health

# Check frontend
curl -f http://localhost:3000
```

## Performance Tuning

### Development
- Increase worker threads: `MAX_WORKERS=16`
- Enable debug logging: Add to environment variables
- Use faster file systems for mounted volumes

### Production
- Increase backend workers: `MAX_WORKERS=8`
- Enable database connection pooling
- Use production-grade database (PostgreSQL with proper config)
- Enable Redis for caching (if needed)

## Security Considerations

### Development
- CORS enabled for local development
- Debug endpoints available
- Relaxed rate limiting

### Production
- SSL/TLS encryption
- Security headers enabled
- Strict rate limiting
- No debug endpoints exposed
- Secure database passwords

## Migration from Old Setup

If you're migrating from separate dev/prod setups:

1. **Backup your data**:
   ```bash
   docker-compose exec db pg_dump -U postgres ai_job_platform > backup.sql
   ```

2. **Update your deployment scripts**:
   - Replace `docker-compose.dev.yml` with `docker-compose up -d`
   - Replace `docker-compose.production.yml` with `NODE_ENV=production docker-compose up -d`

3. **Update environment variables**:
   - Use `NODE_ENV` to switch modes
   - Set `DOMAIN` for SSL certificates
   - Configure API keys as needed

4. **Test the migration**:
   ```bash
   # Test development mode
   docker-compose up -d
   curl http://localhost/health

   # Test production mode
   NODE_ENV=production docker-compose up -d
   curl http://localhost/health
   ```

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Ensure all required files are present
4. Check container status: `docker-compose ps`