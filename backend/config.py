import os

# AI Agent Configuration
DEFAULT_AI_AGENT = os.getenv("DEFAULT_AI_AGENT", "openai")

# Available models for each AI agent
AVAILABLE_MODELS = {
    "openai": [
        "gpt-5",
        "gpt-5-mini",
        "gpt-5-nano",
        "gpt-5-chat-latest",
        "gpt-4",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k"
    ],
    "grok": [
        "grok-beta",
        "grok-2",
        "grok-4-fast-reasoning"
    ],
    "gemini": [
        "gemini-pro",
        "gemini-pro-vision"
    ],
    "deepseek": [
        "deepseek-chat",
        "deepseek-coder"
    ],
    "qwen": [
        "qwen-turbo",
        "qwen-plus",
        "qwen-max"
    ],
    "zai": [
        "zai-chat"
    ]
}

# OpenAI Configuration
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

# Other AI Provider Configuration
GROK_API_KEY = os.getenv("GROK_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
QWEN_API_KEY = os.getenv("QWEN_API_KEY")
ZAI_API_KEY = os.getenv("ZAI_API_KEY")
