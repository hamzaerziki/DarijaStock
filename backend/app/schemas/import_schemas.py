from pydantic import BaseModel, Field


class ImportMessageIn(BaseModel):
    raw_text: str = Field(min_length=1)
    sender_name: str | None = None
    sender_phone: str | None = None


class ImportBatchIn(BaseModel):
    label: str | None = None
    messages: list[ImportMessageIn] = Field(min_length=1, max_length=200)
    idempotency_key: str | None = None


class ParsedItem(BaseModel):
    raw_text: str
    product_text: str
    quantity: str | None = None
    unit: str | None = None


class ParsedPayload(BaseModel):
    customer: dict
    items: list[ParsedItem]
    delivery_notes: list[str]
    unparsed_lines: list[str]
    warnings: list[str]
    requires_review: bool


class MessageImportResult(BaseModel):
    index: int
    message_id: int | None = None
    status: str
    duplicate_of_id: int | None = None
    order_id: int | None = None
    order_number: str | None = None
    payload: ParsedPayload | None = None
    error: str | None = None


class ImportBatchResult(BaseModel):
    batch_id: int
    total: int
    processed: int
    orders_created: int
    duplicates: int
    errors: int
    messages: list[MessageImportResult]