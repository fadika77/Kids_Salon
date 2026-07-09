"""
Unified notification dispatcher.

Every event sends:
  - Customer: push notification (if they have an FCM token) + email (if they provided one)
  - Admin:    push notification (if they have an FCM token) + email

All calls are fire-and-forget – exceptions are caught so a notification
failure never breaks the booking flow.
"""
from typing import Optional
from . import email_service, push_service

APPOINTMENT_TYPE_LABELS = {
    "BOYS_HAIRCUT":      "Boys Haircut",
    "GIRLS_HAIR_DESIGN": "Girls Hair Design",
}


# ---------------------------------------------------------------------------
# 1. Booking confirmed → customer + admin
# ---------------------------------------------------------------------------
def notify_booking_confirmation(
    customer_name: str,
    customer_fcm_token: Optional[str],
    customer_email: Optional[str],
    admin_email: str,
    admin_fcm_token: Optional[str],
    appointment_type: str,
    appt_date: str,
    appt_time: str,
    customer_phone: str = "",
    shop_name: str = "Kids Salon",
):
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)

    # Push → customer
    push_service.send_push(
        customer_fcm_token,
        "✂️ Appointment Confirmed!",
        f"Your {label} at {shop_name} is booked for {appt_date} at {appt_time}. See you soon!",
    )

    # Email → customer
    if customer_email:
        email_service.send_booking_confirmation(
            customer_email=customer_email,
            customer_name=customer_name,
            appointment_type=appointment_type,
            appt_date=appt_date,
            appt_time=appt_time,
            shop_name=shop_name,
        )

    # Push → admin
    push_service.send_push(
        admin_fcm_token,
        "📅 New Booking!",
        f"{customer_name} booked a {label} on {appt_date} at {appt_time}.",
    )

    # Email → admin
    if admin_email:
        email_service.send_booking_notification_to_admin(
            admin_email=admin_email,
            customer_name=customer_name,
            customer_email=customer_email or "—",
            customer_phone=customer_phone,
            appointment_type=appointment_type,
            appt_date=appt_date,
            appt_time=appt_time,
        )


# ---------------------------------------------------------------------------
# 2. Booking cancelled → customer + admin
# ---------------------------------------------------------------------------
def notify_cancellation(
    customer_name: str,
    customer_fcm_token: Optional[str],
    customer_email: Optional[str],
    admin_email: str,
    admin_fcm_token: Optional[str],
    appointment_type: str,
    appt_date: str,
    appt_time: str,
    customer_phone: str = "",
    canceled_by: str = "Customer",
    shop_name: str = "Kids Salon",
):
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)

    # Push → customer
    push_service.send_push(
        customer_fcm_token,
        "📅 Appointment Cancelled",
        f"Your {label} at {shop_name} on {appt_date} at {appt_time} has been cancelled."
        " You can rebook anytime through the app.",
    )

    # Email → customer
    if customer_email:
        email_service.send_cancellation_email_to_customer(
            customer_email=customer_email,
            customer_name=customer_name,
            appointment_type=appointment_type,
            appt_date=appt_date,
            appt_time=appt_time,
            shop_name=shop_name,
        )

    # Push → admin
    push_service.send_push(
        admin_fcm_token,
        "❌ Appointment Cancelled",
        f"{customer_name}'s {label} on {appt_date} at {appt_time} was cancelled by {canceled_by}.",
    )

    # Email → admin
    if admin_email:
        email_service.send_cancellation_notification_to_admin(
            admin_email=admin_email,
            customer_name=customer_name,
            customer_email=customer_email or "—",
            appointment_type=appointment_type,
            appt_date=appt_date,
            appt_time=appt_time,
            canceled_by=canceled_by,
        )


# ---------------------------------------------------------------------------
# 3. 1-hour reminder → customer + admin
# ---------------------------------------------------------------------------
def notify_reminder(
    customer_name: str,
    customer_fcm_token: Optional[str],
    customer_email: Optional[str],
    admin_email: str,
    admin_fcm_token: Optional[str],
    appointment_type: str,
    appt_date: str,
    appt_time: str,
    customer_phone: str = "",
    shop_name: str = "Kids Salon",
):
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)

    # Push → customer
    push_service.send_push(
        customer_fcm_token,
        "⏰ Appointment in 1 Hour!",
        f"Your {label} at {shop_name} is coming up at {appt_time} today. See you soon! ✂️",
    )

    # Email → customer
    if customer_email:
        email_service.send_reminder_email_to_customer(
            customer_email=customer_email,
            customer_name=customer_name,
            appointment_type=appointment_type,
            appt_date=appt_date,
            appt_time=appt_time,
            shop_name=shop_name,
        )

    # Push → admin
    push_service.send_push(
        admin_fcm_token,
        "⏰ Upcoming Appointment",
        f"{customer_name} has a {label} in 1 hour at {appt_time}.",
    )

    # Email → admin
    if admin_email:
        email_service.send_reminder_email_to_admin(
            admin_email=admin_email,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email or "—",
            appointment_type=appointment_type,
            appt_date=appt_date,
            appt_time=appt_time,
        )


# ---------------------------------------------------------------------------
# 4. Waiting list — a slot opened up on a date someone is waiting for
# ---------------------------------------------------------------------------
def notify_waitlist_slot_opened(
    entries,                # list of dicts: {name, email, fcm_token}
    appt_date: str,
    shop_name: str = "Kids Salon",
):
    for e in entries:
        push_service.send_push(
            e.get("fcm_token"),
            "🎉 A spot just opened!",
            f"A time slot on {appt_date} is now available at {shop_name}."
            " Open the app and grab it before someone else does!",
        )
        if e.get("email"):
            email_service.send_waitlist_email(
                to_email=e["email"],
                customer_name=e.get("name") or "",
                appt_date=appt_date,
                shop_name=shop_name,
            )


# ---------------------------------------------------------------------------
# Keep old names as aliases so nothing breaks if called elsewhere
# ---------------------------------------------------------------------------
def notify_booking_confirmation_customer_only(
    customer_name, customer_fcm_token, customer_email,
    appointment_type, appt_date, appt_time, shop_name="Kids Salon"
):
    """Legacy alias — prefer notify_booking_confirmation."""
    label = APPOINTMENT_TYPE_LABELS.get(appointment_type, appointment_type)
    push_service.send_push(customer_fcm_token, "✂️ Appointment Confirmed!",
        f"Your {label} at {shop_name} is booked for {appt_date} at {appt_time}.")
    if customer_email:
        email_service.send_booking_confirmation(
            customer_email=customer_email, customer_name=customer_name,
            appointment_type=appointment_type, appt_date=appt_date,
            appt_time=appt_time, shop_name=shop_name)
