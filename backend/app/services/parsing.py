"""Deterministic WhatsApp order message parser.

Pure-Python, no OCR, no paid AI. Extracts candidate customer details, product
lines, quantities and units from Darija / Arabic / French / Latin mixed text.

The parser never invents product ids or prices. Uncertain fields are flagged
so a human must review them before an order can be confirmed.
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from app.services.text import normalize

# --- Unit vocabulary: maps many spellings to a canonical code -------------
UNIT_ALIASES: dict[str, str] = {
    # piece
    "piece": "piece", "pieces": "piece", "pcs": "piece", "pc": "piece", "u": "piece",
    "قطعة": "piece", "قطع": "piece", "حبة": "piece", "حبات": "piece",
    # carton
    "carton": "carton", "cartons": "carton", "karton": "carton", "ctn": "carton",
    "كرطون": "carton", "كرتون": "carton", "كرطونة": "carton", "كراطين": "carton",
    # pack
    "pack": "pack", "packs": "pack", "paké": "pack", "pake": "pack", "pak": "pack",
    "باكي": "pack", "باك": "pack", "باكات": "pack", "packet": "pack",
    # box / boite
    "boite": "box", "boîte": "box", "box": "box", "boites": "box",
    "بوصة": "box", "علبة": "box", "علب": "box",
    # kg
    "kg": "kg", "kilo": "kg", "kilos": "kg", "kilogramme": "kg",
    "كيلو": "kg", "كيلوغرام": "kg", "كغ": "kg",
    # litre
    "l": "litre", "litre": "litre", "litres": "litre", "liter": "litre",
    "لتر": "litre", "ل": "litre",
    # sac
    "sac": "sac", "sacs": "sac", "sack": "sac",
    "شكارة": "sac", "شكاير": "sac", "كيس": "sac", "أكياس": "sac", "كيسان": "sac",
    # plateau
    "plateau": "plateau", "plato": "plateau",
    "بلاصة": "plateau", "بلاصات": "plateau", "طبلة": "plateau",
    # bouteille
    "bouteille": "bouteille", "bottle": "bouteille", "bouteilles": "bouteille",
    "قربة": "bouteille", "قربات": "bouteille",
}

LATIN_UNIT_WORDS = set(UNIT_ALIASES.keys())

# Lines that look like delivery / logistics notes.
DELIVERY_KEYWORDS = [
    "sift", "sifet", "livr", "twsil", "tawsil", "tosil", "adresse", "3tini",
    "twsel", "اجيب", "سيفط", "الادريس", "العنوان", "توصيل", "وصل",
]

# Numeric tokens in latin or arabic digits.
NUM_TOKEN = r"[0-9\u0660-\u0669]+(?:[.,][0-9\u0660-\u0669]+)?"

# Conversational / non-product filler words. Lines made only of these (or that
# contain a greeting) are never treated as products.
GREETING_WORDS = {
    "salam", "salamo", "سلام", "سلام", "salamu", "aleykom", "عليكم",
    "bonjour", "salut", "bonsoir", "goodmorning", "hello", "hi", "bonne",
    "merci", "chokran", "shukran", "شكرا", "thanks", "thank",
    "marhaba", "مرحبا", "ahla", "أهلا", "صباح", "مساء", "sbah", "msa",
    "ok", "wakha", "واخا", "daccord", "svp", "please", "stp", "ayaw",
    "بصاح", "بصح", "بزاف", "بسلامة", "allah", "الله",
    "fr", "pour", "من", "ف",
}

_PHONE_RE = re.compile(r"(?:\+212|0)\s*[5-7](?:[\s.-]?\d){8}")
_TRAILING_QTY_RE = re.compile(rf"^(?P<qty>{NUM_TOKEN})\s*(?P<rest>.*)$")
_UNIT_LEAD_RE = re.compile(
    rf"^(?P<qty>{NUM_TOKEN})\s*(?:x|×|في|\*)?\s*(?P<unit>[^\d]+?)\s+(?P<product>.+)$",
    re.IGNORECASE,
)


def _to_decimal(token: str) -> Decimal | None:
    token = token.replace("\u066B", ".").replace(",", ".")
    token = token.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
    try:
        return Decimal(token)
    except (InvalidOperation, ValueError):
        return None


def _detect_unit(token: str) -> str | None:
    norm = normalize(token)
    if norm in UNIT_ALIASES:
        return UNIT_ALIASES[norm]
    # handle plural / attached forms
    for key, code in UNIT_ALIASES.items():
        if norm == key or norm.startswith(key):
            return code
    return None


def _clean_product(text: str) -> str:
    text = re.sub(r"^(?:dial|dyal|d|de|من|ديال)\s+", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"[\-\u2013\u2014:*]+$", "", text).strip()
    return text


def _is_conversational(norm_line: str) -> bool:
    tokens = norm_line.split(" ")
    if not tokens:
        return True
    if any(t in GREETING_WORDS for t in tokens):
        return True
    return all(t in GREETING_WORDS for t in tokens)


def parse_message(raw_text: str) -> dict:
    """Parse a single pasted message into a structured candidate order."""
    warnings: list[str] = []
    lines = [ln.strip() for ln in raw_text.splitlines()]
    lines = [ln for ln in lines if ln]

    customer: dict = {"name": None, "phone": None, "confidence": 0.0}
    items: list[dict] = []
    delivery_notes: list[str] = []
    unparsed: list[str] = []

    phone_match = _PHONE_RE.search(raw_text)
    if phone_match:
        customer["phone"] = re.sub(r"[\s.-]", "", phone_match.group(0))
        customer["confidence"] = max(customer["confidence"], 0.8)

    for line in lines:
        norm_line = normalize(line)

        if _is_conversational(norm_line):
            continue

        # Delivery note detection.
        if any(k in norm_line for k in (normalize(k) for k in DELIVERY_KEYWORDS)):
            if not any(c.isdigit() for c in line):
                delivery_notes.append(line)
                continue

        # Explicit customer name hints.
        name_hint = re.match(r"^\s*(?:ismi|smi|ana|name|nom)\s*[:\-]?\s*(.+)$", line, re.IGNORECASE)
        if name_hint:
            customer["name"] = name_hint.group(1).strip()
            customer["confidence"] = max(customer["confidence"], 0.6)
            continue

        # Product line candidates.
        qty: Decimal | None = None
        unit: str | None = None
        product_text: str | None = None

        m = _UNIT_LEAD_RE.match(line)
        if m:
            qty = _to_decimal(m.group("qty"))
            unit = _detect_unit(m.group("unit"))
            product_text = _clean_product(m.group("product"))
        else:
            m2 = _TRAILING_QTY_RE.match(line)
            if m2:
                qty = _to_decimal(m2.group("qty"))
                rest = m2.group("rest").strip()
                # maybe rest starts with a unit word
                parts = rest.split(" ", 1)
                if parts:
                    unit = _detect_unit(parts[0])
                    if unit and len(parts) > 1:
                        product_text = _clean_product(parts[1])
                    else:
                        product_text = _clean_product(rest)

        if product_text:
            item = {"raw_text": line, "product_text": product_text, "quantity": None, "unit": unit}
            if qty is None:
                warnings.append(f"Quantity missing / الكمية ناقصة: \"{line}\"")
                item["quantity"] = None
            else:
                item["quantity"] = str(qty)
            if unit is None:
                warnings.append(f"Unit missing / الوحدة ناقصة: \"{line}\"")
            items.append(item)
        elif re.search(r"[^\W\d_]", line) and len(_clean_product(line)) > 2:
            # Line contains letters but no explicit quantity or unit:
            # treat as a candidate product that needs human review.
            product_text_fallback = _clean_product(line)
            items.append(
                {"raw_text": line, "product_text": product_text_fallback, "quantity": None, "unit": None}
            )
            warnings.append(f"Quantity missing / الكمية ناقصة: \"{line}\"")
        else:
            unparsed.append(line)

    if not items:
        warnings.append("No product lines detected / ما لقينا حتى منتج. راجع الميساج.")
    if customer["name"] is None and not customer["phone"]:
        warnings.append("Customer not identified / الزبون مامعروفش. خاصك تختارو.")

    return {
        "customer": customer,
        "items": items,
        "delivery_notes": delivery_notes,
        "unparsed_lines": unparsed,
        "warnings": warnings,
        "requires_review": bool(warnings),
    }


def split_messages(block: str) -> list[str]:
    """Split a pasted block into individual messages.

    Messages are separated by a blank line or a row of dashes.
    """
    if re.search(r"^\s*-{3,}\s*$", block, re.MULTILINE):
        parts = re.split(r"^\s*-{3,}\s*$", block, flags=re.MULTILINE)
    else:
        parts = re.split(r"\n\s*\n", block)
    return [p.strip() for p in parts if p.strip()]
