# 🚀 Azure Server Deployment Instructions

This guide will help you deploy your AI Job Platform to your Azure server using the correct directory structure and connection details.

## 📋 Your Server Details
- **Server IP**: 4.227.157.253
- **Username**: azureuser
- **Key File**: ubuntu_key.pem
- **Package**: deployment-package-complete/

## 🎯 Step-by-Step Deployment

### Step 1: Transfer the Complete Package

**From your local machine:**

```bash
# Transfer the complete deployment package
scp -i ubuntu_key.pem -r ./deployment-package-complete/ azureuser@4.227.157.253:/tmp/
```

### Step 2: Connect to Your Azure Server

```bash
ssh -i ubuntu_key.pem azureuser@4.227.157.253
```

### Step 3: Server Preparation (if needed)

**On your Azure server, run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker azureuser

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply Docker group changes
exit
# SSH back in
ssh -i ubuntu_key.pem azureuser@4.227.157.253
```

### Step 4: Extract and Setup

```bash
# Extract the package
cd /home/leemax/projects
sudo tar -xzf /tmp/deployment-package-complete/application-complete.tar.gz
sudo mv NewCompleteWorking ai-job-platform
cd ai-job-platform

# Copy Docker images and configuration
sudo cp /tmp/deployment-package-complete/docker-images.tar.gz .
sudo cp /tmp/deployment-package-complete/docker-compose.production.yml .
sudo cp /tmp/deployment-package-complete/deploy-complete.sh .
sudo chmod +x deploy-complete.sh

# Set ownership
sudo chown -R azureuser:azureuser /home/leemax/projects/ai-job-platform
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

# Set your server IP
FRONTEND_API_URL=http://4.227.157.253:8000
ALLOWED_HOSTS=4.227.157.253,localhost,127.0.0.1

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

- **Frontend**: http://4.227.157.253:3000
- **Backend API**: http://4.227.157.253:8000
- **API Documentation**: http://4.227.157.253:8000/docs

## 🔒 Azure Security Configuration

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

## 🚨 Troubleshooting

### Common Issues

1. **Docker not found after installation:**
   ```bash
   # Logout and login again
   exit
   ssh -i ubuntu_key.pem azureuser@4.227.157.253
   ```

2. **Permission denied errors:**
   ```bash
   # Fix ownership
   sudo chown -R azureuser:azureuser /home/leemax/projects/ai-job-platform
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
WorkingDirectory=/home/leemax/projects/ai-job-platform
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0
User=azureuser
Group=azureuser

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

## 🎉 Success!

Your AI Job Platform is now running on your Azure server! You can:

- Access the web interface at http://4.227.157.253:3000
- Use the API at http://4.227.157.253:8000
- View API documentation at http://4.227.157.253:8000/docs
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

