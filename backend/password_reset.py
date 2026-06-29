import secrets
import hashlib
import os
import aiosmtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.database import Base, get_db, User, PasswordResetToken
from backend.auth import get_password_hash

router = APIRouter(prefix="/api/auth", tags=["auth"])

TOKEN_EXPIRY_MINUTES = 15


# ── Schemas ───────────────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ── Helper ────────────────────────────────────────────────────────────────────
def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Always 200 — never reveal whether the email exists."""
    user = db.query(User).filter(User.email == payload.email).first()

    if user:
        # Invalidate existing unused tokens
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
        await _send_reset_email(user.email, user.full_name or "there", reset_url)

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


# ── Email sender ──────────────────────────────────────────────────────────────
async def _send_reset_email(to_email: str, name: str, reset_url: str):
    smtp_host     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port     = int(os.getenv("SMTP_PORT", "587"))
    smtp_user     = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER")
    smtp_password = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASSWORD")
    from_email    = os.getenv("FROM_EMAIL") or smtp_user

    if not smtp_user or not smtp_password:
        print("[password_reset] SMTP not configured — skipping email")
        return

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#4f46e5;padding:32px 40px;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">CareerMentorLab</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">Reset your password</h1>
            <p style="margin:0 0 8px;font-size:15px;color:#6b7280;line-height:1.6;">Hi {name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              We received a request to reset your password.
              This link expires in <strong style="color:#374151;">{TOKEN_EXPIRY_MINUTES} minutes</strong>.
            </p>
            <a href="{reset_url}"
               style="display:inline-block;background:#4f46e5;color:#fff;
                      text-decoration:none;padding:12px 28px;border-radius:8px;
                      font-size:15px;font-weight:600;">
              Reset Password
            </a>
            <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
              Didn't request this? You can safely ignore this email.<br><br>
              Or copy this link:<br>
              <a href="{reset_url}" style="color:#4f46e5;word-break:break-all;">{reset_url}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#d1d5db;">© 2025 CareerMentorLab · careermentorlab.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    plain = (
        f"Hi {name},\n\n"
        f"Reset your CareerMentorLab password here:\n{reset_url}\n\n"
        f"Link expires in {TOKEN_EXPIRY_MINUTES} minutes.\n\n"
        "Didn't request this? Ignore this email."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your CareerMentorLab password"
    msg["From"]    = from_email
    msg["To"]      = to_email
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        # Try port 587 with STARTTLS first
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=True,
        )
        print(f"[password_reset] Email sent to {to_email}")
    except Exception as e:
        print(f"[password_reset] Port {smtp_port} failed: {e}")
        # Fallback: try port 465 with SSL (works on Render when 587 is blocked)
        try:
            await aiosmtplib.send(
                msg,
                hostname=smtp_host,
                port=465,
                username=smtp_user,
                password=smtp_password,
                use_tls=True,
            )
            print(f"[password_reset] Email sent via port 465 to {to_email}")
        except Exception as e2:
            print(f"[password_reset] Port 465 also failed: {e2}")