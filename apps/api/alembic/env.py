from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

from app.core.config import get_settings
from app.db.types import JSONB

# Importing the models package registers all table metadata on Base.metadata.
from app.models import (  # noqa: F401
    Case,
    DataProvenance,
    Dataset,
    DataSource,
    Entity,
    EntityResolution,
    Evidence,
    EvidenceBlockchainAnchor,
    Incident,
    IngestionJob,
    Investigation,
    InvestigationEvent,
    InvestigationEvidence,
    InvestigationFinding,
    InvestigationNote,
    Relationship,
)
from app.models.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return get_settings().database_url_sync


def render_item(type_, obj, autogen_context):
    """Render portable JSONB as ``JSONB()`` so future revisions import cleanly."""
    if type_ == "type" and isinstance(obj, JSONB):
        autogen_context.imports.add("from app.db.types import JSONB")
        return "JSONB()"
    return False


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url") or get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_item=render_item,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_item=render_item,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
