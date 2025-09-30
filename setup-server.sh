#!/bin/bash

# Server Setup Script for AI Job Platform
# This script prepares a fresh Ubuntu server for deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

print_status "Setting up server for AI Job Platform deployment..."

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker installed successfully"
else
    print_warning "Docker is already installed"
fi

# Install Docker Compose (standalone)
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    # Get latest version
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    
    # Download and install
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
else
    print_warning "Docker Compose is already installed"
fi

# Create deployment user
print_status "Creating deployment user..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    usermod -aG sudo deploy
    
    # Set up SSH key directory
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chown deploy:deploy /home/deploy/.ssh
    
    print_success "Deployment user 'deploy' created"
else
    print_warning "Deployment user 'deploy' already exists"
fi

# Configure firewall
print_status "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3000/tcp
    ufw allow 8000/tcp
    print_success "Firewall configured"
else
    print_warning "UFW not available, skipping firewall configuration"
fi

# Install fail2ban for security
print_status "Installing fail2ban..."
apt install -y fail2ban
systemctl start fail2ban
systemctl enable fail2ban
print_success "Fail2ban installed and started"

# Set up log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/ai-job-platform << EOF
/var/log/ai-job-platform/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
}
EOF

# Create application directory
print_status "Creating application directory..."
mkdir -p /opt/ai-job-platform
chown deploy:deploy /opt/ai-job-platform

# Set up systemd service for auto-start
print_status "Setting up systemd service..."
cat > /etc/systemd/system/ai-job-platform.service << EOF
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
User=deploy
Group=deploy

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ai-job-platform.service

print_success "Systemd service configured"

# Create deployment script for the deploy user
print_status "Creating deployment helper script..."
cat > /home/deploy/deploy.sh << 'EOF'
#!/bin/bash
cd /opt/ai-job-platform
sudo docker-compose -f docker-compose.production.yml down
sudo docker-compose -f docker-compose.production.yml up --build -d
EOF

chmod +x /home/deploy/deploy.sh
chown deploy:deploy /home/deploy/deploy.sh

# Display completion message
print_success "Server setup completed successfully!"
echo ""
echo "=========================================="
echo "🖥️  Server is ready for deployment!"
echo "=========================================="
echo ""
echo "📋 Next steps:"
echo "  1. Switch to deploy user: su - deploy"
echo "  2. Copy your project to: /opt/ai-job-platform"
echo "  3. Run deployment: ./deploy.sh"
echo ""
echo "🔧 Useful commands:"
echo "  Check service status: sudo systemctl status ai-job-platform"
echo "  Start service: sudo systemctl start ai-job-platform"
echo "  Stop service: sudo systemctl stop ai-job-platform"
echo "  View logs: sudo docker-compose -f /opt/ai-job-platform/docker-compose.production.yml logs -f"
echo ""
echo "🔒 Security features enabled:"
echo "  - Firewall (UFW) configured"
echo "  - Fail2ban installed"
echo "  - Non-root deployment user"
echo "  - Docker security groups"
echo ""




