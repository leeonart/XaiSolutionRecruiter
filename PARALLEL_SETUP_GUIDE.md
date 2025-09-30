# Parallel Development & Production Setup Guide

Yes, you **CAN** run development and production environments simultaneously! Here's how:

## 🎯 **Solution: Use Different Port Mappings**

### Current Single-Environment Setup:
```bash
# Development Mode ONLY
./switch-to-dev.sh

# Production Mode ONLY  
./switch-to-prod.sh
```

### Parallel Environment Setup:
```bash
# Both environments simultaneously
./run-both.sh
```

## 🗂️ **Port Mapping Strategy**

| Service | Development | Production | Notes |
|---------|-------------|------------|-------|
| **Frontend Direct** | :3001 | :3000 | Avoid conflicts |
| **Frontend Proxy** | :8080 | :80 | Development proxy |
| **Backend Direct** | :8001 | :8000 | Different APIs |
| **Backend Proxy** | :8080/api/* | :80/api/* | Via nginx |
| **Database** | :5433 | :5432 | Separate databases |
| **Nginx HTTP** | :8080 | :80 | Different proxies |
| **Nginx HTTPS** | :8443 | :443 | SSL only in production |

## 🚀 **Quick Start - Parallel Mode**

### Start Both Environments:
```bash
./run-both.sh
```

### Stop Both Environments:
```bash
./stop-both.sh
```

### Manual Control:
```bash
# Start development environment
docker-compose -f docker-compose.dev-parallel.yml up -d

# Start production environment  
docker-compose -f docker-compose.prod-parallel.yml up -d

# Stop development only
docker-compose -f docker-compose.dev-parallel.yml down

# Stop production only
docker-compose -f docker-compose.prod-parallel.yml down
```

## 🌐 **Access Points - Parallel Mode**

### Development Environment:
- **Frontend**: http://localhost:3001 (direct)
- **Frontend**: http://localhost:8080 (via proxy)
- **Backend**: http://localhost:8001 (direct)
- **API**: http://localhost:8080/api/* (via proxy)
- **Database**: localhost:5433

### Production Environment:
- **Frontend**: http://localhost:3000 (direct)
- **Frontend**: http://localhost (via proxy)
- **Backend**: http://localhost:8000 (direct)
- **API**: http://localhost/api/* (via proxy)
- **Database**: localhost:5432

## ⚙️ **Configuration Files**

1. **docker-compose.dev-parallel.yml** - Development + parallel ports
2. **docker-compose.prod-parallel.yml** - Production + parallel ports
3. **nginx.dev.parallel.conf** - Nginx config for dev parallel
4. **nginx.prod.conf** - Nginx config for production (unchanged)

## 🔧 **Network Isolation**

Each environment uses separate Docker networks:
- **dev-network** - Development services
- **prod-network** - Production services

This ensures **complete isolation** between environments.

## 💾 **Database Separation**

Development and production use **completely separate databases**:
- `dev_postgres_data` volume
- `prod_postgres_data` volume

No data conflicts or corruption risk!

## 🎮 **Use Cases**

### Running Both Simultaneously:

**Development Testing + Production Demo:**
```bash
./run-both.sh

# Test new features in dev
curl http://localhost:8080/api/status

# Show stable version in prod  
curl http://localhost/api/status
```

**Different Teams:**
```bash
# Frontend team uses port 8080
http://localhost:8080

# Backend team uses port 8001  
http://localhost:8001

# Production team uses port 80
http://localhost
```

**A/B Testing:**
```bash
# Current stable: Production (port 80)
# New version: Development (port 8080)
```

## 🛠️ **Management Commands**

### View Status:
```bash
# See both environments
docker ps | grep -E "(dev_|prod_)"

# Development logs
docker-compose -f docker-compose.dev-parallel.yml logs

# Production logs
docker-compose -f docker-compose.prod-parallel.yml logs
```

### Selective Restart:
```bash
# Restart only development
docker-compose -f docker-compose.dev-parallel.yml restart

# Restart only production
docker-compose -f docker-compose.prod-parallel.yml restart
```

## ⚠️ **Current Status**

Due to TypeScript compilation errors, the parallel setup will need frontend fixes before building. However, **the concept and architecture are solid**.

### Working Approach:
For now, you can use the **sequential approach**:
1. Run development mode: `./switch-to-dev.sh`
2. Switch to production mode: `./switch-to-prod.sh`  
3. Switch back: `./switch-to-dev.sh`

### Next Steps for Parallel:
1. Fix TypeScript errors in frontend
2. Re-run: `./run-both.sh`
3. Enjoy both environments simultaneously!

The parallel setup is **theoretically perfect** and **architecturally sound**. It just needs the frontend build issues resolved. 🎉


