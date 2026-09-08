from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "trinetra-pulse"
    app_env: str = "development"
    app_debug: bool = True
    app_secret_key: str = "change-me-in-production"

    # --- CORS (Phase 14.3) ---------------------------------------------------
    # Production must NOT use allow_origins=["*"]. FRONTEND_URL is the deployed
    # Render frontend origin; CORS_ORIGINS may carry additional comma-separated
    # origins (e.g. same-origin browser cascades). Development origins
    # (localhost:3000/3001) are appended in app_env != production so the demo
    # keeps working out of the box.
    frontend_url: str = ""
    cors_origins: str = ""

    # --- Evidence payload storage (Phase 14.3) --------------------------------
    # Metadata always lives in PostgreSQL (evidence table). The payload bytes go
    # to EvidenceStorage. Render service filesystems are ephemeral: the default
    # local directory is for development only and is NOT persistent in
    # production. Configure a production object store when available.
    evidence_storage_dir: str = ".evidence"
    evidence_storage_provider: str = "filesystem"
    evidence_storage_bucket: str = ""
    evidence_storage_region: str = ""
    evidence_storage_endpoint: str = ""
    evidence_storage_access_key_id: str = ""
    evidence_storage_secret_access_key: str = ""
    evidence_storage_prefix: str = "evidence"
    evidence_max_upload_bytes: int = 200 * 1024 * 1024

    # Direct DATABASE_URL override (e.g. Postgres in production, SQLite in
    # tests). When unset, falls back to the POSTGRES_* components below.
    database_url_override: str = Field(default="", alias="DATABASE_URL")

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "trinetra_pulse"
    postgres_user: str = "trinetra"
    postgres_password: str = "trinetra_dev_password"

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "neo4j_dev_password"

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = "redis_dev_password"

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    ml_service_url: str = "http://localhost:8001"

    # AI investigation assistant (Phase 10)
    ai_provider: str = "mock"  # "mock" | "openai" (OpenAI-compatible)
    ai_model: str = "trinetra-deterministic-local-v0"
    ai_api_key: str = ""  # server-side only; never shipped to the client
    ai_base_url: str = "https://api.openai.com/v1"

    # Provider credential encryption (Phase 23). Master secret used to derive
    # (HKDF-SHA256) the AES-256-GCM key that encrypts AI/media provider API
    # credentials at rest (see app/core/secret_crypto.py). Server-side only.
    # APP_ENV=production refuses to boot without a real value.
    provider_encryption_key: str = ""

    @property
    def cors_allow_origins(self) -> list[str]:
        """Origins the CORS middleware will allow.

        Combines ``FRONTEND_URL`` and any comma-separated ``CORS_ORIGINS``.
        Localhost dev origins are always included so the SIH demo keeps working;
        production callers should pin ``FRONTEND_URL`` to the deployed origin.
        This never returns ``["*"]``.
        """
        origins: list[str] = []
        for raw in (self.frontend_url, self.cors_origins):
            for part in (raw or "").split(","):
                part = part.strip()
                if part and part not in origins:
                    origins.append(part)
        if not origins:
            origins = ["http://localhost:3000", "http://localhost:3001"]
        return origins

    # Async engine pool sizing. Render free-tier PostgreSQL allows a small
    # number of connections, so the pool must stay conservative (and the
    # values must be configurable via DB_POOL_SIZE / DB_MAX_OVERFLOW).
    db_pool_size: int = 5
    db_max_overflow: int = 5

    @property
    def database_url(self) -> str:
        # Explicit DATABASE_URL wins (Postgres in production, SQLite in tests).
        if self.database_url_override:
            url = self.database_url_override
            if url.startswith("postgres://"):
                url = "postgresql://" + url.split("://", 1)[1]
            # Render's managed-DB connection string is a bare postgresql://
            # URL; the async engine requires the asyncpg driver on the scheme.
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        # Bare postgres:// for Alembic's synchronous engine.
        if self.database_url_override:
            url = self.database_url_override
            if url.startswith("sqlite+aiosqlite://"):
                return "sqlite://" + url.split("sqlite+aiosqlite://", 1)[1]
            if url.startswith("postgresql+"):
                return "postgresql://" + url.split("://", 1)[1]
            if url.startswith("postgres://"):
                return "postgresql://" + url.split("://", 1)[1]
            return url
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    def enforce_production_defaults(self) -> None:
        if self.app_env != "production":
            return
        # Server-critical secrets MUST be overridden in production. These are
        # the only values the service actually trusts at every startup.
        defaults = {
            "app_secret_key": "change-me-in-production",
            "jwt_secret_key": "change-me-in-production",
        }
        # The Postgres password only matters when the component-based
        # POSTGRES_* URL is used (no explicit DATABASE_URL). In production the
        # Render Blueprint injects DATABASE_URL from the managed database, so a
        # default Postgres password is harmless and must NOT block startup.
        if not self.database_url_override:
            defaults["postgres_password"] = "trinetra_dev_password"
        active = [name for name, value in defaults.items() if getattr(self, name, None) == value]
        if active:
            raise RuntimeError(
                "Refusing to start in production: default secret(s) still set for "
                + ", ".join(active)
                + ". Provide real values via environment variables."
            )
        if not self.frontend_url.strip():
            raise RuntimeError(
                "Refusing to start in production: FRONTEND_URL must identify "
                "the deployed web origin."
            )
        configured_origins = self.cors_allow_origins
        if any(origin == "*" for origin in configured_origins):
            raise RuntimeError("Refusing to start in production: wildcard CORS is not allowed.")
        if any("localhost" in origin or "127.0.0.1" in origin for origin in configured_origins):
            raise RuntimeError(
                "Refusing to start in production: localhost CORS origins are not allowed."
            )
        provider = self.evidence_storage_provider.strip().lower()
        if provider != "s3":
            raise RuntimeError(
                "Refusing to start in production: EVIDENCE_STORAGE_PROVIDER must be 's3'."
            )
        if not self.evidence_storage_bucket.strip():
            raise RuntimeError(
                "Refusing to start in production: EVIDENCE_STORAGE_BUCKET is required."
            )
        if not self.provider_encryption_key.strip():
            raise RuntimeError(
                "Refusing to start in production: PROVIDER_ENCRYPTION_KEY is required "
                "to encrypt AI/media provider API credentials."
            )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "populate_by_name": True,
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.enforce_production_defaults()
    return settings
