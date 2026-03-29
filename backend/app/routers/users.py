from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.utils.auth import get_current_user, hash_password
from app.services import audit_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserOut])
def list_users(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(User).filter(User.company_id == current_user.company_id)
    if current_user.role == "manager":
        team = db.query(User).filter(User.manager_id == current_user.id).all()
        ids = [u.id for u in team] + [current_user.id]
        q = q.filter(User.id.in_(ids))
    return q.all()


@router.post("", response_model=UserOut)
def create_user(body: UserCreate, current_user=Depends(get_current_user),
                db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    user = User(
        company_id=current_user.company_id,
        name=body.name, email=body.email,
        password_hash=hash_password(body.password),
        role=body.role, manager_id=body.manager_id
    )
    db.add(user)
    db.flush()
    audit_service.log_action(db, current_user.company_id, "USER_CREATED",
                              "user", user.id, current_user.id)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id,
                                  User.company_id == current_user.company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, current_user=Depends(get_current_user),
                db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user = db.query(User).filter(User.id == user_id,
                                  User.company_id == current_user.company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.manager_id is not None:
        user.manager_id = body.manager_id
    if body.is_active is not None:
        user.is_active = body.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(user_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user = db.query(User).filter(User.id == user_id,
                                  User.company_id == current_user.company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}
