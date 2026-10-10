from decimal import Decimal

from sqlalchemy import select

from app.models import ImportBatch, Order, Product, ProductAlias, SourceMessage, Warehouse
from app.services import imports, inventory
from app.services.text import normalize


def _setup(db):
    wh = Warehouse(code="W1", name="Wh", is_default=True)
    db.add(wh)
    db.flush()
    p = Product(sku="IMP1", name="Coca-Cola 1L", name_ar="كوكا", price=Decimal("12.00"))
    db.add(p)
    db.flush()
    db.add(ProductAlias(product_id=p.id, alias="كوكا", normalized=normalize("كوكا")))
    db.add(ProductAlias(product_id=p.id, alias="coca", normalized=normalize("coca")))
    db.commit()
    db.refresh(wh)
    db.refresh(p)
    return wh, p


def test_import_creates_order_draft(db, admin_user):
    wh, product = _setup(db)
    payload = {
        "label": "batch-1",
        "messages": [
            {"raw_text": "Salam,\n2 كوكا\n3 cartons coca\nmerci"},
        ],
    }
    result = imports.process_batch(db, _dict_to_obj(payload), admin_user)
    assert result.orders_created == 1
    order = db.scalar(select(Order))
    assert order is not None
    assert order.source == "whatsapp"
    assert len(order.items) == 2
    assert all(i.product_id == product.id for i in order.items)


def test_import_duplicate_detection(db, admin_user):
    wh, product = _setup(db)
    payload1 = {"messages": [{"raw_text": "2 كوكا"}]}
    r1 = imports.process_batch(db, _dict_to_obj(payload1), admin_user)
    assert r1.orders_created == 1
    r2 = imports.process_batch(db, _dict_to_obj(payload1), admin_user)
    assert r2.duplicates == 1
    assert db.scalar(select(Order)) is not None


def test_import_idempotent_batch_key(db, admin_user):
    wh, product = _setup(db)
    key = "idem-key-2"
    payload = {"idempotency_key": key, "messages": [{"raw_text": "4 كوكا"}]}
    r1 = imports.process_batch(db, _dict_to_obj(payload), admin_user)
    r2 = imports.process_batch(db, _dict_to_obj(payload), admin_user)
    assert r1.batch_id == r2.batch_id
    from sqlalchemy import func

    assert db.scalar(select(func.count(Order.id))) == 1


def test_import_unmatched_item_requires_review(db, admin_user):
    wh, product = _setup(db)
    payload = {"messages": [{"raw_text": "5 مادة مش معروفة تماما"}]}
    result = imports.process_batch(db, _dict_to_obj(payload), admin_user)
    assert result.orders_created == 1
    order = db.scalar(select(Order))
    assert order.status == "needs_review"
    assert all(i.match_status == "unmatched" for i in order.items)


def test_preserves_original_message(db, admin_user):
    wh, product = _setup(db)
    payload = {"messages": [{"raw_text": "Salam, `2 كوكا` s'il vous plait"}]}
    imports.process_batch(db, _dict_to_obj(payload), admin_user)
    sm = db.scalar(select(SourceMessage))
    assert sm.raw_text == "Salam, `2 كوكا` s'il vous plait"


def _dict_to_obj(d):
    """Convert a dict into a simple object for service functions."""
    class O:
        pass

    o = O()
    for k, v in d.items():
        o.__dict__[k] = v
    if not hasattr(o, "idempotency_key"):
        o.idempotency_key = None
    if not hasattr(o, "label"):
        o.label = None
    if not hasattr(o, "sender_name"):
        pass
    # messages as objects with attributes
    mm = []
    for m in o.messages:
        mo = O()
        mo.__dict__.update(m)
        clone = O()
        clone.raw_text = mo.raw_text
        clone.sender_name = getattr(mo, "sender_name", None)
        clone.sender_phone = getattr(mo, "sender_phone", None)
        mm.append(clone)
    o.messages = mm
    return o