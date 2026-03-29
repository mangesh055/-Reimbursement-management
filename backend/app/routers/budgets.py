from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetOut
from app.utils.auth import get_current_user
from typing import List

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=List[BudgetOut])
def list_budgets(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Budget).filter(Budget.company_id == current_user.company_id,
                                    Budget.is_active == True).all()


@router.post("", response_model=BudgetOut)
def create_budget(body: BudgetCreate, current_user=Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    budget = Budget(company_id=current_user.company_id, **body.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: int, body: BudgetCreate, current_user=Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    budget = db.query(Budget).filter(Budget.id == budget_id,
                                      Budget.company_id == current_user.company_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    for k, v in body.model_dump().items():
        setattr(budget, k, v)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    budget = db.query(Budget).filter(Budget.id == budget_id,
                                      Budget.company_id == current_user.company_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    budget.is_active = False
    db.commit()
    return {"message": "Budget deleted"}
