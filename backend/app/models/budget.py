from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    department_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    budget_amount = Column(Numeric(12, 2), nullable=False)
    period = Column(Enum("monthly", "quarterly", "yearly"), nullable=False, default="monthly")
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    company = relationship("Company", back_populates="budgets")
