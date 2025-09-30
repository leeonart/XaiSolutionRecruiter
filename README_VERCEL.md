# AI Job Processing Platform - Vercel Deployment

This project has been converted to run on Vercel as a serverless web application with API endpoints.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo)

## 📁 Project Structure

```
├── api/
│   └── index.py          # Main FastAPI application
├── public/
│   └── index.html        # Web interface
├── modules/              # Original modules (unchanged)
├── credentials/          # Google Drive credentials
├── vercel.json          # Vercel configuration
├── requirements.txt     # Python dependencies
└── env.example         # Environment variables template
```

## 🔧 Setup Instructions

### 1. Environment Variables

Set these environment variables in your Vercel dashboard:

```bash
# AI Agent API Keys
GROK_API_KEY=your_grok_api_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
DASHSCOPE_API_KEY=your_qwen_api_key
ZAI_API_KEY=your_zai_api_key

# Google Drive Configuration
GDRIVE_FOLDER_ID=1h_tR64KptPn3UC1t4ytufyUYHOls71du
DEFAULT_AI_AGENT=openai
MAX_WORKERS=8
```

### 2. Google Drive Setup

1. Upload your `credentials.json` file to the `credentials/` folder
2. Ensure the file is accessible to your Vercel deployment

### 3. Deploy

1. Connect your GitHub repository to Vercel
2. Set the environment variables in Vercel dashboard
3. Deploy!

## 🌐 API Endpoints

### Core Endpoints

- `GET /` - Web interface
- `GET /api/status` - System status
- `POST /api/process-mtb` - Process Master Tracking Board
- `POST /api/process-jobs` - Process jobs with AI
- `POST /api/match-resumes` - Match resumes to jobs
- `POST /api/optimize-json` - Optimize JSON output
- `POST /api/download-drive-files` - Download from Google Drive

### API Documentation

- Swagger UI: `https://your-app.vercel.app/docs`
- ReDoc: `https://your-app.vercel.app/redoc`

## 🔄 Migration from CLI to Web

The original CLI application has been converted to a web-based API with the following changes:

### Original CLI Functions → API Endpoints

| CLI Function | API Endpoint | Description |
|-------------|--------------|-------------|
| Option 1 (MTB) | `POST /api/process-mtb` | Process Master Tracking Board |
| Option 2 (Copy Local) | File upload via web interface | Copy local files |
| Option 3 (Drive Copy) | `POST /api/download-drive-files` | Download from Google Drive |
| Option 4 (AI Processing) | `POST /api/process-jobs` | Process jobs with AI |
| Option 5 (Combine Texts) | Integrated into job processing | Combine document texts |
| Option 6 (Pipeline) | Multiple API calls | Full pipeline |
| Option 7 (Full Pipeline) | Multiple API calls | Complete workflow |
| Option 8 (AI Agent) | Environment variables | Select AI agent |
| Option 9 (Optimize) | `POST /api/optimize-json` | Optimize JSON output |
| Option 10 (Resume Match) | `POST /api/match-resumes` | Match resumes to jobs |

## 🎯 Usage Examples

### Process Master Tracking Board

```bash
curl -X POST "https://your-app.vercel.app/api/process-mtb" \
  -F "csv_path=https://docs.google.com/spreadsheets/d/..." \
  -F "category=ALL" \
  -F "state=ALL" \
  -F "client_rating=ALL" \
  -F "extract_ids=true"
```

### Process Jobs with AI

```bash
curl -X POST "https://your-app.vercel.app/api/process-jobs" \
  -F "job_ids=1234,5678,9012" \
  -F "folder_path=/path/to/files" \
  -F "csv_path=/path/to/tracking.csv" \
  -F "ai_agent=grok"
```

### Match Resumes

```bash
curl -X POST "https://your-app.vercel.app/api/match-resumes" \
  -F "resume_files=@resume1.pdf" \
  -F "resume_files=@resume2.docx" \
  -F "jobs_json_path=/path/to/jobs.json" \
  -F "ai_provider=openai"
```

## 🔒 Security Considerations

1. **API Keys**: Store all API keys as environment variables in Vercel
2. **File Uploads**: Implement proper file validation and size limits
3. **Rate Limiting**: Consider implementing rate limiting for API endpoints
4. **Authentication**: Add authentication if needed for production use

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all modules are in the correct directory structure
2. **Environment Variables**: Check that all required env vars are set in Vercel
3. **File Paths**: Use absolute paths or ensure files are in the correct locations
4. **Timeout Issues**: Vercel has a 10-second timeout for hobby plans, 5 minutes for pro

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
```

## 📈 Performance Optimization

1. **Caching**: Implement caching for frequently accessed data
2. **Async Processing**: Use background tasks for long-running operations
3. **File Storage**: Consider using Vercel Blob for file storage
4. **Database**: Add a database for persistent storage if needed

## 🔄 Local Development

To run locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp env.example .env.local

# Run the application
python api/index.py
```

## 📝 Notes

- The original CLI functionality is preserved but accessed via web interface
- All file operations are adapted for serverless environment
- Google Drive integration requires proper credentials setup
- AI processing maintains the same quality and functionality as the original



