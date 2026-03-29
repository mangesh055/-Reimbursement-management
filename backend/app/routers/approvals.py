from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.expense import Expense
from app.models.expense_approval import ExpenseApproval
from app.utils.auth import get_current_user
from app.services import approval_service, analytics_service, audit_service
from app.services import gemini_service

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("/pending")
def get_pending_approvals(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    expenses = (db.query(Expense)
                .filter(Expense.company_id == current_user.company_id,
                        Expense.current_approver_id == current_user.id,
                        Expense.status == "pending")
                .order_by(Expense.submitted_at.desc())
                .all())
    results = []
    for e in expenses:
        results.append({
            "id": e.id, "title": e.title,
            "amount": float(e.amount_in_company_currency),
            "currency": e.currency, "category": e.category,
            "employee_id": e.employee_id,
            "employee_name": e.employee.name if e.employee else "Unknown",
            "risk_score": e.risk_score, "policy_flags": e.policy_flags or [],
            "submitted_at": e.submitted_at.isoformat() if e.submitted_at else None,
            "expense_date": str(e.expense_date), "receipt_url": e.receipt_url,
            "description": e.description, "vendor_name": e.vendor_name,
        })
    return results


@router.post("/{expense_id}/action")
def action_approval(expense_id: int, body: dict, current_user=Depends(get_current_user),
                    db: Session = Depends(get_db)):
    action = body.get("action")
    comments = body.get("comments", "")
    if action not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="action must be 'approved' or 'rejected'")
    try:
        expense = approval_service.process_approval_action(
            expense_id, current_user.id, action, comments, db)
        return {"message": f"Expense {action}", "status": expense.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/assist/{expense_id}")
def get_ai_assist(expense_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not allowed")
    expense = db.query(Expense).filter(Expense.id == expense_id,
                                        Expense.company_id == current_user.company_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check cached assist text
    approval_row = (db.query(ExpenseApproval)
                    .filter(ExpenseApproval.expense_id == expense_id,
                            ExpenseApproval.approver_id == current_user.id)
                    .first())
    if approval_row and approval_row.ai_assist_text:
        return {"summary": approval_row.ai_assist_text}

    avg = analytics_service.get_employee_category_avg(
        expense.employee_id, expense.category, 6, db)
    pct_diff = ((float(expense.amount_in_company_currency) - avg) / avg * 100) if avg > 0 else 0
    recent = analytics_service.get_recent_expenses_for_employee(expense.employee_id, 5, db)
    company = expense.company

    summary = gemini_service.generate_manager_assist_summary(
        expense_title=expense.title,
        expense_amount=float(expense.amount_in_company_currency),
        category=expense.category,
        company_currency=company.currency_code,
        avg_amount=avg,
        pct_diff=pct_diff,
        ocr_confidence=expense.ocr_raw_data.get("ocr_confidence", 0) if expense.ocr_raw_data else 0,
        policy_flags=expense.policy_flags or [],
        risk_score=expense.risk_score or 0,
        recent_expenses=recent
    )

    if approval_row:
        approval_row.ai_assist_text = summary
        approval_row.ai_assist_shown = True
        db.commit()

    return {"summary": summary}
