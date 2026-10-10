from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables.

    All values have safe development defaults. Secrets must be supplied
    through environment variables in production (see .env.example).
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Core ---
    app_name: str = "DarijaStock"
    environment: str = "development"
    debug: bool = False

    # --- Database ---
    database_url: str = "postgresql+psycopg://darjastock:darjastock@localhost:5433/darjastock"

    # --- Auth / security ---
    secret_key: str = "change-me-in-production-please-use-a-long-random-value"
    access_token_expire_minutes: int = 60 * 12
    jwt_algorithm: str = "HS256"

    # --- CORS ---
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost"

    # --- Business configuration (jurisdiction dependent, configurable) ---
    # VAT / TVA rate applied by default. Legal rates MUST be verified per business.
    default_tax_rate: str = "0.00"
    currency: str = "MAD"
    # Stock policy: reserve stock automatically when an order is confirmed.
    reserve_on_confirm: bool = True
    # Allow stock balances to go negative. Off by default for safety.
    allow_negative_stock: bool = False
    invoice_number_prefix: str = "FA"
    invoice_number_year_reset: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
