import os
import logging

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")


def send_sms(to_phone: str, message: str) -> bool:
    """Send an SMS via Twilio. Silently skips if credentials are not configured."""
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER]):
        logger.warning("Twilio credentials not configured – skipping SMS to %s", to_phone)
        return False

    if not to_phone or not to_phone.strip():
        logger.warning("No phone number provided – skipping SMS")
        return False

    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=message,
            from_=TWILIO_FROM_NUMBER,
            to=to_phone.strip(),
        )
        logger.info("SMS sent to %s", to_phone)
        return True
    except Exception as exc:
        logger.error("Failed to send SMS to %s: %s", to_phone, exc)
        return False
