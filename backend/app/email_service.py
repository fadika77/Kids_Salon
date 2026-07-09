import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SMTP config from environment
# ---------------------------------------------------------------------------
SMTP_HOST      = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT      = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME  = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD  = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM      = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME)
ADMIN_EMAIL    = os.getenv("ADMIN_DEFAULT_EMAIL", "")


# ---------------------------------------------------------------------------
# Core send function
# ---------------------------------------------------------------------------
def _send_email(to: str, subject: str, html_body: str) -> bool:
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured – skipping email to %s", to)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = SMTP_FROM
    msg["To"]      = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to, msg.as_string())
        logger.info("Email sent to %s – %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
APPOINTMENT_TYPE_LABELS = {
    "BOYS_HAIRCUT":      "Boys Haircut",
    "GIRLS_HAIR_DESIGN": "Girls Hair Design",
}


def _base_html(content: str) -> str:
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background:#FFF8F0; padding:24px;">
      <div style="max-width:520px; margin:auto; background:#fff; border-radius:16px;
                  box-shadow:0 2px 12px rgba(0,0,0,0.08); padding:32px;">
        {content}
        <hr style="margin-top:32px; border:none; border-top:1px solid #eee;" />
        <p style="font-size:12px; color:#999; text-align:center; margin-top:16px;">
          Kids Salon – Appointment System
        </p>
      </div>
    </body>
    </html>
    """


# ---------------------------------------------------------------------------
# 1. Booking confirmation → customer
# ---------------------------------------------------------------------------
def send_booking_confirmation(
    customer_email: str,
    customer_name: str,
    appointment_type: str,
    appt_date: str,
    appt_time: str,
    shop_name: str = "Kids Salon",
) -> bool:
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)
    body = _base_html(f"""
        <h2 style="color:#3B82F6;">✂️ Appointment Confirmed!</h2>
        <p>Hi <strong>{customer_name}</strong>,</p>
        <p>Your appointment at <strong>{shop_name}</strong> has been confirmed.</p>
        <table style="width:100%; border-collapse:collapse; margin-top:16px;">
          <tr><td style="padding:8px; background:#F3F4F6; border-radius:8px; font-weight:bold;">Service</td>
              <td style="padding:8px;">{label}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Date</td>
              <td style="padding:8px;">{appt_date}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; border-radius:8px; font-weight:bold;">Time</td>
              <td style="padding:8px;">{appt_time}</td></tr>
        </table>
        <p style="margin-top:24px; color:#555;">
          We look forward to seeing you! If you need to cancel, please do so through the app.
        </p>
    """)
    return _send_email(customer_email, "Your appointment is confirmed ✂️", body)


# ---------------------------------------------------------------------------
# 2. New booking notification → admin
# ---------------------------------------------------------------------------
def send_booking_notification_to_admin(
    admin_email: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    appointment_type: str,
    appt_date: str,
    appt_time: str,
) -> bool:
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)
    body = _base_html(f"""
        <h2 style="color:#3B82F6;">📅 New Appointment Booked</h2>
        <p>A new appointment has just been booked.</p>
        <table style="width:100%; border-collapse:collapse; margin-top:16px;">
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Customer</td>
              <td style="padding:8px;">{customer_name}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Email</td>
              <td style="padding:8px;">{customer_email}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Phone</td>
              <td style="padding:8px;">{customer_phone}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Service</td>
              <td style="padding:8px;">{label}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Date</td>
              <td style="padding:8px;">{appt_date}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Time</td>
              <td style="padding:8px;">{appt_time}</td></tr>
        </table>
    """)
    return _send_email(admin_email, "New appointment booked 📅", body)


# ---------------------------------------------------------------------------
# 3. Cancellation confirmation → customer
# ---------------------------------------------------------------------------
def send_cancellation_email_to_customer(
    customer_email: str,
    customer_name: str,
    appointment_type: str,
    appt_date: str,
    appt_time: str,
    shop_name: str = "Kids Salon",
) -> bool:
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)
    body = _base_html(f"""
        <h2 style="color:#EF4444;">❌ Appointment Cancelled</h2>
        <p>Hi <strong>{customer_name}</strong>,</p>
        <p>Your appointment at <strong>{shop_name}</strong> has been cancelled.</p>
        <table style="width:100%; border-collapse:collapse; margin-top:16px;">
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Service</td>
              <td style="padding:8px;">{label}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Date</td>
              <td style="padding:8px;">{appt_date}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Time</td>
              <td style="padding:8px;">{appt_time}</td></tr>
        </table>
        <p style="margin-top:24px; color:#555;">
          You can book a new appointment through the app at any time.
        </p>
    """)
    return _send_email(customer_email, "Your appointment has been cancelled", body)


# ---------------------------------------------------------------------------
# 4. Cancellation notification → admin
# ---------------------------------------------------------------------------
def send_cancellation_notification_to_admin(
    admin_email: str,
    customer_name: str,
    customer_email: str,
    appointment_type: str,
    appt_date: str,
    appt_time: str,
    canceled_by: str = "Customer",
) -> bool:
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)
    body = _base_html(f"""
        <h2 style="color:#EF4444;">❌ Appointment Cancelled</h2>
        <p>An appointment has been cancelled by <strong>{canceled_by}</strong>.</p>
        <table style="width:100%; border-collapse:collapse; margin-top:16px;">
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Customer</td>
              <td style="padding:8px;">{customer_name}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Email</td>
              <td style="padding:8px;">{customer_email}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Service</td>
              <td style="padding:8px;">{label}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Date</td>
              <td style="padding:8px;">{appt_date}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Time</td>
              <td style="padding:8px;">{appt_time}</td></tr>
        </table>
        <p style="margin-top:24px; color:#555;">
          The slot has been freed and is available again.
        </p>
    """)
    return _send_email(admin_email, "Appointment cancelled ❌", body)


# ---------------------------------------------------------------------------
# 5. 1-hour reminder → customer
# ---------------------------------------------------------------------------
def send_reminder_email_to_customer(
    customer_email: str,
    customer_name: str,
    appointment_type: str,
    appt_date: str,
    appt_time: str,
    shop_name: str = "Kids Salon",
) -> bool:
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)
    body = _base_html(f"""
        <h2 style="color:#F59E0B;">⏰ Appointment Reminder</h2>
        <p>Hi <strong>{customer_name}</strong>,</p>
        <p>Just a reminder — your appointment at <strong>{shop_name}</strong> is in <strong>1 hour</strong>!</p>
        <table style="width:100%; border-collapse:collapse; margin-top:16px;">
          <tr><td style="padding:8px; background:#F3F4F6; border-radius:8px; font-weight:bold;">Service</td>
              <td style="padding:8px;">{label}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Date</td>
              <td style="padding:8px;">{appt_date}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; border-radius:8px; font-weight:bold;">Time</td>
              <td style="padding:8px;">{appt_time}</td></tr>
        </table>
        <p style="margin-top:24px; color:#555;">
          We look forward to seeing you! ✂️
        </p>
    """)
    return _send_email(customer_email, "⏰ Your appointment is in 1 hour!", body)


# ---------------------------------------------------------------------------
# 6. 1-hour reminder → admin
# ---------------------------------------------------------------------------
def send_reminder_email_to_admin(
    admin_email: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    appointment_type: str,
    appt_date: str,
    appt_time: str,
) -> bool:
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)
    body = _base_html(f"""
        <h2 style="color:#F59E0B;">⏰ Upcoming Appointment in 1 Hour</h2>
        <p>This appointment is coming up in <strong>1 hour</strong>.</p>
        <table style="width:100%; border-collapse:collapse; margin-top:16px;">
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Customer</td>
              <td style="padding:8px;">{customer_name}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Phone</td>
              <td style="padding:8px;">{customer_phone}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Email</td>
              <td style="padding:8px;">{customer_email}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Service</td>
              <td style="padding:8px;">{label}</td></tr>
          <tr><td style="padding:8px; background:#F3F4F6; font-weight:bold;">Date</td>
              <td style="padding:8px;">{appt_date}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Time</td>
              <td style="padding:8px;">{appt_time}</td></tr>
        </table>
    """)
    return _send_email(admin_email, "⏰ Upcoming appointment in 1 hour", body)


# ---------------------------------------------------------------------------
# 7. Password reset code → admin
# ---------------------------------------------------------------------------
def send_password_reset_email(to_email: str, code: str) -> bool:
    body = _base_html(f"""
        <h2 style="color:#3B82F6;">🔑 Password Reset</h2>
        <p>We received a request to reset your admin password.</p>
        <p>Your reset code is:</p>
        <div style="text-align:center; margin:24px 0;">
          <span style="display:inline-block; background:#EFF6FF; color:#1D4ED8;
                       font-size:32px; font-weight:bold; letter-spacing:8px;
                       padding:16px 28px; border-radius:12px;">
            {code}
          </span>
        </div>
        <p style="color:#555;">This code expires in <strong>15 minutes</strong>.</p>
        <p style="color:#999; font-size:13px; margin-top:16px;">
          If you didn't request this, you can safely ignore this email —
          your password will stay unchanged.
        </p>
    """)
    return _send_email(to_email, "Your password reset code 🔑", body)


# ---------------------------------------------------------------------------
# 8. Waiting list — a slot opened up
# ---------------------------------------------------------------------------
def send_waitlist_email(
    to_email: str,
    customer_name: str,
    appt_date: str,
    shop_name: str = "Kids Salon",
) -> bool:
    body = _base_html(f"""
        <h2 style="color:#10B981;">🎉 A spot just opened!</h2>
        <p>Hi <strong>{customer_name}</strong>,</p>
        <p>Good news — a time slot on <strong>{appt_date}</strong> just became
           available at <strong>{shop_name}</strong>.</p>
        <p style="margin-top:16px; color:#555;">
          Open the app and book it before someone else does! ✂️
        </p>
    """)
    return _send_email(to_email, "A spot just opened! 🎉", body)
