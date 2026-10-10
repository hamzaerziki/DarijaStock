from decimal import Decimal

from pydantic import BaseModel, Field


# --- Products ---
class ProductUnitBase(BaseModel):
    code: str = Field(max_length=30)
    name: str = Field(max_length=60)
    factor_to_base: Decimal = Field(gt=0, default=Decimal("1"))
    price_override: Decimal | None = Field(default=None, ge=0)
    is_base: bool = False


class ProductUnitOut(ProductUnitBase):
    id: int
    model_config = {"from_attributes": True}


class ProductAliasBase(BaseModel):
    alias: str = Field(max_length=255)
    language: str | None = None


class ProductAliasOut(ProductAliasBase):
    id: int
    model_config = {"from_attributes": True}


class ProductBase(BaseModel):
    sku: str = Field(max_length=60)
    name: str = Field(max_length=255)
    name_ar: str | None = None
    name_fr: str | None = None
    description: str | None = None
    category: str | None = None
    base_unit: str = Field(default="piece", max_length=30)
    price: Decimal = Field(ge=0, default=Decimal("0.00"))
    tax_rate: Decimal | None = Field(default=None, ge=0, le=100)
    reorder_threshold: Decimal = Field(ge=0, default=Decimal("0"))
    is_active: bool = True
    show_in_public: bool = True


class ProductCreate(ProductBase):
    aliases: list[ProductAliasBase] = []
    units: list[ProductUnitBase] = []


class ProductUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    name_ar: str | None = None
    name_fr: str | None = None
    description: str | None = None
    category: str | None = None
    base_unit: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    tax_rate: Decimal | None = Field(default=None, ge=0, le=100)
    reorder_threshold: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None
    show_in_public: bool | None = None


class ProductOut(ProductBase):
    id: int
    aliases: list[ProductAliasOut] = []
    units: list[ProductUnitOut] = []
    model_config = {"from_attributes": True}


# --- Public catalog (no internal fields) ---
class PublicProduct(BaseModel):
    id: int
    sku: str
    name: str
    name_ar: str | None = None
    name_fr: str | None = None
    category: str | None = None
    base_unit: str
    price: Decimal
    model_config = {"from_attributes": True}


# --- Customers ---
class CustomerBase(BaseModel):
    code: str = Field(max_length=50)
    name: str = Field(max_length=255)
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    tax_id: str | None = None
    notes: str | None = None
    is_active: bool = True


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    tax_id: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class CustomerOut(CustomerBase):
    id: int
    model_config = {"from_attributes": True}
