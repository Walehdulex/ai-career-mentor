import secrets
import hashlib
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.database import Base, get_db, User, PasswordResetToken
from backend.auth import get_password_hash
from backend.email_service import send_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

TOKEN_EXPIRY_MINUTES = 15


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if user:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == str(user.id),
            PasswordResetToken.used == False,  # noqa: E712
        ).delete(synchronize_session=False)

        raw_token  = secrets.token_urlsafe(32)
        token_hash = _hash_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)

        db.add(PasswordResetToken(
            token_hash=token_hash,
            user_id=str(user.id),
            expires_at=expires_at,
            used=False,
        ))
        db.commit()

        reset_url = f"https://careermentorlab.com/reset-password?token={raw_token}"
        await send_reset_email(user.email, user.full_name or "there", reset_url)

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    token_hash = _hash_token(payload.token)
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash
    ).first()

    _invalid = HTTPException(status_code=400, detail="This reset link is invalid or has expired.")

    if not record or record.used:
        raise _invalid
    if datetime.utcnow() > record.expires_at:
        raise _invalid
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")

    user = db.query(User).filter(User.id == int(record.user_id)).first()
    if not user:
        raise _invalid

    user.hashed_password = get_password_hash(payload.new_password)
    record.used = True
    db.commit()

    return {"message": "Password updated successfully. You can now log in."}