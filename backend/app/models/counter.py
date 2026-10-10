from __future__ import annotations

from sqlalchemy import Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class DocumentCounter(Base, TimestampMixin):
    """Concurrency-safe counter for document numbers (orders, invoices)."""

    __tablename__ = "document_counters"
    __table_args__ = (UniqueConstraint("kind", "period", name="uq_document_counter"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    last_value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
