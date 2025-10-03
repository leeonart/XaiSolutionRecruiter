# config.py
import os

# Google Drive/Sheets
# Default folder for finding files: https://drive.google.com/drive/u/1/folders/1h_tR64KptPn3UC1t4ytufyUYHOls71du
GDRIVE_FOLDER_ID = os.getenv("GDRIVE_FOLDER_ID", "1h_tR64KptPn3UC1t4ytufyUYHOls71du")
GDRIVE_SERVICE_ACCOUNT = os.getenv("GDRIVE_SERVICE_ACCOUNT", "credentials/credentials.json")

# Google Drive search patterns
GDRIVE_DATE_PATTERN = r'\d{8}'  # Matches dates in format YYYYMMDD

# AI Agent Configuration
def load_default_ai_agent():
    """Load the default AI agent from persistent storage"""
    # First try to load from persistent config file
    try:
        config_file_path = "config_ai_agent.txt"
        if os.path.exists(config_file_path):
            with open(config_file_path, 'r') as f:
                content = f.read().strip()
                if '|' in content:
                    # New format: agent|model
                    agent, model = content.split('|', 1)
                    agent = agent.lower()
                    if agent in ["grok", "gemini", "deepseek", "openai", "qwen", "zai"]:
                        # Set the model environment variable if provided
                        if model:
                            model_env_key = f"{agent.upper()}_MODEL"
                            os.environ[model_env_key] = model
                        return agent
                else:
                    # Old format: just agent
                    saved_agent = content.lower()
                    if saved_agent in ["grok", "gemini", "deepseek", "openai", "qwen", "zai"]:
                        return saved_agent
    except Exception as e:
        print(f"Warning: Could not load AI agent from file: {e}")
    
    # Fall back to environment variable
    env_agent = os.getenv("DEFAULT_AI_AGENT", "openai").lower()
    return env_agent

DEFAULT_AI_AGENT = load_default_ai_agent()

def load_api_key(key_name):
    """
    Load an API key from environment variable or credentials/api_keys.txt file.
    
    Args:
        key_name (str): The name of the API key to load (e.g., "GEMINI_API_KEY")
    
    Returns:
        str: The API key, or an empty string if not found.
    """
    # First try to load from file-based storage
    credentials_path = os.path.join(os.path.dirname(__file__), "credentials", "api_keys.txt")
    if os.path.exists(credentials_path):
        try:
            with open(credentials_path, "r") as f:
                for line in f:
                    line = line.strip()
                    # Skip comments and empty lines
                    if line.startswith("#") or not line or "=" not in line:
                        continue
                    # Parse key=value pairs
                    key, value = line.split("=", 1)
                    if key.strip() == key_name and value.strip():
                        return value.strip()
        except Exception as e:
            print(f"Warning: Error reading API keys file: {e}")
    
    # Fall back to environment variable if not found in file
    env_key = os.getenv(key_name)
    if env_key:
        return env_key
    
    return ""

def load_gemini_api_key():
    """
    Legacy function for backward compatibility.
    Now uses the centralized load_api_key function.
    """
    return load_api_key("GEMINI_API_KEY")

# Grok API
GROK_API_KEY = load_api_key("GROK_API_KEY")
GROK_BASE_URL = os.getenv("GROK_BASE_URL", "https://api.x.ai/v1")
GROK_MODEL = os.getenv("GROK_MODEL", "grok-1")

# Gemini API
GEMINI_API_KEY = load_api_key("GEMINI_API_KEY")
GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")

# Deepseek API
DEEPSEEK_API_KEY = load_api_key("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# OpenAI API
OPENAI_API_KEY = load_api_key("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
 
# Qwen API
QWEN_API_KEY = load_api_key("DASHSCOPE_API_KEY")
QWEN_BASE_URL = os.getenv("QWEN_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen-max")
 
# Z.ai API (OpenAI-compatible)
ZAI_API_KEY = load_api_key("ZAI_API_KEY")
# z.ai uses an OpenAI-compatible endpoint; adjust base URL if needed
ZAI_BASE_URL = os.getenv("ZAI_BASE_URL", "https://api.z.ai/api/paas/v4/")
ZAI_MODEL = os.getenv("ZAI_MODEL", "glm-4-32b-0414-128k")

# Claude API (Anthropic)
CLAUDE_API_KEY = load_api_key("CLAUDE_API_KEY")
CLAUDE_BASE_URL = os.getenv("CLAUDE_BASE_URL", "https://api.anthropic.com/v1")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")

# Available models for each AI agent (most recent publicly available models as of late 2025)
AVAILABLE_MODELS = {
    "grok": [
        "grok-3",
        "grok-4",
        "grok-4-fast"
    ],
    "gemini": [
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro",
        "gemini-pro-vision",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-image"
    ],
    "deepseek": [
        "deepseek-chat",
        "deepseek-coder",
        "deepseek-v2.5",
        "deepseek-v3.2-exp"
    ],
    "openai": [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k",
        "gpt-5",
        "gpt-5-nano",
        "gpt-oss-120b",
        "gpt-image-1"
    ],
    "qwen": [
        "qwen-max",
        "qwen-plus",
        "qwen-turbo",
        "qwen-turbo-latest",
        "qwen2.5-72b-instruct",
        "qwen2.5-32b-instruct",
        "qwen3-asr-flash"
    ],
    "zai": [
        "glm-4-32b-0414-128k",
        "glm-4-9b-chat",
        "glm-3-turbo",
        "chatglm3-6b",
        "glm-4.6",
        "glm-4.5v"
    ],
    "claude": [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-4.5-sonnet",
        "claude-4.1-opus"
    ]
}

# File paths
DEFAULT_CSV_FILENAME = "MasterTrackingBoard.csv"
DEFAULT_JOBID_TXT = "A_AA_jobids.txt"

# Parallel processing settings
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "8"))  # Default to 8 workers if not specified

# Other settings
def test_ai_agent(ai_agent, model_override=None):
    """
    Test if an AI agent is properly configured and working.

    Reads model overrides from environment variables at call time and uses a robust
    request strategy that tolerates model-specific parameter names (e.g., max_completion_tokens)
    and unsupported temperature values (omits temperature when model rejects it).
    """
    try:
        from openai import OpenAI
        import json

        ai_agent = ai_agent.lower()

        # Resolve API key, base_url, and model at runtime (respect environment overrides)
        if ai_agent == "grok":
            api_key = load_api_key("GROK_API_KEY")
            base_url = GROK_BASE_URL
            model = model_override or os.getenv("GROK_MODEL", GROK_MODEL).strip()
        elif ai_agent == "gemini":
            api_key = load_api_key("GEMINI_API_KEY")
            base_url = GEMINI_BASE_URL
            model = model_override or os.getenv("GEMINI_MODEL", GEMINI_MODEL).strip()
        elif ai_agent == "deepseek":
            api_key = load_api_key("DEEPSEEK_API_KEY")
            base_url = DEEPSEEK_BASE_URL
            model = model_override or os.getenv("DEEPSEEK_MODEL", DEEPSEEK_MODEL).strip()
        elif ai_agent == "openai":
            api_key = load_api_key("OPENAI_API_KEY")
            base_url = OPENAI_BASE_URL
            # Read OPENAI_MODEL from environment to pick up runtime changes
            model = model_override or os.getenv("OPENAI_MODEL", OPENAI_MODEL).strip()
        elif ai_agent == "qwen":
            api_key = load_api_key("DASHSCOPE_API_KEY")
            base_url = QWEN_BASE_URL
            model = model_override or os.getenv("QWEN_MODEL", QWEN_MODEL).strip()
        elif ai_agent == "zai":
            api_key = load_api_key("ZAI_API_KEY")
            base_url = ZAI_BASE_URL
            model = model_override or os.getenv("ZAI_MODEL", ZAI_MODEL).strip()
        elif ai_agent == "claude":
            api_key = load_api_key("CLAUDE_API_KEY")
            base_url = CLAUDE_BASE_URL
            model = model_override or os.getenv("CLAUDE_MODEL", CLAUDE_MODEL).strip()
        else:
            return False, f"Unknown AI agent: {ai_agent}"

        # Check API key presence
        if not api_key:
            return False, f"No API key found for {ai_agent.upper()}. Please add it to credentials/api_keys.txt or set the {ai_agent.upper()}_API_KEY environment variable."

        client = OpenAI(api_key=api_key, base_url=base_url)

        # Build a minimal test prompt
        test_prompt = "Say hello"
        messages = [
            {"role": "system", "content": "You are a helpful AI."},
            {"role": "user", "content": test_prompt}
        ]

        # Check if model is GPT-5 variant
        if model and "gpt-5" in model.lower():
            print(f"[DEBUG] Testing GPT-5 model: {model}, sending without parameters")
            try:
                # For GPT-5 models, send only basic prompt without any parameters
                response = client.chat.completions.create(
                    model=model,
                    messages=messages
                )
            except Exception as gpt5_e:
                print(f"[DEBUG] GPT-5 test failed: {gpt5_e}")
                raise
        else:
            # For other models, try optimal parameters first
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_completion_tokens=10,
                    top_p=1.0,
                    frequency_penalty=0,
                    presence_penalty=0
                )
            except Exception as inner_e:
                inner_err = str(inner_e).lower()
            # If gpt-5-mini parameters fail, try legacy parameters
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=10,
                    temperature=0
                )
            except Exception as inner2_e:
                inner2_err = str(inner2_e).lower()
                # If max_tokens unsupported, try max_completion_tokens
                if "unsupported parameter" in inner2_err and "max_tokens" in inner2_err:
                    try:
                        response = client.chat.completions.create(
                            model=model,
                            messages=messages,
                            max_completion_tokens=10,
                            temperature=0
                        )
                    except Exception as inner3_e:
                        inner3_err = str(inner3_e).lower()
                        # If temperature value unsupported, retry without temperature
                        if "unsupported value" in inner3_err and "temperature" in inner3_err:
                            response = client.chat.completions.create(
                                model=model,
                                messages=messages,
                                max_completion_tokens=10
                            )
                        else:
                            raise
                # If temperature value itself is unsupported, retry without temperature
                elif "unsupported value" in inner2_err and "temperature" in inner2_err:
                    response = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        max_tokens=10
                    )
                else:
                    raise

        # Extract response text robustly
        response_text = ""
        try:
            response_text = response.choices[0].message.content.strip()
        except Exception:
            try:
                response_text = getattr(response.choices[0], "text", "").strip()
            except Exception:
                response_text = str(response)

        if "TEST_SUCCESS" in response_text:
            return True, f"{ai_agent.upper()} is working correctly! Model: {model} | Response: {response_text}"
        else:
            return True, f"{ai_agent.upper()} is working correctly! Model: {model} | Response: {response_text[:50]}{'...' if len(response_text) > 50 else ''}"

    except Exception as e:
        error_msg = str(e)
        low = error_msg.lower()
        if "api key not valid" in low or "invalid" in low:
            return False, f"{ai_agent.upper()} API key is invalid. Please check your API key in credentials/api_keys.txt"
        elif "unauthorized" in low:
            return False, f"{ai_agent.upper()} API key is unauthorized. Please verify your API key has the correct permissions."
        elif "model not found" in low or "404" in low:
            if ai_agent == "zai":
                return False, f"{ai_agent.upper()} model '{model}' not found. Try 'GLM-4-32B-0414-128K' (case-sensitive) or verify availability."
            return False, f"{ai_agent.upper()} model '{model}' not found. Please check the model name and your account access."
        else:
            return False, f"{ai_agent.upper()} test failed: {error_msg}"

def get_env(key, default=None):
    """
    Get an environment variable with a default fallback value.
    
    Args:
        key (str): The name of the environment variable to retrieve
        default (Any): The default value to return if the environment variable is not set
        
    Returns:
        Any: The value of the environment variable, or the default value if not found
    """
    return os.getenv(key, default)
