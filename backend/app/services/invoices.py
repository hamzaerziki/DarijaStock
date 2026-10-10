from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    Customer,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    Order,
    OrderStatus,
    User,
)
from app.services.money import money
from app.services.numbering import next_invoice_number


def _snapshot_customer(invoice: Invoice, customer: Customer | None) -> None:
    if customer is None:
        invoice.customer_name = invoice.customer_name or "Client divers"
        return
    invoice.customer_name = customer.name
    invoice.customer_address = customer.address
    invoice.customer_tax_id = customer.tax_id
    invoice.customer_phone = customer.phone


def create_invoice_from_order(db: Session, order: Order, user: User | None) -> Invoice:
    if order.status in (OrderStatus.new, OrderStatus.needs_review):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Order khass tkoun confirmée 9bel lfacture / خاص الطلبية تكون مؤكدة قبل الفاتورة",
        )
    existing = db.scalar(
        select(Invoice).where(Invoice.order_id == order.id, Invoice.status != InvoiceStatus.cancelled)
    )
    if existing:
        return existing

    invoice = Invoice(
        order_id=order.id,
        customer_id=order.customer_id,
        status=InvoiceStatus.draft,
        currency=settings.currency,
        subtotal=money(order.subtotal),
        discount_total=money(order.discount_total),
        tax_total=money(order.tax_total),
        total=money(order.total),
        created_by_id=user.id if user else None,
    )
    _snapshot_customer(invoice, order.customer)
    db.add(invoice)
    db.flush()

    for item in order.items:
        product = item.product
        invoice.items.append(
            InvoiceItem(
                invoice_id=invoice.id,
                product_id=item.product_id,
                sku=product.sku if product else None,
                description=product.name if product else (item.raw_text or "Article"),
                unit_code=item.unit_code or (product.base_unit if product else None),
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate,
                discount=item.discount,
                line_total=item.line_total,
            )
        )
    db.flush()
    return invoice


def issue_invoice(db: Session, invoice: Invoice, user: User | None) -> Invoice:
    if invoice.status == InvoiceStatus.issued:
        return invoice
    if invoice.status == InvoiceStatus.cancelled:
        raise HTTPException(status.HTTP_409_CONFLICT, "Facture annulée / الفاتورة ملغاة")
    if not invoice.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Facture khawia / الفاتورة خاوية")

    # Recompute totals on the backend (never trust stored/client values blindly).
    subtotal = sum((Decimal(i.line_total) for i in invoice.items), Decimal("0"))
    discount_total = sum((Decimal(i.discount) for i in invoice.items), Decimal("0"))
    tax_total = sum(
        (money(Decimal(i.line_total) * Decimal(i.tax_rate) / Decimal("100")) for i in invoice.items),
        Decimal("0"),
    )
    invoice.subtotal = money(subtotal)
    invoice.discount_total = money(discount_total)
    invoice.tax_total = money(tax_total)
    invoice.total = money(invoice.subtotal + invoice.tax_total)

    invoice.number = next_invoice_number(db)
    invoice.issue_date = date.today()
    invoice.status = InvoiceStatus.issued
    invoice.issued_at = datetime.now(timezone.utc)
    invoice.issued_by_id = user.id if user else None
    db.flush()
    return invoice


def cancel_invoice(db: Session, invoice: Invoice, user: User | None, reason: str | None = None) -> Invoice:
    if invoice.status == InvoiceStatus.cancelled:
        return invoice
    invoice.status = InvoiceStatus.cancelled
    invoice.cancelled_at = datetime.now(timezone.utc)
    invoice.cancel_reason = reason
    db.flush()
    return invoice


def list_invoices(
    db: Session,
    *,
    q: str | None = None,
    status_filter: str | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Invoice], int]:
    stmt = select(Invoice)
    count_stmt = select(func.count()).select_from(Invoice)
    conditions = []
    if q:
        like = f"%{q}%"
        conditions.append(or_(Invoice.number.ilike(like), Invoice.customer_name.ilike(like)))
    if status_filter:
        conditions.append(Invoice.status == status_filter)
    for cond in conditions:
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)
    stmt = stmt.order_by(Invoice.id.desc()).offset(offset).limit(limit)
    items = list(db.scalars(stmt).unique())
    total = db.scalar(count_stmt) or 0
    return items, total


def render_invoice_html(invoice: Invoice) -> str:
    """Render a printable invoice. Used for HTML preview and PDF generation."""
    rows = []
    for it in invoice.items:
        rows.append(
            f"""<tr>
              <td>{it.description}{f' <span class="sku">({it.sku})</span>' if it.sku else ''}</td>
              <td class="num">{it.quantity} {it.unit_code or ''}</td>
              <td class="num">{it.unit_price}</td>
              <td class="num">{it.tax_rate}%</td>
              <td class="num">{it.line_total}</td>
            </tr>"""
        )
    status_label = {"draft": "Brouillon", "issued": "Émise", "cancelled": "Annulée"}.get(invoice.status, invoice.status)
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>Facture {invoice.number or 'Brouillon'}</title>
<style>
  body {{ font-family: 'Segoe UI', Tahoma, sans-serif; color:#0f172a; margin:36px; }}
  .head {{ display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0f766e; padding-bottom:16px; }}
  .brand {{ font-size:24px; font-weight:800; color:#0f766e; }}
  .muted {{ color:#64748b; font-size:12px; }}
  table {{ width:100%; border-collapse:collapse; margin-top:24px; }}
  th, td {{ border-bottom:1px solid #e2e8f0; padding:10px 8px; font-size:13px; text-align:right; }}
  th {{ background:#f1f5f9; }}
  .num {{ text-align:center; }}
  .sku {{ color:#64748b; font-size:11px; }}
  .totals {{ margin-top:18px; width:320px; margin-inline-start:auto; }}
  .totals td {{ border:none; padding:6px 8px; }}
  .totals .grand {{ font-weight:800; font-size:16px; border-top:2px solid #0f766e; }}
  .badge {{ display:inline-block; padding:4px 10px; border-radius:999px; background:#ccfbf1; color:#0f766e; font-size:12px; }}
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">DarijaStock</div>
      <div class="muted">Facture / فاتورة</div>
    </div>
    <div style="text-align:left">
      <div><strong>N° {invoice.number or '—'}</strong></div>
      <div class="muted">{invoice.issue_date or ''}</div>
      <div class="badge">{status_label}</div>
    </div>
  </div>
  <div style="display:flex; justify-content:space-between; margin-top:20px;">
    <div>
      <div class="muted">Client</div>
      <div><strong>{invoice.customer_name}</strong></div>
      <div class="muted">{invoice.customer_address or ''}</div>
      <div class="muted">{invoice.customer_phone or ''}</div>
      <div class="muted">{('ICE: ' + invoice.customer_tax_id) if invoice.customer_tax_id else ''}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Article</th><th>Qté</th><th>P.U.</th><th>TVA</th><th>Total</th></tr></thead>
    <tbody>{''.join(rows)}</tbody>
  </table>
  <table class="totals">
    <tr><td>Sous-total</td><td class="num">{invoice.subtotal} {invoice.currency}</td></tr>
    <tr><td>Remise</td><td class="num">{invoice.discount_total} {invoice.currency}</td></tr>
    <tr><td>TVA</td><td class="num">{invoice.tax_total} {invoice.currency}</td></tr>
    <tr class="grand"><td>Total</td><td class="num">{invoice.total} {invoice.currency}</td></tr>
  </table>
</body></html>"""
