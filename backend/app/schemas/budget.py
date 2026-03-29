from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date
from decimal import Decimal


class BudgetCreate(BaseModel):
    department_name: str
    category: Optional[str] = None
    budget_amount: Decimal
    period: Literal["monthly", "quarterly", "yearly"] = "monthly"
    period_start: date
    period_end: date


class BudgetOut(BaseModel):
    id: int
    company_id: int
    department_name: str
    category: Optional[str] = None
    budget_amount: Decimal
    period: str
    period_start: date
    period_end: date
    is_active: bool

    model_config = {"from_attributes": True}
