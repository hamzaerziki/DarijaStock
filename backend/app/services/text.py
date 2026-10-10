"""Text normalization for catalog matching.

Handles Arabic (with diacritics and letter variants), Latin and mixed text so
that the same product written in different ways normalizes to the same key.
"""

import re
import unicodedata

_ARABIC_DIACRITICS = re.compile(
    "[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]"
)

# Arabic letter unification.
_ARABIC_MAP = {
    ord("\u0622"): "\u0627",  # آ -> ا
    ord("\u0623"): "\u0627",  # أ -> ا
    ord("\u0625"): "\u0627",  # إ -> ا
    ord("\u0671"): "\u0627",  # ٱ -> ا
    ord("\u0649"): "\u064A",  # ى -> ي
    ord("\u0629"): "\u0647",  # ة -> ه
    ord("\u06C0"): "\u0647",
    ord("\u0624"): "\u0648",  # ؤ -> و
    ord("\u0626"): "\u064A",  # ئ -> ي
}

# Latin look-alike / common transliteration folds.
_LATIN_FOLD = str.maketrans(
    {
        "à": "a", "â": "a", "ä": "a", "á": "a", "ã": "a",
        "é": "e", "è": "e", "ê": "e", "ë": "e",
        "î": "i", "ï": "i", "í": "i",
        "ô": "o", "ö": "o", "ó": "o", "õ": "o",
        "ù": "u", "û": "u", "ü": "u", "ú": "u",
        "ç": "c", "ñ": "n",
    }
)

_ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

# Arabic punctuation that is inside the \u0600-\u06FF block and must not be
# treated as part of a word.
_ARABIC_PUNCT = str.maketrans(
    {
        "\u060c": " ",  # ،
        "\u061b": " ",  # ؛
        "\u061f": " ",  # ؟
        "\u066a": " ",  # ٪
        "\u066b": ".",
        "\u066c": " ",
        "\u066d": " ",
        "\u06d4": " ",  # ۔
    }
)


def normalize(text: str) -> str:
    """Return a canonical, comparable key for a piece of catalog text."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = text.translate(_ARABIC_DIGITS)
    text = text.translate(_ARABIC_PUNCT)
    text = _ARABIC_DIACRITICS.sub("", text)
    text = text.translate(_ARABIC_MAP)
    text = text.translate(_LATIN_FOLD)
    text = text.lower()
    # Collapse separators; keep arabic letters, latin letters, digits.
    text = re.sub(r"[^\w\u0600-\u06FF]+", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> list[str]:
    return [t for t in normalize(text).split(" ") if t]
