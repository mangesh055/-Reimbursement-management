from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["admin", "manager", "employee"] = "employee"
    manager_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    company_id: int
    name: str
    email: str
    role: str
    manager_id: Optional[int] = None
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["admin", "manager", "employee"]] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None
