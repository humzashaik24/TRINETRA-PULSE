"""Persisted, investigation-scoped network analytics snapshots."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class NetworkAnalyticsSnapshot(BaseModel):
    """The latest deterministic analytics result for one investigation."""

    __tablename__ = "network_analytics_snapshots"
    __table_args__ = (
        UniqueConstraint("investigation_id", name="uq_network_analytics_investigation"),
    )

    investigation_id = Column(
        Uuid,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    algorithm_version = Column(String(32), nullable=False)
    computed_at = Column(DateTime(timezone=True), nullable=False)
    entity_count = Column(Integer, nullable=False)
    relationship_count = Column(Integer, nullable=False)
    payload = Column(JSONB, nullable=False, default=dict)

    investigation = relationship("Investigation", back_populates="analytics_snapshots")
