from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from typing import Optional


def log_action(db: Session, company_id: int, action: str, entity_type: str,
               entity_id: int, user_id: Optional[int] = None,
               details: Optional[dict] = None, ip_address: Optional[str] = None):
    """Append an audit log entry."""
    entry = AuditLog(
        company_id=company_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address
    )
    db.add(entry)
    # Note: caller is responsible for db.commit()
