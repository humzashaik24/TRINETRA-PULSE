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

    # --- Identity (Phase 22) --------------------------------------------------
    # The SIH demonstration API maps an ``X-User-Id`` header to an identity.
    # In production the header is NOT trusted as an arbitrary identity: only a
    # request matching this server-configured actor is accepted. Defaults to the
    # documented demonstration inspector; override with AUTH_ACTOR_EMAIL if a
    # real account must be pinned. Server-side only; never a NEXT_PUBLIC_* value.
    auth_actor_email: str = "inspector.mehta@trinetra.local"

    ml_service_url: str = "http://localhost:8001"

    # AI investigation assistant (Phase 10)
    ai_provider: str = "mock"  # "mock" | "openai" (OpenAI-compatible)
    ai_model: str = "trinetra-deterministic-local-v0"
    ai_api_key: str = ""  # server-side only; never shipped to the client
    ai_base_url: str = "https://api.openai.com/v1"

    # --- Blockchain evidence integrity (Phase 21) -----------------------------
    # Server-side ONLY. Never expose these as NEXT_PUBLIC_* values; the frontend
    # learns network/status from the API, never from client-side secrets.
    # ``mock`` is the default: a deterministic local registry clearly labelled
    # MOCK BLOCKCHAIN. ``web3`` enables a real EVM testnet anchor registry.
    blockchain_provider: str = "mock"  # "mock" | "web3"
    blockchain_network: str = ""
    blockchain_rpc_url: str = ""
    blockchain_private_key: str = ""
    blockchain_contract_address: str = ""
    blockchain_chain_id: int | None = None
    blockchain_confirmations: int = 1

    @property
    def cors_allow_origins(self) -> list[str]:
        """Origins the CORS middleware will allow.

        Combines ``FRONTEND_URL`` and any comma-separated ``CORS_ORIGINS``.
        Localhost dev origins are included when nothing is configured so the SIH
        demo keeps working out of the box in development.

        Production is strict (Phase 22):
        - ``FRONTEND_URL="*"`` or ``CORS_ORIGINS="*"`` is rejected (never ``*``).
        - localhost origins are rejected in production (no dev-origin fallback).
        - an empty ``FRONTEND_URL`` in production is rejected (the deployment
          must pin the deployed frontend origin explicitly).

        This property raises ``RuntimeError`` for unsafe production values so a
        misconfigured production service refuses to boot rather than silently
        weakening CORS.
        """
        if self.app_env == "production":
            raw = ",".join(
                p for p in (self.frontend_url or "", self.cors_origins or "") if p.strip()
            )
            parts = [p.strip() for p in raw.split(",") if p.strip()]
            if "*" in parts:
                raise RuntimeError(
                    "Refusing to start in production: CORS wildcard '*' is not "
                    "allowed. Set FRONTEND_URL to the deployed frontend origin."
                )
            if not parts:
                raise RuntimeError(
                    "Refusing to start in production: FRONTEND_URL is not set. "
                    "Pin it to the deployed frontend origin (e.g. "
                    "https://trinetra-pulse-web.onrender.com)."
                )
            localhost = [
                p for p in parts if "://localhost:" in p or "://127.0.0.1:" in p
            ]
            if localhost:
                raise RuntimeError(
                    "Refusing to start in production: localhost CORS origin(s) "
                    "are not allowed: " + ", ".join(localhost)
                )
            return parts
        origins: list[str] = []
        for raw_ in (self.frontend_url, self.cors_origins):
            for part in (raw_ or "").split(","):
                part = part.strip()
                if part and part not in origins:
                    origins.append(part)
        if not origins:
            origins = ["http://localhost:3000", "http://localhost:3001"]
        return origins

    @property
    def database_url(self) -> str:
        # Explicit DATABASE_URL wins (Postgres in production, SQLite in tests).
        if self.database_url_override:
            return self.database_url_override
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        # Bare postgres:// for Alembic's synchronous engine.
        if self.database_url_override:
            url = self.database_url_override
            if url.startswith("postgresql+"):
                return "postgresql://" + url.split("://", 1)[1]
            if url.startswith("sqlite+aiosqlite://"):
                return "sqlite://" + url.split("sqlite+aiosqlite://", 1)[1]
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
        active = [
            name
            for name, value in defaults.items()
            if getattr(self, name, None) == value
        ]
        if active:
            raise RuntimeError(
                "Refusing to start in production: default secret(s) still set for "
                + ", ".join(active)
                + ". Provide real values via environment variables."
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

