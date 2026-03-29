from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import Notification
from app.utils.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = (db.query(Notification)
              .filter(Notification.user_id == current_user.id)
              .order_by(Notification.created_at.desc())
              .limit(50).all())
    return [{
        "id": n.id, "title": n.title, "body": n.body,
        "is_read": n.is_read, "expense_id": n.expense_id,
        "created_at": n.created_at.isoformat()
    } for n in notifs]


@router.put("/{notif_id}/read")
def mark_read(notif_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id,
                                       Notification.user_id == current_user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "Marked read"}


@router.put("/read-all")
def mark_all_read(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id,
                                   Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All marked read"}
