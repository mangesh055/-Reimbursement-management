from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.audit_log import AuditLog
from app.utils.auth import get_current_user

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("")
def list_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    page: int = 1, limit: int = 50,
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin only")
    q = db.query(AuditLog).filter(AuditLog.company_id == current_user.company_id)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "items": [{
            "id": l.id, "action": l.action, "entity_type": l.entity_type,
            "entity_id": l.entity_id, "user_id": l.user_id,
            "details": l.details, "created_at": l.created_at.isoformat()
        } for l in logs],
        "total": total, "page": page, "limit": limit
    }
