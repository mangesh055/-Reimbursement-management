import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.auth import get_current_user
from app.services import gemini_service, analytics_service
from app.models.expense import Expense
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])

UPLOAD_DIR = "uploads"


@router.post("/ocr")
async def ocr_receipt(file: UploadFile = File(...),
                      current_user=Depends(get_current_user)):
    tmpdir = os.path.join(UPLOAD_DIR, "tmp")
    os.makedirs(tmpdir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    tmppath = os.path.join(tmpdir, f"{uuid.uuid4()}{ext}")
    content = await file.read()
    with open(tmppath, "wb") as f:
        f.write(content)
    try:
        result = gemini_service.ocr_receipt(tmppath)
    finally:
        try:
            os.remove(tmppath)
        except Exception:
            pass
    return result


@router.post("/categorize")
def categorize(body: dict, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.company import Company
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    result = gemini_service.categorize_expense(
        body.get("title", ""),
        body.get("description", ""),
        body.get("vendor"),
        body.get("line_items", []),
        company.expense_policy_text if company else None
    )
    return result


@router.post("/chat")
def chat(body: dict, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.company import Company
    from app.models.expense import Expense
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    # Build expense summary context
    expenses = (db.query(Expense)
                .filter(Expense.employee_id == current_user.id)
                .order_by(Expense.created_at.desc())
                .limit(50).all())
    by_category = {}
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, 0) + float(e.amount_in_company_currency)
    pending = [e for e in expenses if e.status == "pending"]
    approved_total = sum(float(e.amount_in_company_currency) for e in expenses if e.status == "approved")
    recent = analytics_service.get_recent_expenses_for_employee(current_user.id, 5, db)
    context = {
        "name": current_user.name,
        "role": current_user.role,
        "company_currency": f"{company.currency_code} ({company.currency_symbol})" if company else "USD",
        "expenses_summary": {
            "total_submitted": len(expenses),
            "pending_count": len(pending),
            "approved_total": approved_total,
            "by_category": by_category,
            "recent_expenses": recent
        }
    }
    response = gemini_service.chat_with_ai(body.get("message", ""), context)
    return {"response": response}
