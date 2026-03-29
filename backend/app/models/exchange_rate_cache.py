from sqlalchemy import Column, Integer, String, DateTime, JSON, Index
from sqlalchemy.sql import func
from app.database import Base


class ExchangeRateCache(Base):
    __tablename__ = "exchange_rate_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    base_currency = Column(String(3), nullable=False)
    rates_json = Column(JSON, nullable=False)
    fetched_at = Column(DateTime, nullable=False, server_default=func.now())

    __table_args__ = (
        Index("idx_base_fetched", "base_currency", "fetched_at"),
    )
