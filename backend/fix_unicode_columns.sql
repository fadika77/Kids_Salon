-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: convert text columns to NVARCHAR so Hebrew & Arabic are stored
-- correctly (VARCHAR columns turn non-Latin characters into '?').
--
-- Run this on EVERY existing database (Azure via SSMS, and your local one).
-- Safe to re-run. Existing '????' values are already corrupted and must be
-- re-typed after the fix — the fix protects all NEW data.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Drop indexes that block altering users columns ──────────────────────
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_users_email' AND object_id = OBJECT_ID('users'))
    DROP INDEX ix_users_email ON users;
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_users_email' AND object_id = OBJECT_ID('users'))
    DROP INDEX UX_users_email ON users;
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_phone' AND object_id = OBJECT_ID('users'))
    DROP INDEX IX_users_phone ON users;
GO

-- ─── 2. Users ────────────────────────────────────────────────────────────────
ALTER TABLE users ALTER COLUMN full_name     NVARCHAR(255) NOT NULL;
ALTER TABLE users ALTER COLUMN email         NVARCHAR(255) NULL;
ALTER TABLE users ALTER COLUMN phone         NVARCHAR(50)  NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash NVARCHAR(255) NOT NULL;
ALTER TABLE users ALTER COLUMN fcm_token     NVARCHAR(512) NULL;
ALTER TABLE users ALTER COLUMN reset_code    NVARCHAR(10)  NULL;
GO

-- ─── 3. Recreate the users indexes ───────────────────────────────────────────
-- Unique emails, but multiple customers WITHOUT email are allowed:
CREATE UNIQUE INDEX UX_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IX_users_phone ON users(phone);
GO

-- ─── 4. Appointment slots (notes) ────────────────────────────────────────────
ALTER TABLE appointment_slots ALTER COLUMN notes NVARCHAR(500) NULL;
GO

-- ─── 5. Children (kids names — very likely to be Arabic/Hebrew!) ────────────
ALTER TABLE children ALTER COLUMN name NVARCHAR(100) NOT NULL;
GO

-- ─── 6. App settings ─────────────────────────────────────────────────────────
ALTER TABLE app_settings ALTER COLUMN shop_name   NVARCHAR(255) NOT NULL;
ALTER TABLE app_settings ALTER COLUMN admin_email NVARCHAR(255) NOT NULL;
ALTER TABLE app_settings ALTER COLUMN phone       NVARCHAR(50)  NULL;
GO

-- ─── 7. Gallery ──────────────────────────────────────────────────────────────
ALTER TABLE gallery_images ALTER COLUMN filename NVARCHAR(255) NOT NULL;
GO

PRINT 'All text columns are now NVARCHAR - Hebrew and Arabic will be stored correctly.';
GO
