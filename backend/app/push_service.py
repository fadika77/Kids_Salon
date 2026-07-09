"""
Firebase Cloud Messaging (FCM) push notification sender.

Setup:
1. Create a Firebase project at console.firebase.google.com
2. Go to Project Settings → Service Accounts → Generate New Private Key
3. Save the downloaded JSON file as firebase-credentials.json in the backend folder
4. Set FIREBASE_CREDENTIALS_PATH in your .env if you placed it elsewhere
"""
import os
import logging

logger = logging.getLogger(__name__)

_initialized = False


def _ensure_initialized() -> bool:
    global _initialized
    if _initialized:
        return True

    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")

    if not os.path.exists(credentials_path):
        logger.warning(
            "Firebase credentials not found at '%s' – push notifications disabled. "
            "See backend/app/push_service.py for setup instructions.",
            credentials_path,
        )
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred)

        _initialized = True
        logger.info("Firebase Admin SDK initialized")
        return True
    except Exception as exc:
        logger.error("Failed to initialize Firebase: %s", exc)
        return False


def send_push(fcm_token: str, title: str, body: str) -> bool:
    """Send a push notification to a single device token."""
    if not fcm_token or not fcm_token.strip():
        return False

    if not _ensure_initialized():
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            android=messaging.AndroidConfig(priority="high"),
            token=fcm_token.strip(),
        )
        messaging.send(message)
        logger.info("Push notification sent: %s", title)
        return True
    except Exception as exc:
        logger.error("Failed to send push notification: %s", exc)
        return False
