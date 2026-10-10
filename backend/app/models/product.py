from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name_ar: Mapped[str | None] = mapped_column(String(255))
    name_fr: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(120), index=True)

    base_unit: Mapped[str] = mapped_column(String(30), nullable=False, default="piece")
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))
    tax_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    reorder_threshold: Mapped[Decimal] = mapped_column(
        Numeric(14, 3), nullable=False, default=Decimal("0")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    show_in_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    aliases: Mapped[list[ProductAlias]] = relationship(
        back_populates="product", cascade="all, delete-orphan", lazy="selectin"
    )
    units: Mapped[list[ProductUnit]] = relationship(
        back_populates="product", cascade="all, delete-orphan", lazy="selectin"
    )


class ProductAlias(Base, TimestampMixin):
    __tablename__ = "product_aliases"
    __table_args__ = (UniqueConstraint("product_id", "normalized", name="uq_product_alias"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    alias: Mapped[str] = mapped_column(String(255), nullable=False)
    # Normalized form used for matching (lowercase, unify arabic variants).
    normalized: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    language: Mapped[str | None] = mapped_column(String(20))

    product: Mapped[Product] = relationship(back_populates="aliases")


class ProductUnit(Base, TimestampMixin):
    __tablename__ = "product_units"
    __table_args__ = (UniqueConstraint("product_id", "code", name="uq_product_unit"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(30), nullable=False)  # piece, pack, carton, box
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    # How many base units this unit represents.
    factor_to_base: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=Decimal("1"))
    price_override: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    is_base: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    product: Mapped[Product] = relationship(back_populates="units")
