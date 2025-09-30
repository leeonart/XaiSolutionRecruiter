# AI Job Processing Platform

A modern, full-stack web application for AI-powered job processing and resume matching. This platform transforms your existing Python CLI application into a professional web service with database support, modern UI, and containerized deployment.

## 🚀 Features

- **AI-Powered Job Processing**: Process job descriptions using multiple AI providers (Grok, Gemini, Deepseek, OpenAI, Qwen, Z.ai)
- **Resume Matching**: Intelligent matching between resumes and job listings
- **Database Integration**: PostgreSQL database with SQLModel for data persistence
- **Modern Web Interface**: React frontend with TypeScript and Tailwind CSS
- **RESTful API**: FastAPI backend with automatic documentation
- **Containerized Deployment**: Docker and Docker Compose for easy deployment
- **Google Drive Integration**: Download and process files from Google Drive
- **Real-time Processing**: Monitor processing sessions and results

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  FastAPI Backend│    │  PostgreSQL DB  │
│   (Port 3000)   │◄──►│   (Port 8000)   │◄──►│   (Port 5432)   │
│                 │    │                 │    │                 │
│ • TypeScript    │    │ • SQLModel      │    │ • Job Data      │
│ • Tailwind CSS  │    │ • Pydantic      │    │ • Resume Data   │
│ • Shadcn/ui     │    │ • AI Integration│    │ • Match Results │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
ai-job-platform/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   └── main.py            # Main FastAPI application
│   ├── Dockerfile             # Backend container config
│   └── requirements.txt       # Python dependencies
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── lib/              # Utilities and API client
│   │   └── App.tsx           # Main app component
│   ├── Dockerfile            # Frontend container config
│   └── package.json          # Node.js dependencies
├── modules/                   # Original Python modules
├── credentials/              # API keys and service accounts
├── docker-compose.yml        # Multi-container orchestration
├── env.example              # Environment variables template
└── README.md               # This file
```

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLModel**: Database ORM with Pydantic integration
- **PostgreSQL**: Production-ready relational database
- **Uvicorn**: ASGI server for FastAPI
- **Pydantic**: Data validation and serialization

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Beautiful, accessible UI components
- **Vite**: Fast build tool and dev server
- **Axios**: HTTP client for API communication

### DevOps
- **Docker**: Containerization platform
- **Docker Compose**: Multi-container orchestration
- **PostgreSQL**: Database with persistent volumes

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git for cloning the repository
- API keys for AI providers (optional for basic functionality)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-job-platform

# Copy environment template
cp env.example .env

# Edit .env file with your API keys (optional)
nano .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your API keys:

```bash
# Required for full functionality
GROK_API_KEY=your_grok_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Set default AI agent
DEFAULT_AI_AGENT=openai
```

### 3. Start the Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432

## 📖 Usage Guide

### Dashboard
- View system status and available AI agents
- Monitor processing sessions
- Quick access to main features

### Jobs Management
- Create, edit, and delete job listings
- Search and filter jobs
- View job details and requirements

### Resume Processing
- Upload resume files (PDF, DOCX, TXT)
- Extract candidate information
- Store resume data in database

### AI Processing
- Process Master Tracking Board (MTB) data
- Run AI analysis on job descriptions
- Match resumes to job listings
- Optimize JSON outputs

### Settings
- Configure AI agents and models
- Manage API keys
- System configuration

## 🔧 Development

### Backend Development

```bash
# Enter backend container
docker-compose exec backend bash

# Install new dependencies
pip install new-package

# Update requirements.txt
pip freeze > requirements.txt

# Run tests
pytest
```

### Frontend Development

```bash
# Enter frontend container
docker-compose exec frontend bash

# Install new dependencies
npm install new-package

# Run development server
npm run dev
```

### Database Management

```bash
# Connect to database
docker-compose exec db psql -U postgres -d ai_job_platform

# Run migrations (if using Alembic)
docker-compose exec backend alembic upgrade head
```

## 🔌 API Endpoints

### Core Endpoints

- `GET /api/health` - Health check
- `GET /api/status` - System status
- `GET /api/docs` - Interactive API documentation

### Job Management

- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create new job
- `GET /api/jobs/{id}` - Get specific job
- `PUT /api/jobs/{id}` - Update job
- `DELETE /api/jobs/{id}` - Delete job

### Resume Management

- `GET /api/resumes` - List all resumes
- `POST /api/resumes` - Create new resume
- `GET /api/resumes/{id}` - Get specific resume
- `PUT /api/resumes/{id}` - Update resume
- `DELETE /api/resumes/{id}` - Delete resume

### Processing

- `POST /api/process-mtb` - Process Master Tracking Board
- `POST /api/process-jobs` - Process job descriptions with AI
- `POST /api/match-resumes` - Match resumes to jobs
- `POST /api/optimize-json` - Optimize JSON output

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build

# View logs
docker-compose logs -f [service-name]

# Execute commands in containers
docker-compose exec backend python -c "print('Hello from backend')"
docker-compose exec frontend npm run build

# Clean up
docker-compose down -v  # Removes volumes
docker system prune -a  # Clean up unused images
```

## 🔒 Security Considerations

- Store API keys in environment variables, never in code
- Use HTTPS in production
- Implement proper authentication and authorization
- Regular security updates for dependencies
- Database access controls

## 🚀 Production Deployment

### Environment Setup

1. **Production Environment Variables**:
   ```bash
   DATABASE_URL=postgresql://user:password@prod-db:5432/ai_job_platform
   GROK_API_KEY=your_production_key
   # ... other production keys
   ```

2. **Database Configuration**:
   - Use managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
   - Enable SSL connections
   - Configure backup and monitoring

3. **Reverse Proxy**:
   - Use Nginx or Traefik for SSL termination
   - Configure proper CORS settings
   - Set up rate limiting

### Deployment Options

- **Cloud Platforms**: AWS, Google Cloud, Azure
- **Container Orchestration**: Kubernetes, Docker Swarm
- **Serverless**: Vercel, Netlify (frontend only)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   ```bash
   # Check if database is running
   docker-compose ps
   
   # Restart database
   docker-compose restart db
   ```

2. **API Keys Not Working**:
   - Verify keys are correctly set in `.env`
   - Check API key permissions
   - Test keys individually

3. **Frontend Not Loading**:
   ```bash
   # Check frontend logs
   docker-compose logs frontend
   
   # Rebuild frontend
   docker-compose up --build frontend
   ```

4. **Port Conflicts**:
   - Change ports in `docker-compose.yml`
   - Check if ports are already in use

### Getting Help

- Check the logs: `docker-compose logs -f`
- Review API documentation: http://localhost:8000/docs
- Open an issue on GitHub

## 🔄 Migration from CLI

This web platform maintains compatibility with your existing Python modules:

- All original functionality is preserved
- Data is now stored in a database
- Web interface replaces CLI commands
- API endpoints provide programmatic access
- Docker ensures consistent deployment

The platform seamlessly integrates your existing job processing, resume matching, and AI integration modules while adding modern web capabilities and data persistence.