from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DocumentCounter


def _next_value(db: Session, kind: str, period: str) -> int:
    """Atomically increment and return the next counter value.

    Uses a row lock so concurrent requests cannot produce duplicate numbers.
    The caller must already be inside a transaction.
    """
    stmt = select(DocumentCounter).where(
        DocumentCounter.kind == kind, DocumentCounter.period == period
    ).with_for_update()
    counter = db.scalar(stmt)
    if counter is None:
        # Try to create; if a concurrent insert wins, fall back to locked read.
        counter = DocumentCounter(kind=kind, period=period, last_value=0)
        db.add(counter)
        try:
            db.flush()
        except Exception:
            db.rollback()
            counter = db.scalar(stmt)
            if counter is None:
                raise
    counter.last_value += 1
    db.flush()
    return counter.last_value


def next_order_number(db: Session) -> str:
    period = datetime.now(timezone.utc).strftime("%Y%m")
    value = _next_value(db, "order", period)
    return f"CMD-{period}-{value:05d}"


def next_invoice_number(db: Session, when: date | None = None) -> str:
    when = when or date.today()
    period = str(when.year) if settings.invoice_number_year_reset else "ALL"
    value = _next_value(db, "invoice", period)
    return f"{settings.invoice_number_prefix}-{period}-{value:05d}"
