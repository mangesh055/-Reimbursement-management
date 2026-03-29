import os
import uuid
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import csv

from app.database import get_db
from app.models.expense import Expense
from app.models.company import Company
from app.models.user import User
from app.schemas.expense import ExpenseOut, ExpenseCreate, ExpenseUpdate
from app.utils.auth import get_current_user
from app.services import currency_service, audit_service, approval_service
from app.services import gemini_service

router = APIRouter(prefix="/expenses", tags=["expenses"])

UPLOAD_DIR = "uploads"


def _serialize_expense(exp: Expense) -> dict:
    approvals = []
    for a in exp.approvals:
        approvals.append({
            "id": a.id,
            "approver_id": a.approver_id,
            "approver_name": a.approver.name if a.approver else "Unknown",
            "sequence_order": a.sequence_order,
            "status": a.status,
            "comments": a.comments,
            "actioned_at": a.actioned_at.isoformat() if a.actioned_at else None,
            "ai_assist_text": a.ai_assist_text,
        })
    return {
        "id": exp.id, "company_id": exp.company_id, "employee_id": exp.employee_id,
        "employee_name": exp.employee.name if exp.employee else None,
        "title": exp.title, "amount": float(exp.amount), "currency": exp.currency,
        "amount_in_company_currency": float(exp.amount_in_company_currency),
        "exchange_rate": float(exp.exchange_rate), "category": exp.category,
        "ai_suggested_category": exp.ai_suggested_category,
        "ai_category_confidence": float(exp.ai_category_confidence) if exp.ai_category_confidence else None,
        "description": exp.description, "expense_date": str(exp.expense_date),
        "receipt_url": exp.receipt_url, "vendor_name": exp.vendor_name,
        "policy_flags": exp.policy_flags or [],
        "risk_score": exp.risk_score, "risk_reason": exp.risk_reason,
        "is_duplicate_flag": exp.is_duplicate_flag, "status": exp.status,
        "current_approver_id": exp.current_approver_id,
        "current_approval_step": exp.current_approval_step,
        "rejection_reason": exp.rejection_reason,
        "submitted_at": exp.submitted_at.isoformat() if exp.submitted_at else None,
        "approved_at": exp.approved_at.isoformat() if exp.approved_at else None,
        "created_at": exp.created_at.isoformat(),
        "approvals": approvals,
    }


@router.get("")
def list_expenses(
    status: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1, limit: int = 20,
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    q = db.query(Expense).filter(Expense.company_id == current_user.company_id)
    if current_user.role == "employee":
        q = q.filter(Expense.employee_id == current_user.id)
    elif current_user.role == "manager":
        team_ids = [u.id for u in db.query(User).filter(User.manager_id == current_user.id).all()]
        team_ids.append(current_user.id)
        q = q.filter(Expense.employee_id.in_(team_ids))
    if status:
        q = q.filter(Expense.status == status)
    if category:
        q = q.filter(Expense.category == category)
    if start_date:
        q = q.filter(Expense.expense_date >= start_date)
    if end_date:
        q = q.filter(Expense.expense_date <= end_date)
    total = q.count()
    expenses = q.order_by(Expense.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": [_serialize_expense(e) for e in expenses], "total": total, "page": page, "limit": limit}


@router.post("")
async def create_expense(
    title: str = Form(...),
    amount: float = Form(...),
    currency: str = Form(...),
    category: str = Form("Miscellaneous"),
    description: Optional[str] = Form(None),
    expense_date: str = Form(...),
    vendor_name: Optional[str] = Form(None),
    receipt: Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    ocr_data = None
    receipt_url = None

    # Handle file upload + OCR
    if receipt and receipt.filename:
        company_upload_dir = os.path.join(UPLOAD_DIR, str(current_user.company_id))
        os.makedirs(company_upload_dir, exist_ok=True)
        ext = os.path.splitext(receipt.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(company_upload_dir, filename)
        content = await receipt.read()
        with open(filepath, "wb") as f:
            f.write(content)
        receipt_url = f"/uploads/{current_user.company_id}/{filename}"
        try:
            ocr_data = gemini_service.ocr_receipt(filepath)
            if not vendor_name and ocr_data.get("vendor_name"):
                vendor_name = ocr_data["vendor_name"]
        except Exception:
            pass

    # Currency conversion
    parsed_date = date.fromisoformat(expense_date)
    conv = await currency_service.convert_currency(amount, currency, company.currency_code, db)

    # AI categorization
    ai_result = gemini_service.categorize_expense(
        title, description or "", vendor_name,
        ocr_data.get("line_items", []) if ocr_data else [],
        company.expense_policy_text
    )

    # Duplicate check
    from sqlalchemy import and_
    dup = db.query(Expense).filter(
        Expense.employee_id == current_user.id,
        Expense.expense_date == parsed_date,
        Expense.status.not_in(["rejected", "cancelled"]),
        Expense.amount.between(amount * 0.95, amount * 1.05),
        Expense.currency == currency
    ).first()

    expense = Expense(
        company_id=current_user.company_id,
        employee_id=current_user.id,
        title=title, amount=amount, currency=currency,
        amount_in_company_currency=conv["converted_amount"],
        exchange_rate=conv["exchange_rate"],
        category=category,
        ai_suggested_category=ai_result.get("suggested_category"),
        ai_category_confidence=ai_result.get("confidence"),
        description=description,
        expense_date=parsed_date,
        receipt_url=receipt_url,
        ocr_raw_data=ocr_data,
        vendor_name=vendor_name,
        policy_flags=ai_result.get("policy_flags", []),
        risk_score=ai_result.get("risk_score", 0),
        risk_reason=ai_result.get("risk_reason"),
        is_duplicate_flag=bool(dup),
        duplicate_of_expense_id=dup.id if dup else None,
        status="draft"
    )
    db.add(expense)
    db.flush()
    audit_service.log_action(db, current_user.company_id, "EXPENSE_CREATED",
                              "expense", expense.id, current_user.id)
    db.commit()
    db.refresh(expense)
    return _serialize_expense(expense)


@router.get("/export")
def export_expenses(
    format: str = "csv",
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    if current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not allowed")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    q = db.query(Expense).filter(Expense.company_id == current_user.company_id)
    if status:
        q = q.filter(Expense.status == status)
    if start_date:
        q = q.filter(Expense.expense_date >= start_date)
    if end_date:
        q = q.filter(Expense.expense_date <= end_date)
    expenses = q.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Employee", "Title", "Amount", "Currency",
                     f"Amount ({company.currency_code})", "Category",
                     "Date", "Status", "Vendor", "Risk Score", "Submitted At"])
    for e in expenses:
        writer.writerow([e.id, e.employee.name if e.employee else "", e.title,
                         e.amount, e.currency, e.amount_in_company_currency,
                         e.category, e.expense_date, e.status, e.vendor_name or "",
                         e.risk_score, e.submitted_at or ""])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()),
                              media_type="text/csv",
                              headers={"Content-Disposition": "attachment; filename=expenses.csv"})


@router.get("/{expense_id}")
def get_expense(expense_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id,
                                    Expense.company_id == current_user.company_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _serialize_expense(exp)


@router.put("/{expense_id}")
async def update_expense(
    expense_id: int,
    body: ExpenseUpdate,
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    exp = db.query(Expense).filter(Expense.id == expense_id,
                                    Expense.employee_id == current_user.id,
                                    Expense.status == "draft").first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found or not editable")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if body.title is not None:
        exp.title = body.title
    if body.description is not None:
        exp.description = body.description
    if body.vendor_name is not None:
        exp.vendor_name = body.vendor_name
    if body.expense_date is not None:
        exp.expense_date = body.expense_date
    if body.category is not None:
        exp.category = body.category
    if body.amount is not None or body.currency is not None:
        amount = float(body.amount) if body.amount else float(exp.amount)
        currency = body.currency or exp.currency
        conv = await currency_service.convert_currency(amount, currency, company.currency_code, db)
        exp.amount = amount
        exp.currency = currency
        exp.amount_in_company_currency = conv["converted_amount"]
        exp.exchange_rate = conv["exchange_rate"]
    db.commit()
    db.refresh(exp)
    return _serialize_expense(exp)


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id,
                                    Expense.employee_id == current_user.id,
                                    Expense.status == "draft").first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found or not deletable")
    db.delete(exp)
    db.commit()
    return {"message": "Deleted"}


@router.post("/{expense_id}/submit")
def submit_expense(expense_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id,
                                    Expense.employee_id == current_user.id,
                                    Expense.status == "draft").first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found or already submitted")
    rule = approval_service.find_matching_rule(exp, db)
    steps = approval_service.build_approval_chain(exp, rule, db)
    if not steps:
        exp.status = "approved"
        exp.approved_at = datetime.utcnow()
    else:
        exp.status = "pending"
        exp.submitted_at = datetime.utcnow()
    audit_service.log_action(db, current_user.company_id, "EXPENSE_SUBMITTED",
                              "expense", exp.id, current_user.id)
    db.commit()
    db.refresh(exp)
    return _serialize_expense(exp)


@router.post("/{expense_id}/cancel")
def cancel_expense(expense_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id,
                                    Expense.employee_id == current_user.id,
                                    Expense.status.in_(["draft", "pending"])).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found or not cancellable")
    exp.status = "cancelled"
    db.commit()
    return {"message": "Cancelled"}
