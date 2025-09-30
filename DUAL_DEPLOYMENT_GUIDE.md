# Dual Deployment Setup Guide
# Local Development + Cloud Production

## 🎯 Overview

This setup allows you to:
- **Develop locally** using Docker Compose (hot reloading, debugging)
- **Deploy to Cloud Run** for production use (public access, auto-scaling)

## 🏠 Local Development (Port 8000)

### Start Local Development
```bash
# Use development Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Access locally
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Development Features
- ✅ Hot reloading (backend & frontend)
- ✅ Volume mounts for instant code changes
- ✅ PostgreSQL database
- ✅ Debug mode enabled
- ✅ Local file access

## ☁️ Cloud Production (Port 8080)

### Deploy to Cloud Run
```bash
# Push to GitHub (triggers automatic deployment)
git add .
git commit -m "Deploy to production"
git push origin main

# Or manual deployment
gcloud builds submit --config cloudbuild.yaml
```

### Production Features
- ✅ Public access via Cloud Run URL
- ✅ Auto-scaling (1-80 instances)
- ✅ Production optimizations
- ✅ Health checks
- ✅ Container Registry storage

## 🔄 Development Workflow

### 1. Local Development
```bash
# Start local environment
docker-compose -f docker-compose.dev.yml up -d

# Make changes to your code
# Test at http://localhost:8000

# When ready to deploy...
```

### 2. Deploy to Production
```bash
# Commit and push changes
git add .
git commit -m "Feature: Add new functionality"
git push origin main

# Cloud Build automatically:
# 1. Builds production Docker image
# 2. Pushes to Container Registry
# 3. Deploys to Cloud Run
# 4. Updates public URL
```

## 📊 Environment Comparison

| Feature | Local Development | Cloud Production |
|---------|------------------|------------------|
| **URL** | http://localhost:8000 | https://airecruiterubuntu-763420249504.us-south1.run.app |
| **Port** | 8000 | 8080 |
| **Database** | Local PostgreSQL | External (Cloud SQL recommended) |
| **File Storage** | Local volumes | Cloud Storage recommended |
| **Scaling** | Single instance | Auto-scaling (1-80) |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Debug Mode** | ✅ Yes | ❌ No |
| **Public Access** | ❌ No | ✅ Yes |

## 🛠️ Configuration Files

### Development
- `docker-compose.dev.yml` - Local development setup
- `Dockerfile.backend.dev` - Development backend
- `Dockerfile.frontend.dev` - Development frontend

### Production
- `Dockerfile.production` - Production backend for Cloud Run
- `cloudbuild.yaml` - Cloud Build configuration
- `vercel.json` - Vercel deployment (alternative)

## 🔧 Environment Variables

### Local (.env.local)
```bash
# Development settings
DEBUG=true
LOG_LEVEL=debug
DATABASE_URL=postgresql://postgres:password@db:5432/ai_job_platform

# API Keys
GROK_API_KEY=your_dev_key
GEMINI_API_KEY=your_dev_key
# ... other keys
```

### Cloud Run (Set in Google Cloud Console)
```bash
# Production settings
DEBUG=false
LOG_LEVEL=info
PORT=8080

# API Keys (same as local)
GROK_API_KEY=your_prod_key
GEMINI_API_KEY=your_prod_key
# ... other keys
```

## 🚀 Quick Commands

### Local Development
```bash
# Start
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.dev.yml down

# Rebuild
docker-compose -f docker-compose.dev.yml up --build
```

### Production Deployment
```bash
# Deploy via GitHub (automatic)
git push origin main

# Manual deployment
gcloud builds submit --config cloudbuild.yaml

# Check deployment status
gcloud run services describe airecruiterubuntu --region=us-south1
```

## 🔍 Monitoring

### Local
- Logs: `docker-compose logs -f`
- Health: http://localhost:8000/api/health
- Status: http://localhost:8000/api/status

### Cloud Run
- Logs: Google Cloud Console → Cloud Run → Logs
- Health: https://airecruiterubuntu-763420249504.us-south1.run.app/api/health
- Status: https://airecruiterubuntu-763420249504.us-south1.run.app/api/status

## 🎯 Benefits

1. **Parallel Development**: Work locally while production runs independently
2. **Safe Testing**: Test changes locally before deploying
3. **Public Access**: Cloud Run provides public URL for external users
4. **Auto-Scaling**: Cloud Run handles traffic spikes automatically
5. **Cost Effective**: Pay only for Cloud Run usage, local development is free

## 🔄 Next Steps

1. **Set Environment Variables** in Cloud Run console
2. **Configure Database** (Cloud SQL for production)
3. **Set up File Storage** (Cloud Storage for production)
4. **Test Deployment** with a small change
5. **Monitor Performance** in Cloud Console

This setup gives you the best of both worlds: powerful local development and robust cloud production! 🎉
