from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    api_title: str = "StrategicPlan API"
    api_version: str = "1.0.0"
    cors_origins: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        origins=[x.strip() for x in self.cors_origins.split(",") if x.strip()]
        required=["http://localhost:5173","https://k12matrix-strategicplan.vercel.app"]
        return list(dict.fromkeys(origins+required))

@lru_cache
def get_settings() -> Settings:
    return Settings()
