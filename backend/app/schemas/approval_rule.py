from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal


class ApproverItem(BaseModel):
    user_id: int
    sequence_order: int
    is_required: bool = True


class ApprovalRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    is_manager_approver: bool = True
    approval_mode: Literal["sequential", "conditional", "hybrid"] = "sequential"
    minimum_approval_percentage: Optional[int] = None
    specific_approver_id: Optional[int] = None
    approvers: List[ApproverItem] = []


class ApprovalRuleOut(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    is_manager_approver: bool
    approval_mode: str
    minimum_approval_percentage: Optional[int] = None
    specific_approver_id: Optional[int] = None
    is_active: bool
    approvers: List[dict] = []
    created_at: datetime

    model_config = {"from_attributes": True}
