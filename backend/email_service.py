import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)

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