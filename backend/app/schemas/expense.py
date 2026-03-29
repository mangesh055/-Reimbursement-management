from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime, date
from decimal import Decimal


EXPENSE_CATEGORIES = ["Travel", "Meals", "Accommodation", "Office Supplies",
                       "Entertainment", "Training", "Medical", "Miscellaneous"]


class ExpenseCreate(BaseModel):
    title: str
    amount: Decimal
    currency: str
    category: str = "Miscellaneous"
    description: Optional[str] = None
    expense_date: date
    vendor_name: Optional[str] = None


class ApprovalStepOut(BaseModel):
    id: int
    approver_id: int
    approver_name: str
    sequence_order: int
    status: str
    comments: Optional[str] = None
    actioned_at: Optional[datetime] = None
    ai_assist_text: Optional[str] = None

    model_config = {"from_attributes": True}


class ExpenseOut(BaseModel):
    id: int
    company_id: int
    employee_id: int
    employee_name: Optional[str] = None
    title: str
    amount: Decimal
    currency: str
    amount_in_company_currency: Decimal
    exchange_rate: Decimal
    category: str
    ai_suggested_category: Optional[str] = None
    ai_category_confidence: Optional[Decimal] = None
    description: Optional[str] = None
    expense_date: date
    receipt_url: Optional[str] = None
    vendor_name: Optional[str] = None
    policy_flags: Optional[Any] = None
    risk_score: Optional[int] = None
    risk_reason: Optional[str] = None
    is_duplicate_flag: bool
    status: str
    current_approver_id: Optional[int] = None
    current_approval_step: int
    rejection_reason: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    approvals: Optional[List[ApprovalStepOut]] = []

    model_config = {"from_attributes": True}


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None
    vendor_name: Optional[str] = None
