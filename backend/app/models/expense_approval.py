from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class ExpenseApproval(Base):
    __tablename__ = "expense_approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(Integer, ForeignKey("approval_rules.id", ondelete="SET NULL"), nullable=True)
    approver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sequence_order = Column(Integer, nullable=False, default=1)
    status = Column(Enum("pending", "approved", "rejected", "skipped"), nullable=False, default="pending")
    comments = Column(Text, nullable=True)
    ai_assist_shown = Column(Boolean, nullable=False, default=False)
    ai_assist_text = Column(Text, nullable=True)
    actioned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    expense = relationship("Expense", back_populates="approvals")
    approver = relationship("User")
    rule = relationship("ApprovalRule")
