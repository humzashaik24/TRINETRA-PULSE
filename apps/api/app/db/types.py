"""Portable SQLAlchemy column types.

Trinetra Pulse targets PostgreSQL in production (JSONB plus native UUID), but
the identical models must run against SQLite for fast, dependency-free
integration tests. These helpers keep the column type identical across both
backends.

- ``Uuid``: native ``UUID`` on PostgreSQL, ``CHAR(32)`` on SQLite.
- ``JSONB``: real ``JSONB`` on PostgreSQL, ``JSON`` elsewhere.
"""

from sqlalchemy import JSON as _GenericJson  # noqa: N811
from sqlalchemy import Uuid as _GenericUuid  # noqa: N811
from sqlalchemy.dialects.postgresql import JSONB as _PgJsonb  # noqa: N811
from sqlalchemy.types import TypeDecorator

Uuid = _GenericUuid


class JSONB(TypeDecorator):
    """A JSON/JSONB column: true ``JSONB`` on PostgreSQL, ``JSON`` elsewhere."""

    cache_ok = True
    impl = _GenericJson

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(_PgJsonb())
        return dialect.type_descriptor(_GenericJson())

    def process_bind_param(self, value, dialect):
        return value

    def process_result_value(self, value, dialect):
        return value
