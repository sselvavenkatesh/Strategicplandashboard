from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    database_url: str = ""
    district_schema: str = Field(default="public", pattern=r"^(public|district_[a-z0-9_]+)$")
    public_app_origin: str = ""
    public_app_base_path: str = "/strategic-plan/demo"
    proxy_shared_key: str = ""
    abuse_controls_enabled: bool = False
    data_writes_enabled: bool = False
    preview_dataset_enabled: bool = True
    demo_targets: bool = True
    api_title: str = "StrategicPlan API"
    api_version: str = "1.0.0"
    cors_origins: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        if self.public_app_origin:
            return [self.public_app_origin]
        origins=[x.strip() for x in self.cors_origins.split(",") if x.strip()]
        required=["http://localhost:5173","https://k12matrix-strategicplan.vercel.app","https://k12matrix-strategicplan.netlify.app","https://k12matrix.com"]
        return list(dict.fromkeys(origins+required))

@lru_cache
def get_settings() -> Settings:
    return Settings()
