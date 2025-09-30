# 🚀 AI Job Platform - Complete Deployment Guide

This guide will help you deploy your AI Job Platform to a new server with all Docker containers and configurations.

## 📋 Prerequisites

- A fresh Ubuntu 20.04+ server (or similar Linux distribution)
- Root access to the server
- Domain name (optional but recommended)
- API keys for AI providers (OpenAI, Grok, Gemini, etc.)

## 🎯 Quick Deployment (Recommended)

### Step 1: Prepare Your Project

1. **Package your project**:
   ```bash
   # On your local machine
   cd /home/leemax/projects/NewCompleteWorking
   tar -czf ai-job-platform-deployment.tar.gz \
     --exclude='.git' \
     --exclude='node_modules' \
     --exclude='__pycache__' \
     --exclude='venv' \
     --exclude='*.pyc' \
     --exclude='.env' \
     .
   ```

2. **Transfer to server**:
   ```bash
   # Copy to your server (replace with your server details)
   scp ai-job-platform-deployment.tar.gz user@your-server-ip:/tmp/
   ```

### Step 2: Server Setup

1. **Connect to your server**:
   ```bash
   ssh user@your-server-ip
   ```

2. **Run the server setup script**:
   ```bash
   # Extract the project
   cd /opt
   sudo tar -xzf /tmp/ai-job-platform-deployment.tar.gz
   sudo mv NewCompleteWorking ai-job-platform
   cd ai-job-platform
   
   # Run server setup (installs Docker, configures firewall, etc.)
   sudo ./setup-server.sh
   ```

3. **Switch to deployment user**:
   ```bash
   su - deploy
   cd /opt/ai-job-platform
   ```

### Step 3: Configure Environment

1. **Set up environment variables**:
   ```bash
   # Copy production environment template
   cp env.production .env
   
   # Edit with your configuration
   nano .env
   ```

2. **Important configurations to change**:
   ```bash
   # Change these passwords!
   POSTGRES_PASSWORD=your_secure_database_password
   SECRET_KEY=your_very_long_random_secret_key
   
   # Add your API keys
   OPENAI_API_KEY=sk-your-openai-key
   GROK_API_KEY=your-grok-key
   GEMINI_API_KEY=your-gemini-key
   
   # Set your domain (if you have one)
   FRONTEND_API_URL=https://your-domain.com
   ALLOWED_HOSTS=your-domain.com,localhost
   ```

### Step 4: Deploy

1. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

2. **Verify deployment**:
   ```bash
   # Check if all services are running
   docker-compose -f docker-compose.production.yml ps
   
   # Check logs
   docker-compose -f docker-compose.production.yml logs -f
   ```

## 🌐 Access Your Application

After successful deployment, your application will be available at:

- **Frontend**: http://your-server-ip:3000
- **Backend API**: http://your-server-ip:8000
- **API Documentation**: http://your-server-ip:8000/docs

## 🔧 Manual Deployment (Alternative)

If you prefer manual setup or need to troubleshoot:

### 1. Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply Docker group changes
```

### 2. Configure Environment

```bash
# Copy environment template
cp env.production .env

# Edit configuration
nano .env
```

### 3. Start Services

```bash
# Create necessary directories
mkdir -p data output temp logs ssl

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
```

### 2. SSL Certificate (Recommended)

For production, set up SSL certificates:

```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to ssl directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chown -R $USER:$USER ssl/
```

### 3. Domain Configuration

If you have a domain, configure DNS to point to your server:

```
A Record: your-domain.com -> your-server-ip
CNAME: www.your-domain.com -> your-domain.com
```

## 📊 Monitoring and Maintenance

### 1. View Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
docker-compose -f docker-compose.production.yml logs -f db
```

### 2. Backup Data

```bash
# Run backup script
./backup.sh

# Manual backup
docker-compose -f docker-compose.production.yml exec db pg_dump -U postgres ai_job_platform > backup.sql
```

### 3. Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml up --build -d
```

### 4. System Service (Auto-start)

The setup script creates a systemd service for auto-start:

```bash
# Check status
sudo systemctl status ai-job-platform

# Start/stop/restart
sudo systemctl start ai-job-platform
sudo systemctl stop ai-job-platform
sudo systemctl restart ai-job-platform
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :3000
   
   # Kill the process or change port in docker-compose.production.yml
   ```

2. **Database connection failed**:
   ```bash
   # Check database logs
   docker-compose -f docker-compose.production.yml logs db
   
   # Restart database
   docker-compose -f docker-compose.production.yml restart db
   ```

3. **API keys not working**:
   ```bash
   # Check environment variables
   docker-compose -f docker-compose.production.yml exec backend env | grep API_KEY
   
   # Verify .env file
   cat .env | grep API_KEY
   ```

4. **Out of disk space**:
   ```bash
   # Clean up Docker
   docker system prune -a
   
   # Clean up old logs
   sudo journalctl --vacuum-time=7d
   ```

### Health Checks

```bash
# Check all services
curl http://localhost:8000/api/health
curl http://localhost:3000/health

# Check database
docker-compose -f docker-compose.production.yml exec db pg_isready -U postgres
```

## 📈 Performance Optimization

### 1. Resource Limits

Add resource limits to `docker-compose.production.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

### 2. Database Optimization

```bash
# Connect to database
docker-compose -f docker-compose.production.yml exec db psql -U postgres -d ai_job_platform

# Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);
```

## 🔄 Scaling Options

### 1. Horizontal Scaling

```bash
# Scale backend services
docker-compose -f docker-compose.production.yml up -d --scale backend=3
```

### 2. Load Balancer

For multiple instances, use a load balancer like Nginx or Traefik.

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose -f docker-compose.production.yml logs -f`
2. Verify environment variables: `cat .env`
3. Check service status: `docker-compose -f docker-compose.production.yml ps`
4. Review this guide for troubleshooting steps

## 🎉 Success!

Your AI Job Platform is now deployed and running! You can:

- Access the web interface at your server IP:3000
- Use the API at your server IP:8000
- View API documentation at your server IP:8000/docs
- Monitor logs and manage the application using the provided scripts

Remember to:
- Keep your API keys secure
- Regularly backup your data
- Monitor system resources
- Update the application regularly
- Set up SSL certificates for production use




