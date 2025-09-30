# API Key Setup Guide

This guide explains how to configure API keys for the AI agents in this project.

## ✅ Current Status

**FIXED**: The original API key validation errors have been resolved!

- **Grok**: ✅ Working correctly with valid API key
- **Gemini**: ✅ Working correctly with valid API key (model: gemini-2.5-flash-lite-preview-06-17)
- **OpenAI**: ⚪ No key configured yet
- **Deepseek**: ⚪ No key configured yet

## Quick Setup for Additional AI Agents

### To fix Gemini (if needed):
1. **Get a new Gemini API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key (it should start with `AIza...`)

2. **Update the API Key**
   - Open `credentials/api_keys.txt`
   - Replace the current Gemini key with your new one
   - Example: `GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

3. **Test the Connection**
   - Run the application
   - Choose option 9 (Select AI Agent)
   - Choose option 2 (Gemini)
   - The system will automatically test the connection

## API Key Configuration

### File-based Storage (Recommended)

All API keys are stored in `credentials/api_keys.txt`. This file uses a simple `KEY=value` format:

```
# Gemini API Key (Google AI Studio)
GEMINI_API_KEY=your_gemini_key_here

# Grok API Key (X.AI)
GROK_API_KEY=your_grok_key_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_key_here

# Deepseek API Key
DEEPSEEK_API_KEY=your_deepseek_key_here
```

### Environment Variables (Alternative)

You can also set API keys as environment variables. Environment variables take priority over file-based keys:

```bash
# Windows
set GEMINI_API_KEY=your_key_here

# Linux/Mac
export GEMINI_API_KEY=your_key_here
```

## Supported AI Agents

### 1. Gemini (Google AI)
- **Get API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Default Model**: `gemini-2.5-flash-lite-preview-06-17` (latest preview model)
- **Key Format**: Starts with `AIza`

### 2. Grok (X.AI)
- **Get API Key**: [X.AI Console](https://console.x.ai/)
- **Default Model**: `grok-3-mini`
- **Key Format**: Starts with `xai-`

### 3. OpenAI
- **Get API Key**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Default Model**: `gpt-4o`
- **Key Format**: Starts with `sk-`

### 4. Deepseek
- **Get API Key**: [Deepseek Platform](https://platform.deepseek.com/)
- **Default Model**: `deepseek-chat`
- **Key Format**: Starts with `sk-`

## Testing AI Agents

The application now includes automatic testing when you select an AI agent:

1. Run the application
2. Choose option 9 (Select AI Agent)
3. Select your preferred AI agent
4. The system will automatically test the connection
5. You'll see either ✓ (success) or ✗ (failure) with details

## Security Notes

- **Never commit API keys to version control**
- The `credentials/api_keys.txt` file is already in `.gitignore`
- Keep your API keys secure and don't share them
- Rotate keys regularly for security

## Troubleshooting

### "No API key found" Error
- Check that your key is properly added to `credentials/api_keys.txt`
- Ensure there are no extra spaces or quotes around the key
- Verify the key format matches the expected pattern for your AI service

### "API key not valid" Error
- Double-check that you copied the key correctly
- Verify the key hasn't expired
- Check that you have the correct permissions/credits for the AI service

### "Model not found" Error
- Check if the model name is correct in the configuration
- Some models may not be available in your region
- Verify you have access to the specific model

## Configuration Files

- `credentials/api_keys.txt` - Main API key storage
- `config.py` - AI agent configuration and settings
- `main.py` - Application entry point with AI agent selection
- `modules/job_processor_Original.py` - Job processing with AI integration

## Getting Help

If you continue to have issues:

1. Check the error messages carefully
2. Verify your API keys are valid and have sufficient credits
3. Test with a different AI agent to isolate the issue
4. Check the application logs for detailed error information

## Google Drive API Setup

### Setting up Google Drive API Access

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Drive API for your project

2. **Create Service Account Credentials**
   - In the Cloud Console, go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details and click "Create"
   - Under "Keys", create a new JSON key
   - Download the JSON key file

3. **Configure the Application**
   - Rename the downloaded JSON key file to `credentials.json`
   - Place it in the `credentials/` directory of this project
   - The file path should be: `credentials/credentials.json`

4. **Verify Setup**
   - The application will automatically use these credentials
   - If you see authentication errors, ensure the credentials file is:
     - Named exactly `credentials.json`
     - Placed in the `credentials/` directory
     - Contains valid service account credentials

### Troubleshooting Google Drive Integration

- **"credentials.json not found" Error**
  - Verify the file exists in the `credentials/` directory
  - Check the file name is exactly `credentials.json`
  - Ensure the file contains valid service account credentials

- **Authentication Failed**
  - Verify the Google Drive API is enabled in your Google Cloud project
  - Check that the service account has appropriate permissions
  - Try downloading and replacing the credentials file with a new one
