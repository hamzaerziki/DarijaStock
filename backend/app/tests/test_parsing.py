from app.services.parsing import parse_message, split_messages


def test_parse_french_lines():
    text = "Bonjour,\n2 cartons coca 1L\n1 sachet sucre 1kg\nmerci"
    parsed = parse_message(text)
    assert len(parsed["items"]) >= 2
    assert parsed["items"][0]["unit"] == "carton"
    assert parsed["items"][0]["quantity"] == "2"


def test_parse_arabic_darija():
    text = "سلام،\n2 كرطونة كوكا 1 لتر\n5 كيلو سكر\nبصاح توجدوه"
    parsed = parse_message(text)
    units = [it.get("unit") for it in parsed["items"]]
    assert "carton" in units
    assert "kg" in units
    # only warning should be about the unidentified customer
    assert all("customer" in w or "الزبون" in w for w in parsed["warnings"])


def test_parse_missing_quantity_flags_review():
    text = "salam, ghati 3andi:\ncoca cola\n10 sac sucre"
    parsed = parse_message(text)
    assert parsed["requires_review"] is True
    assert any("quantity" in w.lower().split(":")[0] or "الكمية" in w for w in parsed["warnings"])


def test_customer_phone_extracted():
    text = "smi Anas, tel 0612345678\n2 carton hleeb"
    parsed = parse_message(text)
    assert parsed["customer"]["phone"] == "0612345678"


def test_parse_ambiguous_customer():
    parsed = parse_message("2 coca 1L")
    assert parsed["requires_review"] is True
    assert any("Customer not identified" in w for w in parsed["warnings"])


def test_split_messages():
    block = "first order\n2 coca\n\nsecond order\n1 sucre"
    parts = split_messages(block)
    assert len(parts) == 2


def test_delivery_note_kept_separate():
    text = "3 coca\nsift lihom l adresse dial casa"
    parsed = parse_message(text)
    assert parsed["delivery_notes"], "expected a delivery note"
    assert not any("coca" in d for d in parsed["delivery_notes"]) or parsed["delivery_notes"][0].startswith("sift")