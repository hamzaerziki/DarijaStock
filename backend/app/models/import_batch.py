from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ImportBatch(Base, TimestampMixin):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="processing", index=True)
    total_messages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_messages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    orders_created: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    errors: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    messages: Mapped[list[SourceMessage]] = relationship(
        back_populates="batch", cascade="all, delete-orphan", lazy="selectin"
    )


class SourceMessage(Base, TimestampMixin):
    __tablename__ = "source_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int | None] = mapped_column(
        ForeignKey("import_batches.id", ondelete="CASCADE"), index=True
    )
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    sender_name: Mapped[str | None] = mapped_column(String(255))
    sender_phone: Mapped[str | None] = mapped_column(String(50))
    parsed_payload: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)
    # Hash of normalized raw text for duplicate detection.
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), index=True)
    duplicate_of_id: Mapped[int | None] = mapped_column(
        ForeignKey("source_messages.id", ondelete="SET NULL")
    )

    batch: Mapped[ImportBatch] = relationship(back_populates="messages")
