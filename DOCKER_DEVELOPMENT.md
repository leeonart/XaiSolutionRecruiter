# Docker Development Setup Guide

This guide will help you set up the AI Job Processing Platform for local development using Docker.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**For Windows:**
```bash
# Run the setup script
.\setup-docker-dev.bat
```

**For Linux/Mac:**
```bash
# Make script executable and run
chmod +x setup-docker-dev.sh
./setup-docker-dev.sh
```

### Option 2: Manual Setup

1. **Create environment file:**
   ```bash
   cp env.local.example .env.local
   ```

2. **Edit API keys (optional):**
   ```bash
   # Edit .env.local with your API keys
   nano .env.local
   ```

3. **Start services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

## 🔧 Development Workflow

### Daily Development Commands

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Restart a specific service
docker-compose -f docker-compose.dev.yml restart backend
```

### Working with Code

The Docker setup uses volume mounts, so your code changes are reflected immediately:

- **Backend changes**: Automatically reloaded by uvicorn
- **Frontend changes**: Hot-reloaded by Vite
- **Database**: Persistent data survives container restarts

### Accessing Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432

### Container Access

```bash
# Enter backend container
docker-compose -f docker-compose.dev.yml exec backend bash

# Enter frontend container
docker-compose -f docker-compose.dev.yml exec frontend sh

# Enter database
docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d ai_job_platform
```

## 🛠️ Development Tasks

### Backend Development

```bash
# Install new Python package
docker-compose -f docker-compose.dev.yml exec backend pip install new-package

# Update requirements.txt
docker-compose -f docker-compose.dev.yml exec backend pip freeze > requirements.txt

# Run tests
docker-compose -f docker-compose.dev.yml exec backend pytest
```

### Frontend Development

```bash
# Install new npm package
docker-compose -f docker-compose.dev.yml exec frontend npm install new-package

# Build for production
docker-compose -f docker-compose.dev.yml exec frontend npm run build
```

### Database Operations

```bash
# Connect to database
docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d ai_job_platform

# Backup database
docker-compose -f docker-compose.dev.yml exec db pg_dump -U postgres ai_job_platform > backup.sql

# Restore database
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres ai_job_platform < backup.sql
```

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :8000
   netstat -tulpn | grep :5432
   ```

2. **Docker not running:**
   ```bash
   # Start Docker Desktop
   # Or restart Docker service
   sudo systemctl restart docker
   ```

3. **Services not starting:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.dev.yml logs backend
   docker-compose -f docker-compose.dev.yml logs frontend
   docker-compose -f docker-compose.dev.yml logs db
   ```

4. **Database connection issues:**
   ```bash
   # Check if database is ready
   docker-compose -f docker-compose.dev.yml exec db pg_isready -U postgres
   ```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose -f docker-compose.dev.yml down -v

# Remove all images
docker-compose -f docker-compose.dev.yml down --rmi all

# Start fresh
docker-compose -f docker-compose.dev.yml up --build -d
```

## 📁 Project Structure in Docker

```
Your Project/
├── backend/                 # Backend code (mounted as volume)
├── frontend/               # Frontend code (mounted as volume)
├── modules/                # Your existing Python modules
├── config.py              # Configuration file
├── credentials/           # API keys and service accounts
├── docker-compose.dev.yml # Development Docker Compose
├── Dockerfile.backend     # Backend container
├── Dockerfile.frontend    # Frontend container
└── .env.local            # Environment variables
```

## 🎯 Development Tips

1. **Hot Reloading**: Both backend and frontend support hot reloading
2. **Volume Mounts**: Your code changes are immediately reflected
3. **Database Persistence**: Data survives container restarts
4. **Environment Variables**: Use `.env.local` for local configuration
5. **API Testing**: Use the interactive docs at http://localhost:8000/docs

## 🚀 Next Steps

1. **Add API Keys**: Edit `.env.local` with your AI provider keys
2. **Test Endpoints**: Visit http://localhost:8000/docs to test API
3. **Develop Features**: Make changes to backend/frontend code
4. **Monitor Logs**: Use `docker-compose logs -f` to watch for issues

Happy coding! 🎉





