-- ═══════════════════════════════════════════════════════════════════════════
-- Performance indexes for the Kids Barbershop database.
--
-- SQL Server does NOT automatically index foreign keys or filter columns,
-- so the most common queries scan whole tables as data grows. These indexes
-- keep every hot query fast even with hundreds of thousands of rows.
--
-- Run once in SSMS against the Azure database. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Available-slots lookup: /slots/available?date=X filters on (date, status)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_slots_date_status')
    CREATE INDEX IX_slots_date_status ON appointment_slots(date, status);
GO

-- "My appointments": bookings filtered by customer
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_bookings_customer')
    CREATE INDEX IX_bookings_customer ON bookings(customer_id);
GO

-- Slot -> booking join (admin lists, cancellations)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_bookings_slot')
    CREATE INDEX IX_bookings_slot ON bookings(slot_id);
GO

-- Bookings filtered by status (admin bookings page, dashboard counters)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_bookings_status')
    CREATE INDEX IX_bookings_status ON bookings(status);
GO

-- Waitlist per date (join lookups + notify-on-cancel)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_waitlist_date')
    CREATE INDEX IX_waitlist_date ON waitlist(date);
GO

-- Children per parent (profile page, booking confirmation)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_children_parent')
    CREATE INDEX IX_children_parent ON children(parent_id);
GO

PRINT 'Performance indexes created.';
GO
