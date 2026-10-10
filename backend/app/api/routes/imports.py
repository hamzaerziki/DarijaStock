from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permissions
from app.core.permissions import Permission
from app.models import ImportBatch, Order, SourceMessage, User
from app.schemas.import_schemas import ImportBatchIn, ImportBatchResult, MessageImportResult
from app.services import imports

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/messages", response_model=ImportBatchResult)
def import_messages(
    payload: ImportBatchIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.import_messages)),
):
    if len(payload.messages) > 200:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bezzaf messages (max 200) / كثر من 200 رسالة")
    try:
        result = imports.process_batch(db, payload, actor)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return result


@router.get("/batches", response_model=list[dict])
def list_batches(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.import_messages)),
):
    batches = list(db.scalars(select(ImportBatch).order_by(ImportBatch.id.desc()).limit(50)))
    return [
        {
            "id": b.id, "label": b.label, "status": b.status,
            "total_messages": b.total_messages, "processed_messages": b.processed_messages,
            "orders_created": b.orders_created, "errors": b.errors,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in batches
    ]


@router.get("/batches/{batch_id}", response_model=list[MessageImportResult])
def batch_detail(
    batch_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.import_messages)),
):
    batch = db.get(ImportBatch, batch_id)
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch introuvable")
    results = []
    for i, m in enumerate(batch.messages):
        results.append(
            MessageImportResult(
                index=i, message_id=m.id, status=m.status, order_id=m.order_id,
                duplicate_of_id=m.duplicate_of_id,
                payload=m.parsed_payload,
            )
        )
    return results


@router.get("/messages", response_model=list[dict])
def list_messages(
    batch_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.import_messages)),
):
    stmt = select(SourceMessage).order_by(SourceMessage.id.desc()).limit(100)
    if batch_id:
        stmt = stmt.where(SourceMessage.batch_id == batch_id)
    messages = list(db.scalars(stmt))
    order_ids = [m.order_id for m in messages if m.order_id]
    orders = {o.id: o for o in db.scalars(select(Order).where(Order.id.in_(order_ids)))} if order_ids else {}
    return [
        {
            "id": m.id, "batch_id": m.batch_id, "raw_text": m.raw_text,
            "sender_name": m.sender_name, "sender_phone": m.sender_phone,
            "status": m.status, "parsed_payload": m.parsed_payload,
            "order_id": m.order_id,
            "order_number": orders[m.order_id].order_number if m.order_id in orders else None,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]