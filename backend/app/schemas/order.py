from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class OrderItemIn(BaseModel):
    product_id: int | None = None
    raw_text: str | None = None
    unit_code: str | None = None
    quantity: Decimal = Field(gt=0, default=Decimal("1"))
    unit_price: Decimal | None = Field(default=None, ge=0)
    tax_rate: Decimal | None = Field(default=None, ge=0, le=100)
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    note: str | None = None
    match_status: str | None = None


class OrderCreate(BaseModel):
    customer_id: int | None = None
    source: str = "manual"
    warehouse_id: int | None = None
    customer_note: str | None = None
    internal_note: str | None = None
    items: list[OrderItemIn] = []
    external_ref: str | None = None


class OrderUpdate(BaseModel):
    customer_id: int | None = None
    warehouse_id: int | None = None
    customer_note: str | None = None
    internal_note: str | None = None


class OrderItemOut(BaseModel):
    id: int
    product_id: int | None
    raw_text: str | None
    unit_code: str | None
    quantity: Decimal
    quantity_base: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    discount: Decimal
    line_total: Decimal
    match_status: str
    match_confidence: Decimal | None
    note: str | None
    model_config = {"from_attributes": True}


class CustomerBrief(BaseModel):
    id: int
    code: str
    name: str
    phone: str | None = None
    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    order_number: str
    status: str
    source: str
    customer_id: int | None
    customer: CustomerBrief | None = None
    warehouse_id: int | None
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    currency: str
    customer_note: str | None
    internal_note: str | None
    items: list[OrderItemOut] = []
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class OrderStatusChange(BaseModel):
    note: str | None = None


# --- Public web order form ---
class PublicOrderItemIn(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0, default=Decimal("1"))


class PublicOrderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=6, max_length=50)
    city: str | None = None
    address: str | None = None
    note: str | None = None
    items: list[PublicOrderItemIn] = Field(min_length=1)
