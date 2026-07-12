import secrets
import time
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import (
    UserRegister, UserLogin, Token, UserOut, UserUpdate, DeviceRegister,
    FCMTokenUpdate, ForgotPasswordRequest, ResetPasswordRequest,
)
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from .. import email_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Brute-force protection (no external packages needed)
#
# Tracks FAILED attempts per client IP. After MAX_ATTEMPTS failures within
# WINDOW_SECONDS, further attempts get HTTP 429 until the window passes.
# Applied to: /auth/login, /auth/forgot-password, /auth/reset-password.
# ---------------------------------------------------------------------------
_FAILED_ATTEMPTS: dict = {}          # key: "scope:ip" -> [timestamps]
_MAX_ATTEMPTS    = 5
_WINDOW_SECONDS  = 15 * 60           # 15 minutes


def _client_ip(request: Request) -> str:
    # Behind Render's proxy the real IP is in X-Forwarded-For
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(scope: str, request: Request):
    key = f"{scope}:{_client_ip(request)}"
    now = time.time()
    attempts = [t for t in _FAILED_ATTEMPTS.get(key, []) if now - t < _WINDOW_SECONDS]
    _FAILED_ATTEMPTS[key] = attempts
    if len(attempts) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again in 15 minutes.",
        )


def _record_failure(scope: str, request: Request):
    key = f"{scope}:{_client_ip(request)}"
    _FAILED_ATTEMPTS.setdefault(key, []).append(time.time())


def _clear_failures(scope: str, request: Request):
    _FAILED_ATTEMPTS.pop(f"{scope}:{_client_ip(request)}", None)


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # Check duplicate email
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole.customer,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    _check_rate_limit("login", request)

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        _record_failure("login", request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    _clear_failures("login", request)
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /auth/device-register – passwordless customer identity per device
# Lookup is by phone number (always required); email is optional.
# ---------------------------------------------------------------------------
@router.post("/device-register", response_model=Token)
def device_register(payload: DeviceRegister, db: Session = Depends(get_db)):
    # Phone is the unique identifier for customers (email is optional)
    user = db.query(User).filter(
        User.phone == payload.phone,
        User.role == UserRole.customer,
    ).first()

    if user:
        # Update details in case anything changed
        user.full_name = payload.full_name
        if payload.email:
            user.email = payload.email
        db.commit()
        db.refresh(user)
    else:
        # If an email was provided, make sure it's not already used by an admin
        if payload.email:
            existing = db.query(User).filter(User.email == payload.email).first()
            if existing and existing.role != UserRole.customer:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email belongs to an admin account. Please use admin login.",
                )

        user = User(
            full_name=payload.full_name,
            email=payload.email or None,
            phone=payload.phone,
            password_hash=hash_password(secrets.token_hex(16)),
            role=UserRole.customer,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Customers use a passwordless device identity, so give them a
    # long-lived token (1 year) instead of the short admin expiry.
    access_token = create_access_token(
        {"sub": str(user.id), "role": user.role.value},
        expires_delta=timedelta(days=365),
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------
@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# PUT /auth/me  – update own profile (name, email, phone, password)
# ---------------------------------------------------------------------------
@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.email and payload.email != current_user.email:
        existing = (
            db.query(User)
            .filter(User.email == payload.email, User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )
        current_user.email = payload.email

    if payload.full_name:
        current_user.full_name = payload.full_name

    if payload.phone:
        current_user.phone = payload.phone

    if payload.new_password:
        current_user.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user


# ---------------------------------------------------------------------------
# PUT /auth/fcm-token  – save or refresh the Firebase push token for this device
# ---------------------------------------------------------------------------
@router.put("/fcm-token")
def update_fcm_token(
    payload: FCMTokenUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.fcm_token = payload.fcm_token.strip()
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# POST /auth/forgot-password  – email a 6-digit reset code to the admin
# ---------------------------------------------------------------------------
@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Every call counts as an "attempt" here — prevents email spamming
    _check_rate_limit("forgot", request)
    _record_failure("forgot", request)

    user = db.query(User).filter(
        User.email == payload.email.strip(),
        User.role == UserRole.admin,
    ).first()

    if user:
        # 6-digit numeric code, valid for 15 minutes
        code = f"{secrets.randbelow(1000000):06d}"
        user.reset_code = code
        user.reset_code_expires = datetime.utcnow() + timedelta(minutes=15)
        db.commit()
        background_tasks.add_task(email_service.send_password_reset_email, user.email, code)

    # Always the same answer — never reveal whether the email exists
    return {"ok": True, "message": "If this email belongs to an admin account, a reset code has been sent."}


# ---------------------------------------------------------------------------
# POST /auth/reset-password  – verify the code and set a new password
# ---------------------------------------------------------------------------
@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    # Rate-limited: without this, a 6-digit code could be brute-forced
    _check_rate_limit("reset", request)

    user = db.query(User).filter(
        User.email == payload.email.strip(),
        User.role == UserRole.admin,
    ).first()

    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset code",
    )

    if not user or not user.reset_code or not user.reset_code_expires:
        _record_failure("reset", request)
        raise invalid
    if user.reset_code != payload.code.strip():
        _record_failure("reset", request)
        raise invalid
    if datetime.utcnow() > user.reset_code_expires:
        _record_failure("reset", request)
        raise invalid
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters",
        )

    user.password_hash = hash_password(payload.new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.commit()

    _clear_failures("reset", request)
    return {"ok": True, "message": "Password reset successfully"}
