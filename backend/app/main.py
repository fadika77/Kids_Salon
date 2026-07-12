import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

from .database import engine, Base, SessionLocal
from .models import AppSettings, UserRole
from . import models  # noqa: F401 – ensure all models are imported before create_all

from .routers import auth as auth_router
from .routers import customer as customer_router
from .routers import admin as admin_router
from .scheduler import send_upcoming_reminders

load_dotenv()

# Background scheduler for appointment reminders
_scheduler = BackgroundScheduler()

# ---------------------------------------------------------------------------
# Create FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Kids Salon API",
    description="Backend API for the Kids Salon booking system",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS – allow all origins in development; restrict in production
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,capacitor://localhost,http://localhost",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # for dev / Capacitor; narrow down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
app.include_router(auth_router.router,     prefix="/auth",          tags=["Auth"])
app.include_router(customer_router.router, prefix="",               tags=["Customer"])
app.include_router(admin_router.router,    prefix="/admin",         tags=["Admin"])

# ---------------------------------------------------------------------------
# Static files – gallery images uploaded by the admin
# ---------------------------------------------------------------------------
os.makedirs(os.path.join("uploads", "gallery"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ---------------------------------------------------------------------------
# Startup – create tables and seed default admin
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed default app settings if table is empty
        if db.query(AppSettings).count() == 0:
            default_admin_email = os.getenv("ADMIN_DEFAULT_EMAIL", "kidssalon060@gmail.com")
            settings = AppSettings(
                shop_name=os.getenv("SHOP_NAME", "Kids Salon"),
                admin_email=default_admin_email,
            )
            db.add(settings)
            db.commit()
            print("[OK] Default app settings created.")

        # Seed default admin user if none exists
        from .models import User
        from .auth import hash_password
        if db.query(User).filter(User.role == UserRole.admin).count() == 0:
            admin_email    = os.getenv("ADMIN_DEFAULT_EMAIL", "kidssalon060@gmail.com")
            admin_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "Salon123!")
            admin = User(
                full_name="Admin",
                email=admin_email,
                phone="0000000000",
                password_hash=hash_password(admin_password),
                role=UserRole.admin,
            )
            db.add(admin)
            db.commit()
            print(f"[OK] Default admin created: {admin_email} / {admin_password}")
    finally:
        db.close()

    # Start reminder scheduler (every 5 minutes)
    _scheduler.add_job(send_upcoming_reminders, "interval", minutes=5, id="reminder_job")
    _scheduler.start()
    print("[OK] Reminder scheduler started (every 5 minutes)")


@app.on_event("shutdown")
def on_shutdown():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
# HEAD is included so uptime monitors (UptimeRobot etc.) get a 200 instead of 405
@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"status": "ok", "message": "Kids Salon API is running"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "healthy"}
