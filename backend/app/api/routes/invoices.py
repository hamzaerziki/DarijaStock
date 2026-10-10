from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_any_permissions, require_permissions
from app.core.permissions import Permission
from app.models import Invoice, Order, User
from app.schemas.common import Page
from app.schemas.invoice import CancelPayload, InvoiceOut
from app.services import audit, invoices

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=Page[InvoiceOut])
def list_invoices(
    q: str | None = None,
    status_filter: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_invoice_history)),
):
    items, total = invoices.list_invoices(
        db, q=q, status_filter=status_filter, offset=(page - 1) * page_size, limit=page_size
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_invoice_history)),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Facture introuvable / الفاتورة ماموجوداش")
    return invoice


@router.post("/from-order/{order_id}", response_model=InvoiceOut)
def create_from_order(
    order_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.prepare_invoice_drafts)),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order introuvable")
    invoice = invoices.create_invoice_from_order(db, order, actor)
    audit.record(db, action="invoice.drafted", actor=actor, entity_type="invoice", entity_id=invoice.id,
                 details={"order_id": order.id})
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/issue", response_model=InvoiceOut)
def issue_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.issue_invoices)),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Facture introuvable")
    invoices.issue_invoice(db, invoice, actor)
    audit.record(db, action="invoice.issued", actor=actor, entity_type="invoice", entity_id=invoice.id,
                 details={"number": invoice.number, "total": str(invoice.total)})
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/cancel", response_model=InvoiceOut)
def cancel_invoice(
    invoice_id: int,
    payload: CancelPayload | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.issue_invoices, Permission.manage_orders)),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Facture introuvable")
    reason = payload.reason if payload else None
    invoices.cancel_invoice(db, invoice, actor, reason=reason)
    audit.record(db, action="invoice.cancelled", actor=actor, entity_type="invoice", entity_id=invoice.id,
                 details={"reason": reason})
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}/html", response_class=HTMLResponse)
def invoice_html(
    invoice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_invoice_history)),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Facture introuvable")
    return HTMLResponse(content=invoices.render_invoice_html(invoice))