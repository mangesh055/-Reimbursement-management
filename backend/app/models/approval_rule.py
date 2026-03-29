from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Enum, ForeignKey, Text, SmallInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class ApprovalRule(Base):
    __tablename__ = "approval_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    min_amount = Column(Numeric(12, 2), nullable=True)
    max_amount = Column(Numeric(12, 2), nullable=True)
    is_manager_approver = Column(Boolean, nullable=False, default=True)
    approval_mode = Column(Enum("sequential", "conditional", "hybrid"), nullable=False, default="sequential")
    minimum_approval_percentage = Column(SmallInteger, nullable=True)
    specific_approver_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="approval_rules")
    specific_approver = relationship("User", foreign_keys=[specific_approver_id])
    approvers = relationship("ApprovalRuleApprover", back_populates="rule", order_by="ApprovalRuleApprover.sequence_order")


class ApprovalRuleApprover(Base):
    __tablename__ = "approval_rule_approvers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rule_id = Column(Integer, ForeignKey("approval_rules.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sequence_order = Column(Integer, nullable=False, default=1)
    is_required = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    rule = relationship("ApprovalRule", back_populates="approvers")
    user = relationship("User")
