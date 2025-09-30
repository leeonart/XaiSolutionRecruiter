# 🚀 AI Job Platform - Deployment Package

This package contains everything you need to deploy your AI Job Platform to a new server with Docker containers.

## 📦 What's Included

### 🐳 Docker Configuration
- `docker-compose.production.yml` - Production-ready multi-container setup
- `Dockerfile.backend` - Optimized backend container
- `frontend/Dockerfile` - Production frontend container
- `nginx.conf` - Reverse proxy configuration

### 🔧 Deployment Scripts
- `deploy.sh` - Automated deployment script
- `setup-server.sh` - Server preparation script
- `backup.sh` - Data backup script

### ⚙️ Configuration Files
- `env.production` - Production environment template
- `nginx.conf` - Nginx configuration for reverse proxy
- `frontend/nginx.conf` - Frontend-specific Nginx config

### 📚 Documentation
- `DEPLOYMENT_GUIDE.md` - Complete step-by-step deployment guide
- `README_DEPLOYMENT.md` - This file

## 🚀 Quick Start

1. **Package your project**:
   ```bash
   tar -czf ai-job-platform.tar.gz --exclude='.git' --exclude='node_modules' --exclude='__pycache__' --exclude='venv' .
   ```

2. **Transfer to server**:
   ```bash
   scp ai-job-platform.tar.gz user@your-server:/tmp/
   ```

3. **On your server**:
   ```bash
   # Extract and setup
   cd /opt
   sudo tar -xzf /tmp/ai-job-platform.tar.gz
   sudo mv NewCompleteWorking ai-job-platform
   cd ai-job-platform
   
   # Setup server
   sudo ./setup-server.sh
   
   # Switch to deploy user and configure
   su - deploy
   cd /opt/ai-job-platform
   cp env.production .env
   nano .env  # Configure your API keys and passwords
   
   # Deploy
   ./deploy.sh
   ```

4. **Access your application**:
   - Frontend: http://your-server-ip:3000
   - Backend API: http://your-server-ip:8000
   - API Docs: http://your-server-ip:8000/docs

## 🔧 What Each Script Does

### `setup-server.sh`
- Installs Docker and Docker Compose
- Configures firewall (UFW)
- Creates deployment user
- Sets up systemd service for auto-start
- Installs security tools (fail2ban)

### `deploy.sh`
- Checks prerequisites
- Creates necessary directories
- Builds and starts Docker containers
- Performs health checks
- Displays deployment status

### `backup.sh`
- Backs up PostgreSQL database
- Archives data, output, and logs directories
- Creates compressed backup with metadata
- Cleans up old backups

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  FastAPI Backend│    │  PostgreSQL DB  │
│   (Port 80/443) │◄──►│   (Port 8000)   │◄──►│   (Port 5432)   │
│                 │    │                 │    │                 │
│ • SSL Termination│    │ • AI Integration│    │ • Job Data      │
│ • Load Balancing │    │ • API Endpoints │    │ • Resume Data   │
│ • Rate Limiting  │    │ • File Processing│    │ • Match Results │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│  React Frontend │
│   (Port 3000)   │
│                 │
│ • Modern UI     │
│ • TypeScript    │
│ • Tailwind CSS  │
└─────────────────┘
```

## 🔒 Security Features

- **Non-root deployment user**
- **Firewall configuration** (UFW)
- **Fail2ban protection**
- **SSL/TLS support**
- **Rate limiting**
- **Security headers**
- **Environment variable protection**

## 📊 Monitoring

- **Health checks** for all services
- **Structured logging**
- **Systemd service** for auto-start
- **Backup automation**
- **Resource monitoring**

## 🛠️ Maintenance Commands

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart services
docker-compose -f docker-compose.production.yml restart

# Update application
git pull && docker-compose -f docker-compose.production.yml up --build -d

# Backup data
./backup.sh

# Check status
docker-compose -f docker-compose.production.yml ps
```

## 🆘 Troubleshooting

See `DEPLOYMENT_GUIDE.md` for detailed troubleshooting steps.

Common issues:
- Port conflicts
- Database connection problems
- API key configuration
- SSL certificate setup

## 📞 Support

1. Check logs: `docker-compose -f docker-compose.production.yml logs -f`
2. Verify configuration: `cat .env`
3. Check service status: `docker-compose -f docker-compose.production.yml ps`
4. Review deployment guide for detailed troubleshooting

## 🎯 Next Steps

After successful deployment:

1. **Configure SSL certificates** for HTTPS
2. **Set up domain name** and DNS
3. **Configure monitoring** and alerts
4. **Set up automated backups**
5. **Review security settings**
6. **Test all functionality**

Your AI Job Platform is now ready for production use! 🎉




