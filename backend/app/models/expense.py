from sqlalchemy import (Column, Integer, String, Boolean, DateTime, Date,
                         Numeric, Enum, ForeignKey, Text, JSON, SmallInteger)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False)
    amount_in_company_currency = Column(Numeric(12, 2), nullable=False)
    exchange_rate = Column(Numeric(12, 6), nullable=False, default=1.000000)
    category = Column(
        Enum("Travel", "Meals", "Accommodation", "Office Supplies",
             "Entertainment", "Training", "Medical", "Miscellaneous"),
        nullable=False, default="Miscellaneous"
    )
    ai_suggested_category = Column(String(100), nullable=True)
    ai_category_confidence = Column(Numeric(5, 2), nullable=True)
    description = Column(Text, nullable=True)
    expense_date = Column(Date, nullable=False)
    receipt_url = Column(String(500), nullable=True)
    ocr_raw_data = Column(JSON, nullable=True)
    vendor_name = Column(String(255), nullable=True)
    policy_flags = Column(JSON, nullable=True)
    risk_score = Column(SmallInteger, nullable=True, default=0)
    risk_reason = Column(Text, nullable=True)
    is_duplicate_flag = Column(Boolean, nullable=False, default=False)
    duplicate_of_expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="SET NULL"), nullable=True)
    status = Column(
        Enum("draft", "pending", "approved", "rejected", "cancelled"),
        nullable=False, default="draft"
    )
    current_approver_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    current_approval_step = Column(Integer, nullable=False, default=0)
    rejection_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="expenses")
    employee = relationship("User", back_populates="expenses", foreign_keys=[employee_id])
    current_approver = relationship("User", foreign_keys=[current_approver_id])
    approvals = relationship("ExpenseApproval", back_populates="expense", order_by="ExpenseApproval.sequence_order")
