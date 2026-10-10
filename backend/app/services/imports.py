from __future__ import annotations

import hashlib
import re

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ImportBatch, Order, OrderItem, OrderSource, SourceMessage, User
from app.schemas.import_schemas import (
    ImportBatchIn,
    ImportBatchResult,
    ImportMessageIn,
    MessageImportResult,
)
from app.services import audit, matching, orders, parsing
from app.services.text import normalize


def content_hash(raw_text: str) -> str:
    norm = re.sub(r"\s+", " ", normalize(raw_text))
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()[:40]


def process_batch(db: Session, payload: ImportBatchIn, user: User) -> ImportBatchResult:
    batch = None
    if payload.idempotency_key:
        batch = db.scalar(
            select(ImportBatch).where(ImportBatch.label == f"idem:{payload.idempotency_key}")
        )
        if batch:
            results = [
                MessageImportResult(index=i, message_id=m.id, status=m.status, order_id=m.order_id)
                for i, m in enumerate(batch.messages)
            ]
            return ImportBatchResult(
                batch_id=batch.id,
                total=batch.total_messages,
                processed=batch.processed_messages,
                orders_created=batch.orders_created,
                duplicates=0,
                errors=batch.errors,
                messages=results,
            )

    batch = ImportBatch(
        label=f"idem:{payload.idempotency_key}" if payload.idempotency_key else payload.label,
        status="processing",
        total_messages=len(payload.messages),
        created_by_id=user.id if user else None,
    )
    db.add(batch)
    db.flush()

    results: list[MessageImportResult] = []
    created = 0
    errors = 0
    duplicates = 0

    for idx, msg_in in enumerate(payload.messages):
        result = _process_message(db, batch, msg_in, idx, user)
        results.append(result)
        if result.status == "duplicate":
            duplicates += 1
        elif result.status == "error":
            errors += 1
        elif result.order_id:
            created += 1

    batch.processed_messages = len(payload.messages)
    batch.orders_created = created
    batch.errors = errors
    batch.status = "done"
    db.flush()
    audit.record(
        db,
        action="import_batch.processed",
        actor=user,
        entity_type="import_batch",
        entity_id=batch.id,
        details={
            "total": len(payload.messages),
            "orders_created": created,
            "errors": errors,
            "duplicates": duplicates,
        },
    )
    return ImportBatchResult(
        batch_id=batch.id,
        total=len(payload.messages),
        processed=len(payload.messages),
        orders_created=created,
        duplicates=duplicates,
        errors=errors,
        messages=results,
    )


def _process_message(
    db: Session, batch: ImportBatch, msg: ImportMessageIn, idx: int, user: User
) -> MessageImportResult:
    hsh = content_hash(msg.raw_text)

    dup = db.scalar(select(SourceMessage).where(SourceMessage.content_hash == hsh, SourceMessage.batch_id.isnot(None)))
    if dup:
        order_number = None
        if dup.order_id:
            order = db.get(Order, dup.order_id)
            order_number = order.order_number if order else None
        return MessageImportResult(
            index=idx,
            message_id=dup.id,
            status="duplicate",
            duplicate_of_id=dup.id,
            order_id=dup.order_id,
            order_number=order_number,
        )

    parsed = parsing.parse_message(msg.raw_text)

    # Match each extracted line against the catalog (deterministic).
    index = matching.build_index(db)
    raw_items: list[dict] = []
    for it in parsed["items"]:
        product_text = (it.get("product_text") or it.get("raw_text") or "").strip()
        match = matching.match_text(product_text, index)
        raw_items.append(
            {
                "raw_text": it["raw_text"],
                "product_id": match.product_id,
                "match_status": match.status,
                "match_confidence": round(match.confidence, 2),
                "unit": it.get("unit"),
                "quantity": it.get("quantity"),
                "candidates": [{"product_id": pid, "confidence": round(c, 2)} for pid, c in match.candidates],
            }
        )

    requires_review = parsed["requires_review"] or any(
        it["product_id"] is None or it["match_status"] == "ambiguous" for it in raw_items
    )

    payload_for_order = {
        "customer": parsed["customer"],
        "items": [
            {
                "raw_text": it["raw_text"],
                "product_text": it["product_text"],
                "quantity": it.get("quantity"),
                "unit": it.get("unit"),
            }
            for it in parsed["items"]
        ],
        "delivery_notes": parsed["delivery_notes"],
        "unparsed_lines": parsed["unparsed_lines"],
        "warnings": parsed["warnings"],
        "requires_review": requires_review,
    }

    sm = SourceMessage(
        batch_id=batch.id,
        raw_text=msg.raw_text,
        sender_name=msg.sender_name or parsed["customer"].get("name"),
        sender_phone=msg.sender_phone or parsed["customer"].get("phone"),
        content_hash=hsh,
        parsed_payload=payload_for_order,
        status="parsed",
    )
    db.add(sm)
    db.flush()

    try:
        order, unresolved = orders.create_order_from_import(
            db,
            customer_hint=parsed["customer"],
            raw_items=raw_items,
            source=OrderSource.whatsapp,
            delivery_notes="\n".join(parsed["delivery_notes"]),
            user=user,
            requires_review=requires_review,
            external_hint=hsh,
        )
    except HTTPException as exc:
        sm.status = "error"
        db.flush()
        return MessageImportResult(index=idx, message_id=sm.id, status="error", error=exc.detail)

    sm.order_id = order.id
    sm.status = "order_created"
    db.flush()
    audit.record(
        db,
        action="import.message_order_created",
        actor=user,
        entity_type="order",
        entity_id=order.id,
        details={"source_message_id": sm.id, "batch_id": batch.id},
    )
    return MessageImportResult(
        index=idx,
        message_id=sm.id,
        status="order_created",
        order_id=order.id,
        order_number=order.order_number,
        payload=payload_for_order,
    )