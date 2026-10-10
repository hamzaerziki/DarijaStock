from decimal import Decimal

from sqlalchemy import select

from app.models import Invoice, Product, ProductUnit, Warehouse
from app.services import inventory, invoices, orders


def _setup(db):
    wh = Warehouse(code="W1", name="Wh", is_default=True)
    db.add(wh)
    p = Product(sku="INV1", name="Produit", price=Decimal("20.00"), tax_rate=Decimal("10.00"))
    db.add(p)
    db.flush()
    db.add(ProductUnit(product_id=p.id, code="piece", name="pièce", factor_to_base=1, is_base=True))
    db.commit()
    db.refresh(wh)
    db.refresh(p)
    return wh, p


class _C:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def _make_confirmed_order(db, wh, p, qty=2):
    item = _C(product_id=p.id, raw_text=None, unit_code=None, quantity=Decimal(qty),
              unit_price=None, tax_rate=None, discount=Decimal("0"), note=None, match_status="matched")
    create = _C(customer_id=None, source="manual", warehouse_id=wh.id, customer_note=None,
                internal_note=None, items=[item], external_ref=None)
    order = orders.create_order(db, create, None)
    db.flush()
    orders.confirm_order(db, order, None)
    db.flush()
    return order


def test_invoice_from_order_and_issue(db):
    wh, p = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=p.id, amount=Decimal("10"))
    db.flush()
    order = _make_confirmed_order(db, wh, p, qty=3)
    invoice = invoices.create_invoice_from_order(db, order, None)
    assert invoice.status == "draft"
    assert len(invoice.items) == 1
    assert invoice.total == Decimal("66.00")  # 60 + 10% = 66

    invoices.issue_invoice(db, invoice, None)
    db.commit()
    assert invoice.status == "issued"
    assert invoice.number is not None and invoice.number.startswith("FA-")
    assert invoice.total == Decimal("66.00")


def test_invoice_number_unique(db):
    wh, p = _setup(db)
    numbers = set()
    for i in range(3):
        inventory.receive_stock(db, warehouse_id=wh.id, product_id=p.id, amount=Decimal("10"))
        db.flush()
        order = _make_confirmed_order(db, wh, p, qty=1)
        invoice = invoices.create_invoice_from_order(db, order, None)
        invoices.issue_invoice(db, invoice, None)
        db.commit()
        numbers.add(invoice.number)
    assert len(numbers) == 3


def test_cancelled_invoice_keeps_number(db):
    wh, p = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=p.id, amount=Decimal("10"))
    db.flush()
    order = _make_confirmed_order(db, wh, p, qty=1)
    invoice = invoices.create_invoice_from_order(db, order, None)
    invoices.issue_invoice(db, invoice, None)
    number_before = invoice.number
    invoices.cancel_invoice(db, invoice, None, reason="erreur")
    db.commit()
    assert invoice.status == "cancelled"
    assert invoice.number == number_before
    # snapshot preserved
    assert invoice.items[0].unit_price == Decimal("20.00")


def test_draft_not_allowed_without_confirm(db):
    wh, p = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=p.id, amount=Decimal("10"))
    db.flush()
    item = _C(product_id=p.id, raw_text=None, unit_code=None, quantity=Decimal("2"),
              unit_price=None, tax_rate=None, discount=Decimal("0"), note=None, match_status="matched")
    create = _C(customer_id=None, source="manual", warehouse_id=wh.id, customer_note=None,
                internal_note=None, items=[item], external_ref=None)
    order = orders.create_order(db, create, None)
    db.flush()
    from fastapi import HTTPException

    try:
        invoices.create_invoice_from_order(db, order, None)
        assert False
    except HTTPException as exc:
        assert exc.status_code == 400


def test_render_invoice_html(db):
    wh, p = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=p.id, amount=Decimal("10"))
    db.flush()
    order = _make_confirmed_order(db, wh, p, qty=2)
    invoice = invoices.create_invoice_from_order(db, order, None)
    html = invoices.render_invoice_html(invoice)
    assert "DarijaStock" in html
    assert "Produit" in html