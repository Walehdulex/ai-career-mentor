import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)

TOKEN_EXPIRY_MINUTES = 15


async def send_job_alert_email(to_email: str, jobs: list):
    """Send email with new job matches"""
    
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Email not configured - skipping")
        return
    
    html_content = f"""
    <html>
    <body>
        <h2>New Job Matches Found!</h2>
        <p>We found {len(jobs)} new jobs that match your preferences:</p>
        <ul>
    """
    
    for job in jobs[:5]:  # Send top 5
        html_content += f"""
        <li>
            <strong>{job['title']}</strong> at {job['company']}<br>
            Match Score: {job['match_score']}%<br>
            Location: {job['location']}<br>
            <a href="{job['apply_url']}">View Job</a>
        </li>
        <br>
        """
    
    html_content += """
        </ul>
        <p>Visit your dashboard to see all matches and apply.</p>
    </body>
    </html>
    """
    
    message = MIMEMultipart("alternative")
    message["Subject"] = f"🎯 {len(jobs)} New Job Matches Available"
    message["From"] = FROM_EMAIL
    message["To"] = to_email
    
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)
    
    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True
        )
        print(f"Alert sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")


async def send_reset_email(to_email: str, name: str, reset_url: str):
    """Send password reset email"""

    if not SMTP_USER or not SMTP_PASSWORD:
        print("Email not configured - skipping reset email")
        return

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#4f46e5;padding:32px 40px;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px;">CareerMentorLab</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">Reset your password</h1>
            <p style="margin:0 0 8px;font-size:15px;color:#6b7280;line-height:1.6;">Hi {name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              We received a request to reset the password for your account.
              Click the button below — this link expires in
              <strong style="color:#374151;">{TOKEN_EXPIRY_MINUTES} minutes</strong>.
            </p>
            <a href="{reset_url}"
               style="display:inline-block;background:#4f46e5;color:#fff;
                      text-decoration:none;padding:12px 28px;border-radius:8px;
                      font-size:15px;font-weight:600;">
              Reset Password
            </a>
            <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
              Didn't request this? You can safely ignore this email — your password won't change.<br><br>
              Or copy this link into your browser:<br>
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
        f"Click the link below to reset your CareerMentorLab password.\n"
        f"It expires in {TOKEN_EXPIRY_MINUTES} minutes.\n\n"
        f"{reset_url}\n\n"
        "Didn't request this? Ignore this email — your password won't change."
    )

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset your CareerMentorLab password"
    message["From"] = FROM_EMAIL
    message["To"] = to_email
    message.attach(MIMEText(plain, "plain"))
    message.attach(MIMEText(html_content, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True
        )
        print(f"Reset email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send reset email: {e}")