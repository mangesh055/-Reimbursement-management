import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.exchange_rate_cache import ExchangeRateCache

logger = logging.getLogger(__name__)
_countries_cache = None


async def get_currency_for_country(country_name: str) -> dict:
    """Fetch currency info for a country from restcountries API."""
    global _countries_cache
    try:
        if _countries_cache is None:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(settings.RESTCOUNTRIES_API_URL)
                _countries_cache = resp.json()

        name_lower = country_name.lower()
        for country in _countries_cache:
            c_name = country.get("name", {}).get("common", "").lower()
            if name_lower in c_name or c_name in name_lower:
                currencies = country.get("currencies", {})
                if currencies:
                    code = list(currencies.keys())[0]
                    symbol = currencies[code].get("symbol", code)
                    return {"currency_code": code, "currency_symbol": symbol}
    except Exception as e:
        logger.error(f"Currency lookup error: {e}")
    return {"currency_code": "USD", "currency_symbol": "$"}


async def get_exchange_rates(base_currency: str, db: Session) -> dict:
    """Get exchange rates, using DB cache (6-hour TTL)."""
    cutoff = datetime.utcnow() - timedelta(hours=6)
    cached = (db.query(ExchangeRateCache)
               .filter(ExchangeRateCache.base_currency == base_currency,
                       ExchangeRateCache.fetched_at >= cutoff)
               .order_by(ExchangeRateCache.fetched_at.desc())
               .first())
    if cached:
        return cached.rates_json

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{settings.EXCHANGE_RATE_API_URL}/{base_currency}")
            data = resp.json()
            rates = data.get("rates", {})
            cache_entry = ExchangeRateCache(base_currency=base_currency, rates_json=rates)
            db.add(cache_entry)
            db.commit()
            return rates
    except Exception as e:
        logger.error(f"Exchange rate fetch error: {e}")
        return {}


async def convert_currency(amount: float, from_currency: str,
                            to_currency: str, db: Session) -> dict:
    """Convert amount from one currency to another."""
    if from_currency == to_currency:
        return {"converted_amount": amount, "exchange_rate": 1.0,
                "from_currency": from_currency, "to_currency": to_currency}
    rates = await get_exchange_rates(from_currency, db)
    rate = rates.get(to_currency, 1.0)
    return {
        "converted_amount": round(amount * rate, 2),
        "exchange_rate": rate,
        "from_currency": from_currency,
        "to_currency": to_currency
    }
