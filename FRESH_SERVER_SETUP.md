# 🚀 Fresh Server Setup Guide - AI Job Platform

This guide will help you deploy your AI Job Platform to a completely fresh Ubuntu server with no Docker or other software installed.

## 📋 Prerequisites

- Fresh Ubuntu 20.04+ server
- Root access (or sudo privileges)
- Internet connection
- Your deployment package

## 🎯 Step-by-Step Deployment

### Step 1: Connect to Your Server

```bash
# Connect via SSH
ssh user@your-server-ip

# Or if using root
ssh root@your-server-ip
```

### Step 2: Transfer Your Package

**From your local machine:**

```bash
# Transfer the complete package (recommended)
scp -r ./deployment-package-complete/ user@your-server:/tmp/

# Or transfer the standard package
scp ./deployment-package/ai-job-platform-deployment-*.tar.gz user@your-server:/tmp/
```

### Step 3: Server Preparation

**On your server, run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply Docker group changes
exit
# SSH back in
ssh user@your-server-ip
```

### Step 4: Extract and Setup

```bash
# Extract the package
cd /opt
sudo tar -xzf /tmp/ai-job-platform-complete-*/application-complete.tar.gz
sudo mv NewCompleteWorking ai-job-platform
cd ai-job-platform

# Copy Docker images and configuration
sudo cp /tmp/ai-job-platform-complete-*/docker-images.tar.gz .
sudo cp /tmp/ai-job-platform-complete-*/docker-compose.production.yml .
sudo cp /tmp/ai-job-platform-complete-*/deploy-complete.sh .
sudo chmod +x deploy-complete.sh

# Set ownership
sudo chown -R $USER:$USER /opt/ai-job-platform
```

### Step 5: Configure Environment

```bash
# Copy environment template
cp env.production .env

# Edit the environment file
nano .env
```

**Important configurations to change:**

```bash
# Change these passwords!
POSTGRES_PASSWORD=your_secure_database_password_here
SECRET_KEY=your_very_long_random_secret_key_here

# Add your API keys
OPENAI_API_KEY=sk-your-openai-key-here
GROK_API_KEY=your-grok-key-here
GEMINI_API_KEY=your-gemini-key-here
DEEPSEEK_API_KEY=your-deepseek-key-here
DASHSCOPE_API_KEY=your-dashscope-key-here
ZAI_API_KEY=your-zai-key-here
CLAUDE_API_KEY=your-claude-key-here

# Set your domain (if you have one)
FRONTEND_API_URL=http://your-server-ip:8000
ALLOWED_HOSTS=your-server-ip,localhost,127.0.0.1

# Processing configuration
DEFAULT_AI_AGENT=openai
MAX_WORKERS=8
ENVIRONMENT=production
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Deploy the Application

```bash
# Run the deployment script
./deploy-complete.sh
```

This script will:
- Load the Docker images
- Create necessary directories
- Start all services
- Perform health checks
- Display deployment status

### Step 7: Verify Deployment

```bash
# Check if all services are running
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Test the API
curl http://localhost:8000/api/health

# Test the frontend
curl http://localhost:3000
```

### Step 8: Access Your Application

Your application will be available at:

- **Frontend**: http://your-server-ip:3000
- **Backend API**: http://your-server-ip:8000
- **API Documentation**: http://your-server-ip:8000/docs

## 🔒 Security Setup (Recommended)

### Configure Firewall

```bash
# Install and configure UFW
sudo apt install -y ufw
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp

# Check status
sudo ufw status
```

### Install Fail2ban

```bash
# Install fail2ban for security
sudo apt install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### Set Up SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chown -R $USER:$USER ssl/
```

## 🚨 Troubleshooting

### Common Issues

1. **Docker not found after installation:**
   ```bash
   # Logout and login again
   exit
   ssh user@your-server-ip
   ```

2. **Permission denied errors:**
   ```bash
   # Fix ownership
   sudo chown -R $USER:$USER /opt/ai-job-platform
   ```

3. **Port already in use:**
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :3000
   
   # Kill the process or change port in docker-compose.production.yml
   ```

4. **Database connection failed:**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.production.yml logs db
   
   # Restart database
   docker-compose -f docker-compose.production.yml restart db
   ```

5. **API keys not working:**
   ```bash
   # Check environment variables
   docker-compose -f docker-compose.production.yml exec backend env | grep API_KEY
   
   # Verify .env file
   cat .env | grep API_KEY
   ```

### Health Checks

```bash
# Check all services
curl http://localhost:8000/api/health
curl http://localhost:3000/health

# Check database
docker-compose -f docker-compose.production.yml exec db pg_isready -U postgres

# Check container status
docker-compose -f docker-compose.production.yml ps
```

## 📊 Management Commands

### View Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
docker-compose -f docker-compose.production.yml logs -f db
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend
```

### Stop/Start Services

```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Start all services
docker-compose -f docker-compose.production.yml up -d
```

### Update Application

```bash
# Pull latest changes (if using git)
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml up --build -d
```

## 🔄 Auto-Start Setup

### Create Systemd Service

```bash
# Create systemd service file
sudo nano /etc/systemd/system/ai-job-platform.service
```

Add this content:

```ini
[Unit]
Description=AI Job Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ai-job-platform
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0
User=your-username
Group=your-username

[Install]
WantedBy=multi-user.target
```

Enable the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable ai-job-platform.service

# Check status
sudo systemctl status ai-job-platform.service
```

## 📈 Monitoring

### Check Resource Usage

```bash
# Check Docker resource usage
docker stats

# Check system resources
htop
# or
top
```

### Backup Data

```bash
# Run backup script
./backup.sh

# Manual backup
docker-compose -f docker-compose.production.yml exec db pg_dump -U postgres ai_job_platform > backup.sql
```

## 🎉 Success!

Your AI Job Platform is now running on your fresh server! You can:

- Access the web interface at your server IP:3000
- Use the API at your server IP:8000
- View API documentation at your server IP:8000/docs
- Monitor logs and manage the application using the provided commands

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose -f docker-compose.production.yml logs -f`
2. Verify environment variables: `cat .env`
3. Check service status: `docker-compose -f docker-compose.production.yml ps`
4. Review this guide for troubleshooting steps

Remember to:
- Keep your API keys secure
- Regularly backup your data
- Monitor system resources
- Update the application regularly
- Set up SSL certificates for production use




