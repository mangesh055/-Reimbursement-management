from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.company import Company
from app.schemas.company import CompanyOut, CompanyUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/me", response_model=CompanyOut)
def get_my_company(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/me", response_model=CompanyOut)
def update_my_company(body: CompanyUpdate, current_user=Depends(get_current_user),
                       db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if body.name is not None:
        company.name = body.name
    if body.expense_policy_text is not None:
        company.expense_policy_text = body.expense_policy_text
    if body.logo_url is not None:
        company.logo_url = body.logo_url
    db.commit()
    db.refresh(company)
    return company
