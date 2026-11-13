import os
import aiohttp
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ── Shared sender — tries SendGrid first, falls back to SMTP ─────────────────

async def _send_via_sendgrid(to_email: str, subject: str, html: str, plain: str) -> bool:
    """Send via SendGrid HTTP API — works on Render, no SMTP ports needed."""
    api_key = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("FROM_EMAIL", os.getenv("SMTP_USER", "noreply@careermentorlab.com"))

    if not api_key:
        return False

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": from_email, "name": "CareerMentorLab"},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": plain},
            {"type": "text/html",  "value": html},
        ],
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            ) as resp:
                if resp.status in (200, 202):
                    print(f"[email] Sent via SendGrid to {to_email}")
                    return True
                else:
                    body = await resp.text()
                    print(f"[email] SendGrid error {resp.status}: {body}")
                    return False
    except Exception as e:
        print(f"[email] SendGrid exception: {e}")
        return False


async def _send_via_smtp(to_email: str, subject: str, html: str, plain: str) -> bool:
    """Fallback SMTP sender — works locally, may be blocked on Render."""
    smtp_host     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_user     = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER")
    smtp_password = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASSWORD")
    from_email    = os.getenv("FROM_EMAIL") or smtp_user

    if not smtp_user or not smtp_password:
        print("[email] SMTP not configured")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_email
    msg["To"]      = to_email
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    for port, use_tls, start_tls in [(587, False, True), (465, True, False)]:
        try:
            await aiosmtplib.send(
                msg,
                hostname=smtp_host,
                port=port,
                username=smtp_user,
                password=smtp_password,
                use_tls=use_tls,
                start_tls=start_tls,
                timeout=10,
            )
            print(f"[email] Sent via SMTP port {port} to {to_email}")
            return True
        except Exception as e:
            print(f"[email] SMTP port {port} failed: {e}")

    return False


async def send_email(to_email: str, subject: str, html: str, plain: str) -> None:
    """Main email sender — tries SendGrid first, falls back to SMTP."""
    sent = await _send_via_sendgrid(to_email, subject, html, plain)
    if not sent:
        await _send_via_smtp(to_email, subject, html, plain)


# ── Job alert email ───────────────────────────────────────────────────────────
async def send_job_alert_email(to_email: str, jobs: list):
    """Send job match alert email."""
    if not jobs:
        return

    jobs_html = ""
    for job in jobs[:5]:
        jobs_html += f"""
        <li style="margin-bottom:16px;padding:16px;background:#f9fafb;border-radius:8px;list-style:none;">
          <strong style="color:#111827;">{job['title']}</strong> at {job['company']}<br>
          <span style="color:#6b7280;font-size:13px;">
            Match: <strong style="color:#4f46e5;">{job['match_score']}%</strong> ·
            {job.get('location', '')}
          </span><br>
          <a href="{job.get('apply_url', '#')}"
             style="color:#4f46e5;font-size:13px;text-decoration:none;">View job →</a>
        </li>"""

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#4f46e5;padding:28px 40px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">CareerMentorLab</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">🎯 {len(jobs)} New Job Matches</h1>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
              We found jobs that match your profile. Here are the top picks:
            </p>
            <ul style="padding:0;margin:0;">{jobs_html}</ul>
            <div style="margin-top:24px;text-align:center;">
              <a href="https://careermentorlab.com/dashboard/jobs"
                 style="display:inline-block;background:#4f46e5;color:#fff;
                        text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">
                View All Matches
              </a>
            </div>
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
</body></html>"""

    plain = f"You have {len(jobs)} new job matches on CareerMentorLab.\n\nVisit: https://careermentorlab.com/dashboard/jobs"

    await send_email(to_email, f"🎯 {len(jobs)} New Job Matches", html, plain)


# ── Password reset email ──────────────────────────────────────────────────────
async def send_reset_email(to_email: str, name: str, reset_url: str):
    """Send password reset email."""
    TOKEN_EXPIRY_MINUTES = 15

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#4f46e5;padding:28px 40px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">CareerMentorLab</p>
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
</body></html>"""

    plain = (
        f"Hi {name},\n\n"
        f"Reset your CareerMentorLab password here:\n{reset_url}\n\n"
        f"Link expires in {TOKEN_EXPIRY_MINUTES} minutes.\n\n"
        "Didn't request this? Ignore this email."
    )

    await send_email(to_email, "Reset your CareerMentorLab password", html, plain)