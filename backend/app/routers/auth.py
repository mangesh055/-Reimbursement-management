from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse
from app.models.user import User
from app.models.company import Company
from app.utils.auth import (hash_password, verify_password, create_access_token, get_current_user)
from app.services import currency_service, audit_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
async def signup(body: SignupRequest, db: Session = Depends(get_db)):
    # Check email not already in use globally
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Get currency for country
    currency_info = await currency_service.get_currency_for_country(body.country)

    # Create company
    company = Company(
        name=body.company_name,
        country=body.country,
        currency_code=currency_info["currency_code"],
        currency_symbol=currency_info["currency_symbol"]
    )
    db.add(company)
    db.flush()

    # Create admin user
    user = User(
        company_id=company.id,
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role="admin"
    )
    db.add(user)
    db.flush()

    audit_service.log_action(db, company.id, "COMPANY_CREATED", "company", company.id, user.id)
    audit_service.log_action(db, company.id, "USER_CREATED", "user", user.id, user.id)
    db.commit()
    db.refresh(user)
    db.refresh(company)

    token = create_access_token({"user_id": user.id, "company_id": company.id, "role": user.role})
    return {
        "access_token": token, "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "company": {"id": company.id, "name": company.name,
                    "currency_code": company.currency_code, "currency_symbol": company.currency_symbol}
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    company = db.query(Company).filter(Company.id == user.company_id).first()
    token = create_access_token({"user_id": user.id, "company_id": user.company_id, "role": user.role})
    return {
        "access_token": token, "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "company": {"id": company.id, "name": company.name,
                    "currency_code": company.currency_code, "currency_symbol": company.currency_symbol}
    }


@router.get("/me")
def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    return {
        "user": {"id": current_user.id, "name": current_user.name,
                 "email": current_user.email, "role": current_user.role,
                 "manager_id": current_user.manager_id, "avatar_url": current_user.avatar_url},
        "company": {"id": company.id, "name": company.name,
                    "currency_code": company.currency_code, "currency_symbol": company.currency_symbol,
                    "expense_policy_text": company.expense_policy_text}
    }
