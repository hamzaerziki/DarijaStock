from __future__ import annotations

from decimal import Decimal

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Warehouse(Base, TimestampMixin):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class StockBalance(Base, TimestampMixin):
    """Authoritative current stock per warehouse/product.

    `physical` is on-hand stock, `reserved` is stock committed to confirmed
    orders but not yet dispatched. Available = physical - reserved.
    Rows are locked (SELECT ... FOR UPDATE) during mutations.
    """

    __tablename__ = "stock_balances"
    __table_args__ = (
        UniqueConstraint("warehouse_id", "product_id", name="uq_stock_balance_wh_product"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    physical: Mapped[Decimal] = mapped_column(Numeric(16, 3), nullable=False, default=Decimal("0"))
    reserved: Mapped[Decimal] = mapped_column(Numeric(16, 3), nullable=False, default=Decimal("0"))

    product = relationship("Product")


class InventoryMovement(Base, TimestampMixin):
    """Append-only inventory ledger. Never modified or deleted."""

    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    movement_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    # Signed deltas applied to the ledger. physical_delta affects on-hand stock,
    # reserved_delta affects committed/reserved stock.
    physical_delta: Mapped[Decimal] = mapped_column(Numeric(16, 3), nullable=False, default=Decimal("0"))
    reserved_delta: Mapped[Decimal] = mapped_column(Numeric(16, 3), nullable=False, default=Decimal("0"))
    quantity_base: Mapped[Decimal] = mapped_column(Numeric(16, 3), nullable=False, default=Decimal("0"))
    reference_type: Mapped[str | None] = mapped_column(String(40))
    reference_id: Mapped[int | None] = mapped_column()
    note: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    product = relationship("Product")
    warehouse = relationship("Warehouse")


class InventoryReservation(Base, TimestampMixin):
    """A reservation of stock against an order item."""

    __tablename__ = "inventory_reservations"

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), index=True)
    order_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("order_items.id", ondelete="SET NULL"), index=True
    )
    quantity_base: Mapped[Decimal] = mapped_column(Numeric(16, 3), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", index=True)
