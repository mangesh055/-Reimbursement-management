from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from app.database import get_db
from app.utils.auth import get_current_user
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def dashboard(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return analytics_service.get_dashboard_summary(
        current_user.id, current_user.role, current_user.company_id, db)


@router.get("/spend-by-category")
def spend_by_category(
    start_date: Optional[date] = None, end_date: Optional[date] = None,
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    return analytics_service.get_spend_by_category(current_user.company_id, start_date, end_date, db)


@router.get("/spend-trend")
def spend_trend(months: int = 6, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return analytics_service.get_spend_trend(current_user.company_id, months, db)


@router.get("/budget-utilization")
def budget_utilization(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return analytics_service.get_budget_utilization(current_user.company_id, db)


@router.get("/top-spenders")
def top_spenders(limit: int = 10, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return analytics_service.get_top_spenders(current_user.company_id, limit, db)
