# Render Deployment Configuration
# Great free tier option

## 🚀 Render Setup

### 1. Create render.yaml
```yaml
services:
  - type: web
    name: airecruiterubuntu
    env: docker
    dockerfilePath: ./Dockerfile.render
    plan: free
    envVars:
      - key: GROK_API_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: DEEPSEEK_API_KEY
        sync: false
      - key: DASHSCOPE_API_KEY
        sync: false
      - key: ZAI_API_KEY
        sync: false
      - key: DEFAULT_AI_AGENT
        value: openai
    healthCheckPath: /api/health
```

### 2. Create Dockerfile.render
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

# Render uses PORT environment variable
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Start command
CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

### 3. Deploy Steps
1. Go to [render.com](https://render.com)
2. Connect GitHub account
3. Create "New Web Service"
4. Select your repository
5. Choose "Docker" as environment
6. Set environment variables
7. Deploy! 🎉

### 4. Environment Variables (Set in Render Dashboard)
```
GROK_API_KEY=your_key
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
DEEPSEEK_API_KEY=your_key
DASHSCOPE_API_KEY=your_key
ZAI_API_KEY=your_key
DEFAULT_AI_AGENT=openai
```

### 5. Benefits
- ✅ Generous free tier
- ✅ Automatic HTTPS
- ✅ Auto-scaling
- ✅ GitHub integration
- ✅ Persistent disks
- ✅ Custom domains
- ✅ $0/month on free tier
