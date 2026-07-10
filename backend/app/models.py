from sqlalchemy import (
    Column, Integer, DateTime, Date, Time,
    ForeignKey, Enum as SAEnum, Boolean,
    Unicode, UnicodeText,
)

# NOTE: we use Unicode/UnicodeText (-> NVARCHAR on SQL Server) instead of
# String/Text (-> VARCHAR) so Hebrew and Arabic text is stored correctly.
# VARCHAR columns silently turn non-Latin characters into '?'.
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class UserRole(str, enum.Enum):
    admin    = "admin"
    customer = "customer"


class SlotStatus(str, enum.Enum):
    available = "available"
    booked    = "booked"
    canceled  = "canceled"


class BookingStatus(str, enum.Enum):
    booked   = "booked"
    canceled = "canceled"


class AppointmentType(str, enum.Enum):
    BOYS_HAIRCUT      = "BOYS_HAIRCUT"
    GIRLS_HAIR_DESIGN = "GIRLS_HAIR_DESIGN"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(Unicode(255), nullable=False)
    email         = Column(Unicode(255), unique=True, index=True, nullable=True)
    phone         = Column(Unicode(50), nullable=False)
    password_hash = Column(Unicode(255), nullable=False)
    role          = Column(SAEnum(UserRole), default=UserRole.customer, nullable=False)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())

    fcm_token     = Column(Unicode(512), nullable=True)   # Firebase push notification token

    # Password reset (admin "forgot password" flow)
    reset_code         = Column(Unicode(10), nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)

    bookings           = relationship("Booking", back_populates="customer")
    created_slots      = relationship("AppointmentSlot", back_populates="created_by_admin")
    children           = relationship("Child", back_populates="parent", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Children (kids profiles — a parent can book for a specific child)
# ---------------------------------------------------------------------------
class Child(Base):
    __tablename__ = "children"

    id         = Column(Integer, primary_key=True, index=True)
    parent_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    name       = Column(Unicode(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    parent = relationship("User", back_populates="children")


# ---------------------------------------------------------------------------
# Appointment Slots
# ---------------------------------------------------------------------------
class AppointmentSlot(Base):
    __tablename__ = "appointment_slots"

    id                  = Column(Integer, primary_key=True, index=True)
    date                = Column(Date, nullable=False)
    time                = Column(Time, nullable=False)
    duration_minutes    = Column(Integer, default=30)
    notes               = Column(UnicodeText, nullable=True)
    status              = Column(SAEnum(SlotStatus), default=SlotStatus.available, nullable=False)
    created_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())

    created_by_admin = relationship("User", back_populates="created_slots")
    booking          = relationship("Booking", back_populates="slot", uselist=False)


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------
class Booking(Base):
    __tablename__ = "bookings"

    id               = Column(Integer, primary_key=True, index=True)
    slot_id          = Column(Integer, ForeignKey("appointment_slots.id"), nullable=False)
    customer_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    child_id         = Column(Integer, ForeignKey("children.id"), nullable=True)   # optional kid profile
    appointment_type = Column(SAEnum(AppointmentType), nullable=False)
    status           = Column(SAEnum(BookingStatus), default=BookingStatus.booked, nullable=False)
    booked_at        = Column(DateTime, server_default=func.now())
    canceled_at      = Column(DateTime, nullable=True)
    reminder_sent    = Column(Boolean, default=False, nullable=False, server_default="0")
    no_show          = Column(Boolean, default=False, nullable=False, server_default="0")
    created_at       = Column(DateTime, server_default=func.now())
    updated_at       = Column(DateTime, server_default=func.now(), onupdate=func.now())

    slot     = relationship("AppointmentSlot", back_populates="booking")
    customer = relationship("User", back_populates="bookings")
    child    = relationship("Child")


# ---------------------------------------------------------------------------
# Waiting list – customers who want to be notified when a slot opens
# ---------------------------------------------------------------------------
class WaitlistEntry(Base):
    __tablename__ = "waitlist"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    date       = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")


# ---------------------------------------------------------------------------
# Gallery – haircut photos uploaded by the admin
# ---------------------------------------------------------------------------
class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id          = Column(Integer, primary_key=True, index=True)
    filename    = Column(Unicode(255), nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())


# ---------------------------------------------------------------------------
# App Settings
# ---------------------------------------------------------------------------
class AppSettings(Base):
    __tablename__ = "app_settings"

    id          = Column(Integer, primary_key=True, index=True)
    shop_name   = Column(Unicode(255), default="Kids Barbershop")
    admin_email = Column(Unicode(255), nullable=False)
    phone       = Column(Unicode(50), nullable=True)
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())