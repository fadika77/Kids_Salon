from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, time, datetime
from .models import UserRole, SlotStatus, BookingStatus, AppointmentType


# ---------------------------------------------------------------------------
# Auth / Users
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("phone")
    @classmethod
    def phone_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Phone number is required")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class DeviceRegister(BaseModel):
    full_name: str
    email: Optional[str] = None   # optional – customers may not have an email
    phone: str

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Full name is required")
        return v

    @field_validator("phone")
    @classmethod
    def phone_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Phone number is required")
        return v

    @field_validator("email")
    @classmethod
    def email_valid_if_provided(cls, v):
        import re
        if v is None or not v.strip():
            return None
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', v.strip()):
            raise ValueError("Invalid email format")
        return v.strip()


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    new_password: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Full name is required")
        return v

    @field_validator("phone")
    @classmethod
    def phone_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Phone number is required")
        return v

    @field_validator("new_password")
    @classmethod
    def new_password_min_length(cls, v):
        if v is not None and len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserOut(BaseModel):
    id: int
    full_name: str
    email: Optional[str] = None
    phone: str
    role: UserRole
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user: UserOut


# ---------------------------------------------------------------------------
# Appointment Slots
# ---------------------------------------------------------------------------
class SlotCreate(BaseModel):
    date: date
    time: time
    duration_minutes: Optional[int] = 30
    notes: Optional[str] = None


class SlotUpdate(BaseModel):
    date: Optional[date] = None
    time: Optional[time] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None


class SlotOut(BaseModel):
    id: int
    date: date
    time: time
    duration_minutes: int
    notes: Optional[str] = None
    status: SlotStatus
    created_by_admin_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SlotWithBooking(SlotOut):
    booking: Optional["BookingOut"] = None


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------
class BookingCreate(BaseModel):
    slot_id: int
    appointment_type: AppointmentType
    child_id: Optional[int] = None


class ChildOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ChildCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class BookingOut(BaseModel):
    id: int
    slot_id: int
    customer_id: int
    child_id: Optional[int] = None
    appointment_type: AppointmentType
    status: BookingStatus
    booked_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    no_show: bool = False
    created_at: Optional[datetime] = None
    slot: Optional[SlotOut] = None
    customer: Optional[UserOut] = None
    child: Optional[ChildOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# App Settings
# ---------------------------------------------------------------------------
class AppSettingsOut(BaseModel):
    id: int
    shop_name: str
    admin_email: str
    phone: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AppSettingsUpdate(BaseModel):
    shop_name: Optional[str] = None
    admin_email: Optional[EmailStr] = None
    phone: Optional[str] = None


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class DashboardStats(BaseModel):
    total_available_slots: int
    total_booked: int
    today_appointments: int
    upcoming_appointments: int


# ---------------------------------------------------------------------------
# Appointment Types
# ---------------------------------------------------------------------------
class AppointmentTypeOut(BaseModel):
    key: str
    label: str


# ---------------------------------------------------------------------------
# FCM Token
# ---------------------------------------------------------------------------
class FCMTokenUpdate(BaseModel):
    fcm_token: str


# ---------------------------------------------------------------------------
# Password reset (admin)
# ---------------------------------------------------------------------------
class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


# ---------------------------------------------------------------------------
# Weekly (bulk) slot creation
# ---------------------------------------------------------------------------
class BulkDay(BaseModel):
    date: date
    times: List[time]


class BulkSlotsCreate(BaseModel):
    duration_minutes: Optional[int] = 30
    days: List[BulkDay]


class BulkSlotsResult(BaseModel):
    created: int
    skipped: int


# ---------------------------------------------------------------------------
# No-show
# ---------------------------------------------------------------------------
class NoShowUpdate(BaseModel):
    no_show: bool


# ---------------------------------------------------------------------------
# Customer stats (admin view: history + no-shows)
# ---------------------------------------------------------------------------
class CustomerStats(BaseModel):
    customer_id: int
    total_visits: int
    no_shows: int
    last_visit: Optional[date] = None


# ---------------------------------------------------------------------------
# Waiting list
# ---------------------------------------------------------------------------
class WaitlistJoin(BaseModel):
    date: date


class WaitlistOut(BaseModel):
    id: int
    date: date

    model_config = {"from_attributes": True}


class AdminWaitlistEntry(BaseModel):
    """Waitlist entry with customer details — for the admin waitlist view."""
    id: int
    date: date
    created_at: Optional[datetime] = None
    customer_id: int
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None


# ---------------------------------------------------------------------------
# Gallery
# ---------------------------------------------------------------------------
class GalleryImageOut(BaseModel):
    id: int
    url: str
    uploaded_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Admin statistics page
# ---------------------------------------------------------------------------
class StatsBucket(BaseModel):
    label: str
    count: int


class AdminStats(BaseModel):
    per_weekday: List[StatsBucket]
    per_hour: List[StatsBucket]
    per_week: List[StatsBucket]
    booked_total: int
    cancelled_total: int
    no_show_total: int


# Forward reference resolution
SlotWithBooking.model_rebuild()
