from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    currency_code = Column(String(3), nullable=False, default="USD")
    currency_symbol = Column(String(10), nullable=False, default="$")
    logo_url = Column(String(500), nullable=True)
    expense_policy_text = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="company", foreign_keys="User.company_id")
    expenses = relationship("Expense", back_populates="company")
    approval_rules = relationship("ApprovalRule", back_populates="company")
    budgets = relationship("Budget", back_populates="company")
    audit_logs = relationship("AuditLog", back_populates="company")
