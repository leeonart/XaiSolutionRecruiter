# DigitalOcean App Platform Deployment
# Best Docker Hub integration

## 🚀 DigitalOcean App Platform Setup

### 1. Create .do/app.yaml
```yaml
name: airecruiterubuntu
services:
- name: web
  source_dir: /
  github:
    repo: leeonart/AIRecruiterUbuntu
    branch: main
  run_command: uvicorn api.index:app --host 0.0.0.0 --port $PORT
  environment_slug: docker
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 8080
  health_check:
    http_path: /api/health
  envs:
  - key: GROK_API_KEY
    scope: RUN_TIME
    type: SECRET
  - key: GEMINI_API_KEY
    scope: RUN_TIME
    type: SECRET
  - key: OPENAI_API_KEY
    scope: RUN_TIME
    type: SECRET
  - key: DEEPSEEK_API_KEY
    scope: RUN_TIME
    type: SECRET
  - key: DASHSCOPE_API_KEY
    scope: RUN_TIME
    type: SECRET
  - key: ZAI_API_KEY
    scope: RUN_TIME
    type: SECRET
  - key: DEFAULT_AI_AGENT
    value: openai
    scope: RUN_TIME
```

### 2. Create Dockerfile.do
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

# DigitalOcean uses PORT environment variable
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Start command
CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

### 3. Deploy Steps
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Create "New App"
3. Connect GitHub repository
4. Choose "Docker" as source type
5. Set environment variables
6. Deploy! 🎉

### 4. Alternative: Docker Hub Deployment
1. Push your image to Docker Hub:
   ```bash
   docker build -t yourusername/airecruiterubuntu:latest .
   docker push yourusername/airecruiterubuntu:latest
   ```
2. In DigitalOcean App Platform:
   - Choose "Docker Hub" as source
   - Enter your image name: `yourusername/airecruiterubuntu:latest`
   - Configure environment variables
   - Deploy!

### 5. Environment Variables (Set in DigitalOcean Dashboard)
```
GROK_API_KEY=your_key
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
DEEPSEEK_API_KEY=your_key
DASHSCOPE_API_KEY=your_key
ZAI_API_KEY=your_key
DEFAULT_AI_AGENT=openai
```

### 6. Benefits
- ✅ Direct Docker Hub integration
- ✅ Automatic HTTPS
- ✅ Auto-scaling
- ✅ Managed databases available
- ✅ Custom domains
- ✅ $5/month starter plan
- ✅ Great documentation
