from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import Optional, List
from datetime import date, datetime, timedelta
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.user import User


def get_dashboard_summary(user_id: int, role: str, company_id: int, db: Session) -> dict:
    base = db.query(Expense).filter(Expense.company_id == company_id)
    if role == "employee":
        base = base.filter(Expense.employee_id == user_id)
    elif role == "manager":
        team_ids = [u.id for u in db.query(User).filter(User.manager_id == user_id).all()]
        team_ids.append(user_id)
        base = base.filter(Expense.employee_id.in_(team_ids))

    total = base.count()
    pending = base.filter(Expense.status == "pending").count()
    approved = base.filter(Expense.status == "approved").count()
    rejected = base.filter(Expense.status == "rejected").count()
    year_start = date(datetime.now().year, 1, 1)
    approved_ytd = (db.query(func.sum(Expense.amount_in_company_currency))
                    .filter(Expense.company_id == company_id,
                            Expense.status == "approved",
                            Expense.expense_date >= year_start)
                    .scalar() or 0)
    if role == "manager":
        team_ids = [u.id for u in db.query(User).filter(User.manager_id == user_id).all()]
        pending_for_me = (db.query(Expense)
                          .filter(Expense.company_id == company_id,
                                  Expense.current_approver_id == user_id,
                                  Expense.status == "pending")
                          .count())
    else:
        pending_for_me = 0

    return {
        "total": total, "pending": pending, "approved": approved,
        "rejected": rejected, "approved_ytd": float(approved_ytd),
        "pending_for_me": pending_for_me
    }


def get_spend_by_category(company_id: int, start_date: Optional[date],
                           end_date: Optional[date], db: Session) -> list:
    q = (db.query(Expense.category, func.sum(Expense.amount_in_company_currency).label("total"))
         .filter(Expense.company_id == company_id, Expense.status == "approved"))
    if start_date:
        q = q.filter(Expense.expense_date >= start_date)
    if end_date:
        q = q.filter(Expense.expense_date <= end_date)
    rows = q.group_by(Expense.category).all()
    return [{"category": r.category, "total": float(r.total)} for r in rows]


def get_spend_trend(company_id: int, months: int, db: Session) -> list:
    results = []
    now = datetime.now()
    for i in range(months - 1, -1, -1):
        m = (now.month - i - 1) % 12 + 1
        y = now.year - ((now.month - i - 1) // 12)
        start = date(y, m, 1)
        if m == 12:
            end = date(y + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(y, m + 1, 1) - timedelta(days=1)
        total = (db.query(func.sum(Expense.amount_in_company_currency))
                 .filter(Expense.company_id == company_id,
                         Expense.status == "approved",
                         Expense.expense_date >= start,
                         Expense.expense_date <= end)
                 .scalar() or 0)
        results.append({"month": start.strftime("%b %Y"), "total": float(total)})
    return results


def get_employee_category_avg(employee_id: int, category: str,
                               months: int, db: Session) -> float:
    cutoff = date.today() - timedelta(days=months * 30)
    total = (db.query(func.sum(Expense.amount_in_company_currency))
             .filter(Expense.employee_id == employee_id,
                     Expense.category == category,
                     Expense.status == "approved",
                     Expense.expense_date >= cutoff)
             .scalar() or 0)
    count = (db.query(func.count(Expense.id))
             .filter(Expense.employee_id == employee_id,
                     Expense.category == category,
                     Expense.status == "approved",
                     Expense.expense_date >= cutoff)
             .scalar() or 1)
    return float(total) / max(count, 1)


def get_budget_utilization(company_id: int, db: Session) -> list:
    today = date.today()
    budgets = (db.query(Budget)
               .filter(Budget.company_id == company_id,
                       Budget.is_active == True,
                       Budget.period_start <= today,
                       Budget.period_end >= today)
               .all())
    results = []
    for b in budgets:
        q = (db.query(func.sum(Expense.amount_in_company_currency))
             .filter(Expense.company_id == company_id,
                     Expense.status == "approved",
                     Expense.expense_date >= b.period_start,
                     Expense.expense_date <= b.period_end))
        if b.category:
            q = q.filter(Expense.category == b.category)
        spent = float(q.scalar() or 0)
        budget_amt = float(b.budget_amount)
        results.append({
            "id": b.id, "department": b.department_name, "category": b.category,
            "budget": budget_amt, "spent": spent,
            "pct_used": round(spent / budget_amt * 100, 1) if budget_amt > 0 else 0
        })
    return results


def get_top_spenders(company_id: int, limit: int, db: Session) -> list:
    rows = (db.query(User.name, func.sum(Expense.amount_in_company_currency).label("total"))
            .join(Expense, Expense.employee_id == User.id)
            .filter(Expense.company_id == company_id, Expense.status == "approved")
            .group_by(User.id, User.name)
            .order_by(func.sum(Expense.amount_in_company_currency).desc())
            .limit(limit)
            .all())
    return [{"name": r.name, "total": float(r.total)} for r in rows]


def get_recent_expenses_for_employee(employee_id: int, limit: int, db: Session) -> list:
    exps = (db.query(Expense)
            .filter(Expense.employee_id == employee_id, Expense.status == "approved")
            .order_by(Expense.expense_date.desc())
            .limit(limit)
            .all())
    return [{"title": e.title, "amount": float(e.amount_in_company_currency),
             "category": e.category, "date": str(e.expense_date)} for e in exps]
