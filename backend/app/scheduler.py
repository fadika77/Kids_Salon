"""
Background scheduler — sends 1-hour appointment reminders.

Runs every 5 minutes. Looks for bookings whose appointment time falls
between 55 and 65 minutes from now, sends push + email to both the
customer and the admin, then marks reminder_sent = True so it won't fire
a second time.
"""
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def send_upcoming_reminders():
    """Called by APScheduler every 5 minutes."""
    from .database import SessionLocal
    from .models import Booking, BookingStatus, AppSettings, User, UserRole
    from . import notifications

    db = SessionLocal()
    try:
        now = datetime.now()
        window_start = now + timedelta(minutes=55)
        window_end   = now + timedelta(minutes=65)

        # Fetch all active, un-reminded bookings (load slots eagerly via join)
        pending_bookings = (
            db.query(Booking)
            .filter(
                Booking.status == BookingStatus.booked,
                Booking.reminder_sent == False,  # noqa: E712
            )
            .all()
        )

        if not pending_bookings:
            return

        # Admin details — looked up once for all reminders
        settings        = db.query(AppSettings).first()
        admin_email     = settings.admin_email if settings else ""
        shop_name       = settings.shop_name   if settings else "Kids Salon"
        admin_user      = db.query(User).filter(User.role == UserRole.admin).first()
        admin_fcm_token = admin_user.fcm_token if admin_user else None

        for booking in pending_bookings:
            slot = booking.slot
            if not slot:
                continue

            # Combine date + time into a single datetime for comparison
            appt_dt = datetime.combine(slot.date, slot.time)
            if not (window_start <= appt_dt <= window_end):
                continue

            customer      = booking.customer
            appt_date_str = str(slot.date)
            appt_time_str = str(slot.time)[:5]

            try:
                notifications.notify_reminder(
                    customer_name=customer.full_name,
                    customer_fcm_token=customer.fcm_token,
                    customer_email=customer.email,
                    admin_email=admin_email,
                    admin_fcm_token=admin_fcm_token,
                    appointment_type=booking.appointment_type.value,
                    appt_date=appt_date_str,
                    appt_time=appt_time_str,
                    customer_phone=customer.phone,
                    shop_name=shop_name,
                )
                booking.reminder_sent = True
                logger.info("Reminder sent for booking #%d (%s at %s)",
                            booking.id, appt_date_str, appt_time_str)
            except Exception as exc:
                logger.error("Failed to send reminder for booking #%d: %s", booking.id, exc)

        db.commit()

    except Exception as exc:
        logger.error("Reminder scheduler job failed: %s", exc)
    finally:
        db.close()
