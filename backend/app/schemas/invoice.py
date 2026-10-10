from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class InvoiceItemOut(BaseModel):
    id: int
    product_id: int | None
    sku: str | None
    description: str
    unit_code: str | None
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    discount: Decimal
    line_total: Decimal
    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: int
    number: str | None
    order_id: int | None
    customer_id: int | None
    status: str
    issue_date: date | None = None
    customer_name: str
    customer_address: str | None
    customer_tax_id: str | None
    customer_phone: str | None
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    currency: str
    note: str | None
    items: list[InvoiceItemOut] = []
    model_config = {"from_attributes": True}


class CancelPayload(BaseModel):
    reason: str | None = None