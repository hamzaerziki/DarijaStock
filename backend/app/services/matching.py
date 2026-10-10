from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product, ProductAlias
from app.services.text import normalize

MATCH_THRESHOLD = 0.72
AMBIGUOUS_MARGIN = 0.08


@dataclass
class MatchResult:
    product_id: int | None
    confidence: float
    status: str  # matched | ambiguous | unmatched
    candidates: list[tuple[int, float]]


def build_index(db: Session) -> dict[str, list[int]]:
    """Map normalized catalog terms -> product ids."""
    index: dict[str, list[int]] = {}

    def add(term: str | None, pid: int) -> None:
        norm = normalize(term or "")
        if not norm:
            return
        index.setdefault(norm, [])
        if pid not in index[norm]:
            index[norm].append(pid)

    for product in db.scalars(select(Product).where(Product.is_active.is_(True))).unique():
        add(product.name, product.id)
        add(product.name_ar, product.id)
        add(product.name_fr, product.id)
        add(product.sku, product.id)
    for alias in db.scalars(select(ProductAlias)):
        add(alias.alias, alias.product_id)
        add(alias.normalized, alias.product_id)
    return index


def _similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    ratio = SequenceMatcher(None, a, b).ratio()
    # Boost when one fully contains the other (common for product names).
    if a in b or b in a:
        ratio = max(ratio, 0.85)
    return ratio


def match_text(text: str, index: dict[str, list[int]]) -> MatchResult:
    norm = normalize(text)
    if not norm:
        return MatchResult(None, 0.0, "unmatched", [])

    # 1. Exact match.
    if norm in index and len(index[norm]) == 1:
        return MatchResult(index[norm][0], 1.0, "matched", [(index[norm][0], 1.0)])
    if norm in index and len(index[norm]) > 1:
        cands = [(pid, 1.0) for pid in index[norm]]
        return MatchResult(None, 1.0, "ambiguous", cands)

    # 2. Fuzzy: compute similarity against every catalog term.
    scores: dict[int, float] = {}
    for term, pids in index.items():
        score = _similarity(norm, term)
        if score >= MATCH_THRESHOLD:
            for pid in pids:
                scores[pid] = max(scores.get(pid, 0.0), score)

    if not scores:
        return MatchResult(None, 0.0, "unmatched", [])

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    best_id, best_score = ranked[0]
    if len(ranked) > 1:
        second_score = ranked[1][1]
        if best_score - second_score < AMBIGUOUS_MARGIN:
            return MatchResult(None, best_score, "ambiguous", ranked[:5])
    return MatchResult(best_id, best_score, "matched", ranked[:5])
