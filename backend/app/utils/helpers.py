from decimal import Decimal
from typing import Optional


def convert_amount(amount: float, rate: float) -> float:
    """Convert amount using exchange rate"""
    return round(amount * rate, 2)


def paginate(query, page: int = 1, limit: int = 20):
    """Return paginated query results"""
    offset = (page - 1) * limit
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


def safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except Exception:
        return None
