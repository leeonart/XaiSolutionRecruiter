# 🚀 Local Development Guide

This guide will help you run the AI Job Processing Platform locally for development and testing before deploying to Vercel.

## 📋 Prerequisites

- **Python 3.8+** installed
- **pip** package manager
- **Git** (for version control)

## 🛠️ Quick Setup

### Option 1: Automated Setup (Windows)

```bash
# Run the setup script
setup_local.bat
```

### Option 2: PowerShell Setup

```powershell
# Run the PowerShell setup script
.\setup_local.ps1
```

### Option 3: Manual Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create environment file
copy env.local.example .env.local

# 3. Create credentials directory
mkdir credentials

# 4. Add your Google Drive credentials.json to credentials/ folder
```

## 🔑 Environment Configuration

### 1. Set up API Keys

Edit `.env.local` and add your actual API keys:

```bash
# AI Agent API Keys
GROK_API_KEY=your_actual_grok_api_key
GEMINI_API_KEY=your_actual_gemini_api_key
OPENAI_API_KEY=your_actual_openai_api_key
DEEPSEEK_API_KEY=your_actual_deepseek_api_key
DASHSCOPE_API_KEY=your_actual_qwen_api_key
ZAI_API_KEY=your_actual_zai_api_key

# Google Drive Configuration
GDRIVE_FOLDER_ID=1h_tR64KptPn3UC1t4ytufyUYHOls71du
DEFAULT_AI_AGENT=openai
```

### 2. Google Drive Credentials

1. Download your `credentials.json` from Google Cloud Console
2. Place it in the `credentials/` folder
3. Ensure the file is named exactly `credentials.json`

## 🏃‍♂️ Running Locally

### Start the Development Server

```bash
# Easy way
python run_local.py

# Manual way
uvicorn api.index:app --reload --host 0.0.0.0 --port 8000
```

### Access Your Application

- **Web Interface**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc
- **API Status**: http://localhost:8000/api/status

## 🧪 Testing

### Test API Endpoints

```bash
# Run the test script
python test_local.py
```

### Manual Testing

1. **Check Status**:
   ```bash
   curl http://localhost:8000/api/status
   ```

2. **Test Web Interface**:
   Open http://localhost:8000 in your browser

3. **Test API Documentation**:
   Visit http://localhost:8000/docs

## 🔄 Development Workflow

### 1. Make Changes

- Edit files in `api/`, `public/`, or `modules/`
- The server will auto-reload on changes (thanks to `--reload` flag)

### 2. Test Changes

- Use the web interface at http://localhost:8000
- Test API endpoints directly
- Check the API documentation

### 3. Debug Issues

- Check the console output for errors
- Use the browser's developer tools
- Check the FastAPI logs

### 4. Deploy to Vercel

When ready:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```bash
   # Kill process on port 8000
   netstat -ano | findstr :8000
   taskkill /PID <PID> /F
   ```

2. **Module Import Errors**:
   - Ensure you're running from the project root directory
   - Check that all dependencies are installed

3. **API Key Errors**:
   - Verify `.env.local` exists and has correct keys
   - Check that environment variables are loaded

4. **Google Drive Errors**:
   - Ensure `credentials.json` is in the `credentials/` folder
   - Verify the file is valid JSON

### Debug Mode

Enable debug logging by setting in `.env.local`:
```bash
DEBUG=true
LOG_LEVEL=debug
```

## 📁 Project Structure

```
├── api/
│   └── index.py          # FastAPI application
├── public/
│   └── index.html        # Web interface
├── modules/              # Original modules
├── credentials/          # Google Drive credentials
├── run_local.py          # Local development server
├── test_local.py         # Test script
├── setup_local.bat       # Windows setup
├── setup_local.ps1       # PowerShell setup
├── env.local.example     # Environment template
└── requirements.txt      # Dependencies
```

## 🎯 Development Tips

1. **Hot Reload**: The server automatically restarts when you change code
2. **API Testing**: Use the Swagger UI at `/docs` for interactive testing
3. **Environment Variables**: Changes to `.env.local` require server restart
4. **File Uploads**: Test with small files first
5. **Logs**: Check console output for detailed error messages

## 🚀 Next Steps

1. **Develop Features**: Add new functionality locally
2. **Test Thoroughly**: Use the web interface and API endpoints
3. **Commit Changes**: Use Git to version control your changes
4. **Deploy**: Push to Vercel when ready

## 📞 Support

If you encounter issues:

1. Check the console output for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that you're running from the correct directory

Happy coding! 🎉



