from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CompanyCreate(BaseModel):
    name: str
    country: str
    currency_code: str = "USD"
    currency_symbol: str = "$"
    expense_policy_text: Optional[str] = None


class CompanyOut(BaseModel):
    id: int
    name: str
    country: str
    currency_code: str
    currency_symbol: str
    logo_url: Optional[str] = None
    expense_policy_text: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    expense_policy_text: Optional[str] = None
    logo_url: Optional[str] = None
