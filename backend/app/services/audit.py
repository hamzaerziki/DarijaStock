from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import AuditEvent, User


def record(
    db: Session,
    *,
    action: str,
    actor: User | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
    note: str | None = None,
) -> AuditEvent:
    """Append an audit event. Caller controls the transaction/commit."""
    event = AuditEvent(
        actor_id=actor.id if actor else None,
        actor_name=actor.full_name if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
        note=note,
    )
    db.add(event)
    return event
