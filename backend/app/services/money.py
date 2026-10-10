from decimal import Decimal, ROUND_HALF_UP

TWO = Decimal("0.01")
THREE = Decimal("0.001")


def money(value: Decimal | int | str) -> Decimal:
    """Quantize a monetary value to 2 decimal places (half-up)."""
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(TWO, rounding=ROUND_HALF_UP)


def quantity(value: Decimal | int | str) -> Decimal:
    """Quantize a quantity to 3 decimal places (half-up)."""
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(THREE, rounding=ROUND_HALF_UP)
