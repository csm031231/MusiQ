import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class DefaultConfig(BaseSettings):
    postgresql_endpoint: str = os.getenv("POSTGRESQL_ENDPOINT", "")
    postgresql_port: int = os.getenv("POSTGRESQL_PORT", "")
    postgresql_table: str = os.getenv("POSTGRESQL_TABLE", "")
    postgresql_user: str = os.getenv("POSTGRESQL_USER", "")
    postgresql_password: str = os.getenv("POSTGRESQL_PASSWORD", "")

    jwt_secret_key: str = os.getenv(
        "JWT_SECRET_KEY",
        "",
    )
    jwt_expire_minutes: int = os.getenv("JWT_TOKEN_EXPIRE_MINUTES", 600)
    api_service_key:str = os.getenv("SERVICE_KEY","")

@lru_cache
def get_config():
    return DefaultConfig()