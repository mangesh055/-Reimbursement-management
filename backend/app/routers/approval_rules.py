from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.approval_rule import ApprovalRule, ApprovalRuleApprover
from app.schemas.approval_rule import ApprovalRuleCreate, ApprovalRuleOut
from app.utils.auth import get_current_user
from app.services import audit_service

router = APIRouter(prefix="/approval-rules", tags=["approval-rules"])


def _serialize_rule(rule: ApprovalRule) -> dict:
    return {
        "id": rule.id, "company_id": rule.company_id, "name": rule.name,
        "description": rule.description, "category": rule.category,
        "min_amount": float(rule.min_amount) if rule.min_amount else None,
        "max_amount": float(rule.max_amount) if rule.max_amount else None,
        "is_manager_approver": rule.is_manager_approver,
        "approval_mode": rule.approval_mode,
        "minimum_approval_percentage": rule.minimum_approval_percentage,
        "specific_approver_id": rule.specific_approver_id,
        "is_active": rule.is_active,
        "created_at": rule.created_at.isoformat(),
        "approvers": [{"id": a.id, "user_id": a.user_id,
                       "approver_name": a.user.name if a.user else "",
                       "sequence_order": a.sequence_order,
                       "is_required": a.is_required}
                      for a in rule.approvers]
    }


@router.get("")
def list_rules(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    rules = db.query(ApprovalRule).filter(
        ApprovalRule.company_id == current_user.company_id).all()
    return [_serialize_rule(r) for r in rules]


@router.post("")
def create_rule(body: ApprovalRuleCreate, current_user=Depends(get_current_user),
                db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    rule = ApprovalRule(
        company_id=current_user.company_id,
        name=body.name, description=body.description,
        category=body.category, min_amount=body.min_amount, max_amount=body.max_amount,
        is_manager_approver=body.is_manager_approver,
        approval_mode=body.approval_mode,
        minimum_approval_percentage=body.minimum_approval_percentage,
        specific_approver_id=body.specific_approver_id
    )
    db.add(rule)
    db.flush()
    for a in body.approvers:
        db.add(ApprovalRuleApprover(rule_id=rule.id, user_id=a.user_id,
                                     sequence_order=a.sequence_order, is_required=a.is_required))
    audit_service.log_action(db, current_user.company_id, "RULE_CREATED",
                              "approval_rule", rule.id, current_user.id)
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)


@router.get("/{rule_id}")
def get_rule(rule_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    rule = db.query(ApprovalRule).filter(ApprovalRule.id == rule_id,
                                          ApprovalRule.company_id == current_user.company_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return _serialize_rule(rule)


@router.put("/{rule_id}")
def update_rule(rule_id: int, body: ApprovalRuleCreate, current_user=Depends(get_current_user),
                db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    rule = db.query(ApprovalRule).filter(ApprovalRule.id == rule_id,
                                          ApprovalRule.company_id == current_user.company_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.name = body.name
    rule.description = body.description
    rule.category = body.category
    rule.min_amount = body.min_amount
    rule.max_amount = body.max_amount
    rule.is_manager_approver = body.is_manager_approver
    rule.approval_mode = body.approval_mode
    rule.minimum_approval_percentage = body.minimum_approval_percentage
    rule.specific_approver_id = body.specific_approver_id
    # Replace approvers
    db.query(ApprovalRuleApprover).filter(ApprovalRuleApprover.rule_id == rule.id).delete()
    for a in body.approvers:
        db.add(ApprovalRuleApprover(rule_id=rule.id, user_id=a.user_id,
                                     sequence_order=a.sequence_order, is_required=a.is_required))
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)


@router.delete("/{rule_id}")
def delete_rule(rule_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    rule = db.query(ApprovalRule).filter(ApprovalRule.id == rule_id,
                                          ApprovalRule.company_id == current_user.company_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.is_active = False
    db.commit()
    return {"message": "Rule deactivated"}
