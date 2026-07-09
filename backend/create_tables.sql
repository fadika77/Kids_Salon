-- ═══════════════════════════════════════════════════════════════════════════
-- Kids Barbershop – SQL Server Database & Table Creation (FULL, up to date)
-- Creates the KidsBarbershop database and all tables exactly as the app
-- uses them today. Safe to re-run: skips anything that already exists.
-- Run in SSMS or via sqlcmd.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Database ─────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'KidsBarbershop')
BEGIN
    CREATE DATABASE KidsBarbershop;
    PRINT 'Database KidsBarbershop created.';
END
GO

USE KidsBarbershop;
GO

-- ─── 2. Users ────────────────────────────────────────────────────────────────
-- email is OPTIONAL for customers (phone is their unique identifier),
-- so uniqueness is enforced with a filtered index that ignores NULLs.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id                 INT           IDENTITY(1,1) PRIMARY KEY,
        full_name          NVARCHAR(255) NOT NULL,
        email              NVARCHAR(255) NULL,
        phone              NVARCHAR(50)  NOT NULL,
        password_hash      NVARCHAR(255) NOT NULL,
        role               NVARCHAR(20)  NOT NULL DEFAULT 'customer'
                             CHECK (role IN ('admin', 'customer')),
        fcm_token          NVARCHAR(512) NULL,          -- Firebase push notification token
        reset_code         NVARCHAR(10)  NULL,          -- admin "forgot password" code
        reset_code_expires DATETIME2     NULL,          -- code expiry (15 min)
        created_at         DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        updated_at         DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );

    -- Unique emails, but multiple customers WITHOUT email are allowed
    CREATE UNIQUE INDEX UX_users_email ON users(email) WHERE email IS NOT NULL;
    CREATE INDEX IX_users_phone ON users(phone);

    PRINT 'Table users created.';
END
GO

-- ─── 3. Appointment Slots ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'appointment_slots')
BEGIN
    CREATE TABLE appointment_slots (
        id                   INT           IDENTITY(1,1) PRIMARY KEY,
        date                 DATE          NOT NULL,
        time                 TIME(0)       NOT NULL,
        duration_minutes     INT           NOT NULL DEFAULT 30,
        notes                NVARCHAR(500) NULL,
        status               NVARCHAR(20)  NOT NULL DEFAULT 'available'
                               CHECK (status IN ('available', 'booked', 'canceled')),
        created_by_admin_id  INT           NULL REFERENCES users(id),
        created_at           DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        updated_at           DATETIME2     NOT NULL DEFAULT GETUTCDATE(),

        -- Prevent two slots at the same date+time
        CONSTRAINT UQ_slots_date_time UNIQUE (date, time)
    );

    CREATE INDEX IX_slots_date   ON appointment_slots(date);
    CREATE INDEX IX_slots_status ON appointment_slots(status);

    PRINT 'Table appointment_slots created.';
END
GO

-- ─── 4. Children (kids profiles) ─────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'children')
BEGIN
    CREATE TABLE children (
        id         INT           IDENTITY(1,1) PRIMARY KEY,
        parent_id  INT           NOT NULL REFERENCES users(id),
        name       NVARCHAR(100) NOT NULL,
        created_at DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX IX_children_parent ON children(parent_id);
    PRINT 'Table children created.';
END
GO

-- ─── 5. Bookings ─────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bookings')
BEGIN
    CREATE TABLE bookings (
        id               INT          IDENTITY(1,1) PRIMARY KEY,
        slot_id          INT          NOT NULL REFERENCES appointment_slots(id),
        customer_id      INT          NOT NULL REFERENCES users(id),
        child_id         INT          NULL REFERENCES children(id),   -- optional kid profile
        appointment_type NVARCHAR(30) NOT NULL
                           CHECK (appointment_type IN ('BOYS_HAIRCUT', 'GIRLS_HAIR_DESIGN')),
        status           NVARCHAR(20) NOT NULL DEFAULT 'booked'
                           CHECK (status IN ('booked', 'canceled')),
        booked_at        DATETIME2    NOT NULL DEFAULT GETUTCDATE(),
        canceled_at      DATETIME2    NULL,
        reminder_sent    BIT          NOT NULL DEFAULT 0,   -- 1-hour reminder already sent?
        no_show          BIT          NOT NULL DEFAULT 0,   -- customer didn't show up?
        created_at       DATETIME2    NOT NULL DEFAULT GETUTCDATE(),
        updated_at       DATETIME2    NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX IX_bookings_customer ON bookings(customer_id);
    CREATE INDEX IX_bookings_slot     ON bookings(slot_id);
    CREATE INDEX IX_bookings_status   ON bookings(status);

    PRINT 'Table bookings created.';
END
GO

-- ─── 6. Waiting list ─────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'waitlist')
BEGIN
    CREATE TABLE waitlist (
        id         INT       IDENTITY(1,1) PRIMARY KEY,
        user_id    INT       NOT NULL REFERENCES users(id),
        date       DATE      NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX IX_waitlist_date ON waitlist(date);
    PRINT 'Table waitlist created.';
END
GO

-- ─── 7. Gallery images ───────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'gallery_images')
BEGIN
    CREATE TABLE gallery_images (
        id          INT           IDENTITY(1,1) PRIMARY KEY,
        filename    NVARCHAR(255) NOT NULL,
        uploaded_at DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'Table gallery_images created.';
END
GO

-- ─── 8. App Settings ─────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_settings')
BEGIN
    CREATE TABLE app_settings (
        id          INT           IDENTITY(1,1) PRIMARY KEY,
        shop_name   NVARCHAR(255) NOT NULL DEFAULT 'Kids Barbershop',
        admin_email NVARCHAR(255) NOT NULL,
        phone       NVARCHAR(50)  NULL,
        updated_at  DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'Table app_settings created.';
END
GO

PRINT 'All tables created successfully.';
PRINT 'Note: the default admin user and app settings are seeded automatically';
PRINT 'the first time the backend starts (see backend/app/main.py).';
GO
