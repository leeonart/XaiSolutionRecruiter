# Railway Deployment Configuration
# The most seamless deployment option

## 🚀 Railway Setup (Recommended)

### 1. Create railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.railway"
  },
  "deploy": {
    "startCommand": "uvicorn api.index:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. Create Dockerfile.railway
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

# Railway uses PORT environment variable
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Start command
CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

### 3. Deploy Steps
1. Go to [railway.app](https://railway.app)
2. Connect GitHub account
3. Select your repository
4. Railway auto-detects Dockerfile
5. Set environment variables
6. Deploy! 🎉

### 4. Environment Variables (Set in Railway Dashboard)
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
- ✅ Zero configuration
- ✅ Automatic HTTPS
- ✅ Built-in PostgreSQL database
- ✅ Custom domains
- ✅ Auto-scaling
- ✅ GitHub integration
- ✅ $5/month + usage
