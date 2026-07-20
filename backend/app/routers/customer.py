from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    AppointmentSlot, Booking, SlotStatus, BookingStatus, AppointmentType, AppSettings,
    Child, WaitlistEntry, GalleryImage
)
from ..schemas import (
    BookingCreate, BookingOut, SlotOut, AppointmentTypeOut,
    ChildCreate, ChildOut, WaitlistJoin, WaitlistOut, GalleryImageOut
)
from ..auth import get_current_customer, get_current_user
from ..models import User, UserRole
from .. import notifications

router = APIRouter()

APPOINTMENT_TYPES = [
    AppointmentTypeOut(key="BOYS_HAIRCUT",      label="Boys Haircut"),
    AppointmentTypeOut(key="GIRLS_HAIR_DESIGN", label="Girls Hair Design"),
]


def _get_admin_fcm_token(db: Session, admin_email: str) -> Optional[str]:
    """Look up the admin user's FCM token so we can push to their device."""
    admin = db.query(User).filter(
        User.email == admin_email,
        User.role == UserRole.admin,
    ).first()
    return admin.fcm_token if admin else None


def collect_waitlist_for_date(db: Session, slot_date) -> list:
    """Grab (and remove) everyone waiting for this date; returns plain dicts
    safe to use after the DB session closes (for background notification)."""
    entries = (
        db.query(WaitlistEntry)
        .filter(WaitlistEntry.date == slot_date)
        .all()
    )
    result = []
    for e in entries:
        if e.user:
            result.append({
                "name": e.user.full_name,
                "email": e.user.email,
                "fcm_token": e.user.fcm_token,
            })
        db.delete(e)
    if entries:
        db.commit()
    return result


# ---------------------------------------------------------------------------
# GET /appointment-types
# ---------------------------------------------------------------------------
@router.get("/appointment-types", response_model=List[AppointmentTypeOut])
def get_appointment_types():
    return APPOINTMENT_TYPES


# ---------------------------------------------------------------------------
# GET /slots/available?date=YYYY-MM-DD
# ---------------------------------------------------------------------------
@router.get("/slots/available", response_model=List[SlotOut])
def get_available_slots(
    appt_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    slots = (
        db.query(AppointmentSlot)
        .filter(
            AppointmentSlot.date == appt_date,
            AppointmentSlot.status == SlotStatus.available,
        )
        .order_by(AppointmentSlot.time)
        .all()
    )
    return slots


# ---------------------------------------------------------------------------
# POST /bookings
# ---------------------------------------------------------------------------
@router.post("/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    # Lock and verify slot
    slot = db.query(AppointmentSlot).filter(AppointmentSlot.id == payload.slot_id).with_for_update().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.status != SlotStatus.available:
        raise HTTPException(status_code=409, detail="This slot is no longer available")

    # Optional kid profile — must belong to this customer
    child = None
    if payload.child_id:
        child = db.query(Child).filter(
            Child.id == payload.child_id,
            Child.parent_id == current_user.id,
        ).first()
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")

    # Create booking
    booking = Booking(
        slot_id=slot.id,
        customer_id=current_user.id,
        child_id=child.id if child else None,
        appointment_type=AppointmentType(payload.appointment_type),
        status=BookingStatus.booked,
        booked_at=datetime.utcnow(),
    )
    db.add(booking)

    # Update slot status
    slot.status = SlotStatus.booked
    db.commit()
    db.refresh(booking)

    # Send notifications AFTER the response is returned (background task),
    # so the customer sees the confirmation instantly instead of waiting
    # for emails/push notifications to be delivered.
    appt_date_str = str(slot.date)
    appt_time_str = str(slot.time)[:5]

    settings    = db.query(AppSettings).first()
    shop_name   = settings.shop_name   if settings else "Kids Barbershop"
    admin_email = settings.admin_email if settings else ""
    admin_fcm   = _get_admin_fcm_token(db, admin_email)

    display_name = f"{current_user.full_name} ({child.name})" if child else current_user.full_name

    background_tasks.add_task(
        notifications.notify_booking_confirmation,
        customer_name=display_name,
        customer_fcm_token=current_user.fcm_token,
        customer_email=current_user.email,
        admin_email=admin_email,
        admin_fcm_token=admin_fcm,
        appointment_type=payload.appointment_type,
        appt_date=appt_date_str,
        appt_time=appt_time_str,
        customer_phone=current_user.phone,
        shop_name=shop_name,
    )

    return booking


# ---------------------------------------------------------------------------
# GET /bookings/my
# ---------------------------------------------------------------------------
@router.get("/bookings/my", response_model=List[BookingOut])
def my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookings = (
        db.query(Booking)
        .filter(Booking.customer_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return bookings


# ---------------------------------------------------------------------------
# PUT /bookings/{booking_id}/cancel
# ---------------------------------------------------------------------------
@router.put("/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.customer_id == current_user.id,
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status == BookingStatus.canceled:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status      = BookingStatus.canceled
    booking.canceled_at = datetime.utcnow()

    # Free the slot
    if booking.slot:
        booking.slot.status = SlotStatus.available

    db.commit()
    db.refresh(booking)

    settings    = db.query(AppSettings).first()
    shop_name   = settings.shop_name   if settings else "Kids Barbershop"
    admin_email = settings.admin_email if settings else ""
    admin_fcm   = _get_admin_fcm_token(db, admin_email)
    appt_date_str = str(booking.slot.date)
    appt_time_str = str(booking.slot.time)[:5]

    # Tell everyone on this day's waiting list that a spot opened
    if booking.slot:
        waiters = collect_waitlist_for_date(db, booking.slot.date)
        if waiters:
            background_tasks.add_task(
                notifications.notify_waitlist_slot_opened,
                entries=waiters,
                appt_date=appt_date_str,
                shop_name=shop_name,
            )

    background_tasks.add_task(
        notifications.notify_cancellation,
        customer_name=current_user.full_name,
        customer_fcm_token=current_user.fcm_token,
        customer_email=current_user.email,
        admin_email=admin_email,
        admin_fcm_token=admin_fcm,
        appointment_type=booking.appointment_type.value,
        appt_date=appt_date_str,
        appt_time=appt_time_str,
        customer_phone=current_user.phone,
        canceled_by="Customer",
        shop_name=shop_name,
    )

    return booking


# ---------------------------------------------------------------------------
# Children (kids profiles)
# ---------------------------------------------------------------------------
@router.get("/children", response_model=List[ChildOut])
def my_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Child).filter(Child.parent_id == current_user.id).order_by(Child.name).all()


@router.post("/children", response_model=ChildOut, status_code=status.HTTP_201_CREATED)
def add_child(
    payload: ChildCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    child = Child(parent_id=current_user.id, name=payload.name)
    db.add(child)
    db.commit()
    db.refresh(child)
    return child


@router.delete("/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_child(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    child = db.query(Child).filter(
        Child.id == child_id, Child.parent_id == current_user.id,
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    # Keep past bookings but detach them from the deleted profile
    db.query(Booking).filter(Booking.child_id == child_id).update({"child_id": None})
    db.delete(child)
    db.commit()


# ---------------------------------------------------------------------------
# Waiting list
# ---------------------------------------------------------------------------
@router.get("/waitlist/my", response_model=List[WaitlistOut])
def my_waitlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(WaitlistEntry).filter(WaitlistEntry.user_id == current_user.id).all()


@router.post("/waitlist", response_model=WaitlistOut, status_code=status.HTTP_201_CREATED)
def join_waitlist(
    payload: WaitlistJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(WaitlistEntry).filter(
        WaitlistEntry.user_id == current_user.id,
        WaitlistEntry.date == payload.date,
    ).first()
    if existing:
        return existing
    entry = WaitlistEntry(user_id=current_user.id, date=payload.date)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# Gallery (public for customers)
# ---------------------------------------------------------------------------
@router.get("/gallery", response_model=List[GalleryImageOut])
def gallery(db: Session = Depends(get_db)):
    images = db.query(GalleryImage).order_by(GalleryImage.uploaded_at.desc()).all()
    return [
        GalleryImageOut(
            id=i.id,
            # Cloud images have a full https URL; legacy/local ones a relative path
            url=i.url or f"/uploads/gallery/{i.filename}",
            uploaded_at=i.uploaded_at,
        )
        for i in images
    ]
