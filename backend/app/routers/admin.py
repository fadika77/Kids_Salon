import os
import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    AppointmentSlot, Booking, AppSettings,
    SlotStatus, BookingStatus, AppointmentType,
    GalleryImage, WaitlistEntry
)
from ..schemas import (
    SlotCreate, SlotUpdate, SlotOut, SlotWithBooking,
    BookingOut, AppSettingsOut, AppSettingsUpdate, DashboardStats,
    BulkSlotsCreate, BulkSlotsResult, NoShowUpdate, CustomerStats,
    GalleryImageOut, AdminStats, StatsBucket, AdminWaitlistEntry
)
from ..auth import get_current_admin
from ..models import User
from .. import notifications
from ..models import UserRole
from .customer import collect_waitlist_for_date

GALLERY_DIR = os.path.join("uploads", "gallery")

router = APIRouter()


def _get_admin_fcm_token(db: Session, admin_email: str):
    from typing import Optional
    admin = db.query(User).filter(
        User.email == admin_email,
        User.role == UserRole.admin,
    ).first()
    return admin.fcm_token if admin else None


# ---------------------------------------------------------------------------
# GET /admin/dashboard
# ---------------------------------------------------------------------------
@router.get("/dashboard", response_model=DashboardStats)
def dashboard(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    today = date.today()

    total_available = db.query(AppointmentSlot).filter(
        AppointmentSlot.status == SlotStatus.available
    ).count()

    total_booked = db.query(Booking).filter(
        Booking.status == BookingStatus.booked
    ).count()

    today_appointments = (
        db.query(Booking)
        .join(AppointmentSlot)
        .filter(
            AppointmentSlot.date == today,
            Booking.status == BookingStatus.booked,
        )
        .count()
    )

    upcoming = (
        db.query(Booking)
        .join(AppointmentSlot)
        .filter(
            AppointmentSlot.date >= today,
            Booking.status == BookingStatus.booked,
        )
        .count()
    )

    return DashboardStats(
        total_available_slots=total_available,
        total_booked=total_booked,
        today_appointments=today_appointments,
        upcoming_appointments=upcoming,
    )


# ---------------------------------------------------------------------------
# GET /admin/slots?date=YYYY-MM-DD
# ---------------------------------------------------------------------------
@router.get("/slots", response_model=List[SlotWithBooking])
def get_slots(
    appt_date: Optional[date] = Query(None, alias="date"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(AppointmentSlot)
    if appt_date:
        query = query.filter(AppointmentSlot.date == appt_date)
    slots = query.order_by(AppointmentSlot.date, AppointmentSlot.time).all()
    return slots


# ---------------------------------------------------------------------------
# POST /admin/slots
# ---------------------------------------------------------------------------
@router.post("/slots", response_model=SlotOut, status_code=status.HTTP_201_CREATED)
def create_slot(
    payload: SlotCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # Prevent duplicate slots for the same date + time
    existing = db.query(AppointmentSlot).filter(
        AppointmentSlot.date == payload.date,
        AppointmentSlot.time == payload.time,
        AppointmentSlot.status != SlotStatus.canceled,
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A slot already exists for this date and time",
        )

    slot = AppointmentSlot(
        date=payload.date,
        time=payload.time,
        duration_minutes=payload.duration_minutes or 30,
        notes=payload.notes,
        status=SlotStatus.available,
        created_by_admin_id=admin.id,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


# ---------------------------------------------------------------------------
# PUT /admin/slots/{slot_id}
# ---------------------------------------------------------------------------
@router.put("/slots/{slot_id}", response_model=SlotOut)
def update_slot(
    slot_id: int,
    payload: SlotUpdate,
    force: bool = Query(False),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    slot = db.query(AppointmentSlot).filter(AppointmentSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if slot.status == SlotStatus.booked and not force:
        raise HTTPException(
            status_code=409,
            detail="This slot is already booked. Pass ?force=true to update anyway.",
        )

    if payload.date is not None:
        slot.date = payload.date
    if payload.time is not None:
        slot.time = payload.time
    if payload.duration_minutes is not None:
        slot.duration_minutes = payload.duration_minutes
    if payload.notes is not None:
        slot.notes = payload.notes

    db.commit()
    db.refresh(slot)
    return slot


# ---------------------------------------------------------------------------
# DELETE /admin/slots/{slot_id}
# ---------------------------------------------------------------------------
@router.delete("/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slot(
    slot_id: int,
    background_tasks: BackgroundTasks,
    force: bool = Query(False),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    slot = db.query(AppointmentSlot).filter(AppointmentSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if slot.status == SlotStatus.booked:
        if not force:
            raise HTTPException(
                status_code=409,
                detail="This slot is booked. Pass ?force=true to force cancel and notify the customer.",
            )
        # Cancel the booking and notify customer
        booking = db.query(Booking).filter(
            Booking.slot_id == slot_id,
            Booking.status == BookingStatus.booked,
        ).first()
        if booking:
            booking.status     = BookingStatus.canceled
            booking.canceled_at = datetime.utcnow()

            customer    = booking.customer
            settings    = db.query(AppSettings).first()
            shop_name   = settings.shop_name   if settings else "Kids Barbershop"
            admin_email = settings.admin_email if settings else ""
            admin_fcm   = _get_admin_fcm_token(db, admin_email)
            background_tasks.add_task(
                notifications.notify_cancellation,
                customer_name=customer.full_name,
                customer_fcm_token=customer.fcm_token,
                customer_email=customer.email,
                admin_email=admin_email,
                admin_fcm_token=admin_fcm,
                appointment_type=booking.appointment_type.value,
                appt_date=str(slot.date),
                appt_time=str(slot.time)[:5],
                customer_phone=customer.phone,
                canceled_by="Admin",
                shop_name=shop_name,
            )

    db.delete(slot)
    db.commit()


# ---------------------------------------------------------------------------
# GET /admin/bookings
# ---------------------------------------------------------------------------
@router.get("/bookings", response_model=List[BookingOut])
def get_all_bookings(
    appt_date: Optional[date]   = Query(None, alias="date"),
    appointment_type: Optional[str] = Query(None),
    booking_status: Optional[str]   = Query(None, alias="status"),
    search: Optional[str]           = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Booking).join(AppointmentSlot).join(User, User.id == Booking.customer_id)

    if appt_date:
        query = query.filter(AppointmentSlot.date == appt_date)
    if appointment_type:
        try:
            query = query.filter(Booking.appointment_type == AppointmentType(appointment_type))
        except ValueError:
            pass
    if booking_status:
        try:
            query = query.filter(Booking.status == BookingStatus(booking_status))
        except ValueError:
            pass
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(pattern)) |
            (User.email.ilike(pattern)) |
            (User.phone.ilike(pattern))
        )

    return query.order_by(Booking.created_at.desc()).all()


# ---------------------------------------------------------------------------
# PUT /admin/bookings/{booking_id}/cancel
# ---------------------------------------------------------------------------
@router.put("/bookings/{booking_id}/cancel", response_model=BookingOut)
def admin_cancel_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status == BookingStatus.canceled:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status     = BookingStatus.canceled
    booking.canceled_at = datetime.utcnow()

    # Free the slot
    if booking.slot:
        booking.slot.status = SlotStatus.available

    db.commit()
    db.refresh(booking)

    customer      = booking.customer
    settings      = db.query(AppSettings).first()
    admin_email   = settings.admin_email if settings else ""
    shop_name     = settings.shop_name   if settings else "Kids Barbershop"
    admin_fcm     = _get_admin_fcm_token(db, admin_email)
    appt_date_str = str(booking.slot.date)  if booking.slot else ""
    appt_time_str = str(booking.slot.time)[:5] if booking.slot else ""

    # Tell the waiting list a spot opened on this date
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
        customer_name=customer.full_name,
        customer_fcm_token=customer.fcm_token,
        customer_email=customer.email,
        admin_email=admin_email,
        admin_fcm_token=admin_fcm,
        appointment_type=booking.appointment_type.value,
        appt_date=appt_date_str,
        appt_time=appt_time_str,
        customer_phone=customer.phone,
        canceled_by="Admin",
        shop_name=shop_name,
    )

    return booking


# ---------------------------------------------------------------------------
# GET /admin/settings
# ---------------------------------------------------------------------------
@router.get("/settings", response_model=AppSettingsOut)
def get_settings(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    settings = db.query(AppSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings


# ---------------------------------------------------------------------------
# PUT /admin/settings
# ---------------------------------------------------------------------------
@router.put("/settings", response_model=AppSettingsOut)
def update_settings(
    payload: AppSettingsUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    settings = db.query(AppSettings).first()
    if not settings:
        settings = AppSettings()
        db.add(settings)

    if payload.shop_name is not None:
        settings.shop_name = payload.shop_name
    if payload.admin_email is not None:
        settings.admin_email = payload.admin_email
    if payload.phone is not None:
        settings.phone = payload.phone

    db.commit()
    db.refresh(settings)
    return settings


# ---------------------------------------------------------------------------
# POST /admin/slots/bulk  – weekly schedule: create many slots at once
# ---------------------------------------------------------------------------
@router.post("/slots/bulk", response_model=BulkSlotsResult)
def create_slots_bulk(
    payload: BulkSlotsCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    created = 0
    skipped = 0
    for day in payload.days:
        for slot_time in day.times:
            exists = db.query(AppointmentSlot).filter(
                AppointmentSlot.date == day.date,
                AppointmentSlot.time == slot_time,
                AppointmentSlot.status != SlotStatus.canceled,
            ).first()
            if exists:
                skipped += 1
                continue
            db.add(AppointmentSlot(
                date=day.date,
                time=slot_time,
                duration_minutes=payload.duration_minutes or 30,
                status=SlotStatus.available,
                created_by_admin_id=admin.id,
            ))
            created += 1
    db.commit()
    return BulkSlotsResult(created=created, skipped=skipped)


# ---------------------------------------------------------------------------
# PUT /admin/bookings/{id}/no-show  – mark / unmark a no-show
# ---------------------------------------------------------------------------
@router.put("/bookings/{booking_id}/no-show", response_model=BookingOut)
def set_no_show(
    booking_id: int,
    payload: NoShowUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.no_show = payload.no_show
    db.commit()
    db.refresh(booking)
    return booking


# ---------------------------------------------------------------------------
# GET /admin/customer-stats  – visits / no-shows / last visit per customer
# ---------------------------------------------------------------------------
@router.get("/customer-stats", response_model=List[CustomerStats])
def customer_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from sqlalchemy import case

    today = date.today()
    rows = (
        db.query(
            Booking.customer_id,
            func.count(Booking.id),
            func.sum(case((Booking.no_show == True, 1), else_=0)),  # noqa: E712
            func.max(AppointmentSlot.date),
        )
        .join(AppointmentSlot, AppointmentSlot.id == Booking.slot_id)
        .filter(Booking.status == BookingStatus.booked, AppointmentSlot.date <= today)
        .group_by(Booking.customer_id)
        .all()
    )
    return [
        CustomerStats(
            customer_id=r[0],
            total_visits=r[1] or 0,
            no_shows=int(r[2] or 0),
            last_visit=r[3],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# GET /admin/waitlist  – customers waiting for a slot to open, with details
# ---------------------------------------------------------------------------
@router.get("/waitlist", response_model=List[AdminWaitlistEntry])
def admin_waitlist(
    date_filter: Optional[date] = Query(None, alias="date"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List waitlist entries (today and future only). Optional ?date= filter."""
    q = (
        db.query(WaitlistEntry, User)
        .join(User, User.id == WaitlistEntry.user_id)
        .filter(WaitlistEntry.date >= date.today())
    )
    if date_filter:
        q = q.filter(WaitlistEntry.date == date_filter)

    rows = q.order_by(WaitlistEntry.date, WaitlistEntry.created_at).all()
    return [
        AdminWaitlistEntry(
            id=w.id,
            date=w.date,
            created_at=w.created_at,
            customer_id=u.id,
            customer_name=u.full_name,
            customer_phone=u.phone,
            customer_email=u.email,
        )
        for (w, u) in rows
    ]


# ---------------------------------------------------------------------------
# DELETE /admin/waitlist/{entry_id}  – manually remove someone from the list
# ---------------------------------------------------------------------------
@router.delete("/waitlist/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_waitlist_remove(
    entry_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(WaitlistEntry).filter(WaitlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    db.delete(entry)
    db.commit()


# ---------------------------------------------------------------------------
# GET /admin/stats  – charts data for the statistics page (last 8 weeks)
# ---------------------------------------------------------------------------
@router.get("/stats", response_model=AdminStats)
def admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(weeks=8)

    bookings = (
        db.query(Booking, AppointmentSlot)
        .join(AppointmentSlot, AppointmentSlot.id == Booking.slot_id)
        .filter(AppointmentSlot.date >= since)
        .all()
    )

    weekday_counts = {i: 0 for i in range(7)}   # 0=Monday … 6=Sunday
    hour_counts    = {}
    week_counts    = {}
    booked_total = cancelled_total = no_show_total = 0

    for b, slot in bookings:
        if b.status == BookingStatus.canceled:
            cancelled_total += 1
            continue
        booked_total += 1
        if b.no_show:
            no_show_total += 1

        weekday_counts[slot.date.weekday()] += 1
        hour = slot.time.hour
        hour_counts[hour] = hour_counts.get(hour, 0) + 1
        week_start = slot.date - timedelta(days=(slot.date.weekday() + 1) % 7)  # week starts Sunday
        key = week_start.isoformat()
        week_counts[key] = week_counts.get(key, 0) + 1

    weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    per_weekday = [StatsBucket(label=weekday_names[i], count=weekday_counts[i]) for i in range(7)]
    per_hour = [
        StatsBucket(label=f"{h:02d}:00", count=c)
        for h, c in sorted(hour_counts.items())
    ]
    per_week = [
        StatsBucket(label=k[5:], count=v)   # "MM-DD"
        for k, v in sorted(week_counts.items())
    ]

    return AdminStats(
        per_weekday=per_weekday,
        per_hour=per_hour,
        per_week=per_week,
        booked_total=booked_total,
        cancelled_total=cancelled_total,
        no_show_total=no_show_total,
    )


# ---------------------------------------------------------------------------
# Gallery management
# ---------------------------------------------------------------------------
@router.post("/gallery", response_model=GalleryImageOut, status_code=status.HTTP_201_CREATED)
async def upload_gallery_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        ext = ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"

    os.makedirs(GALLERY_DIR, exist_ok=True)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10 MB)")
    with open(os.path.join(GALLERY_DIR, filename), "wb") as f:
        f.write(contents)

    image = GalleryImage(filename=filename)
    db.add(image)
    db.commit()
    db.refresh(image)
    return GalleryImageOut(id=image.id, url=f"/uploads/gallery/{filename}", uploaded_at=image.uploaded_at)


@router.delete("/gallery/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gallery_image(
    image_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    image = db.query(GalleryImage).filter(GalleryImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        os.remove(os.path.join(GALLERY_DIR, image.filename))
    except OSError:
        pass
    db.delete(image)
    db.commit()
