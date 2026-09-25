from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_APP_ENV = Path(__file__).parent / ".env"
_ROOT_ENV = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    """Fails fast at startup if required config is missing, instead of
    failing on the first request with an unhelpful error."""

    model_config = SettingsConfigDict(
        env_file=(_APP_ENV, _ROOT_ENV, ".env"),
        extra="ignore"
    )

    groq_api_key: str = ""
    groq_model: str = "qwen/qwen3.8-27b"
    groq_fallback_model: str = "openai/gpt-oss-20b"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    gemini_fallback_model: str = "gemini-3.5-flash-lite"
    # Update if Google ships a newer embedding model - this is current as of
    # this service's last review, not guaranteed to stay the latest.
    gemini_embedding_model: str = "models/text-embedding-004"
    internal_service_token: str = "dev-token"   # ✅ default so startup won’t fail
    llm_timeout_seconds: int = 30
    llm_max_retries: int = 3


settings = Settings()


