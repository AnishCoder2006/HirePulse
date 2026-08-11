from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Fails fast at startup if required config is missing, instead of
    failing on the first request with an unhelpful error."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    # Update if Google ships a newer embedding model - this is current as of
    # this service's last review, not guaranteed to stay the latest.
    gemini_embedding_model: str = "models/text-embedding-004"
    internal_service_token: str = "dev-token"   # ✅ default so startup won’t fail
    llm_timeout_seconds: int = 30
    llm_max_retries: int = 3


settings = Settings()
