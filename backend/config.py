import os

# AI Agent Configuration
DEFAULT_AI_AGENT = os.getenv("DEFAULT_AI_AGENT", "openai")

# Available models for each AI agent
AVAILABLE_MODELS = {
    "openai": [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k"
    ],
    "grok": [
        "grok-1",
        "grok-2"
    ],
    "gemini": [
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro",
        "gemini-pro-vision"
    ],
    "deepseek": [
        "deepseek-chat",
        "deepseek-coder",
        "deepseek-v2.5"
    ],
    "qwen": [
        "qwen-max",
        "qwen-plus",
        "qwen-turbo",
        "qwen2.5-72b-instruct",
        "qwen2.5-32b-instruct"
    ],
    "zai": [
        "zai-chat"
    ]
}

# OpenAI Configuration
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

# Other AI Provider Configuration
GROK_API_KEY = os.getenv("GROK_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
QWEN_API_KEY = os.getenv("QWEN_API_KEY")
ZAI_API_KEY = os.getenv("ZAI_API_KEY")
