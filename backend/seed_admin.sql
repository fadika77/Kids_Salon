-- ═══════════════════════════════════════════════════════════════════════════
-- Kids Barbershop – Seed Default Admin User
--
-- IMPORTANT: The password hash below corresponds to:  Admin123!
-- Generated with bcrypt (12 rounds).
--
-- After running this script, log in with:
--   Email:    admin@kidsbarbershop.com
--   Password: Admin123!
--
-- Then CHANGE the password immediately via the Settings page.
-- ═══════════════════════════════════════════════════════════════════════════

USE KidsBarbershop;
GO

-- Only insert if no admin exists yet
IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
BEGIN
    INSERT INTO users (full_name, email, phone, password_hash, role)
    VALUES (
        'Admin',
        'admin@kidsbarbershop.com',
        '0000000000',
        -- bcrypt hash of "Admin123!"
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK9jNMjdy',
        'admin'
    );
    PRINT '✅ Default admin user created: admin@kidsbarbershop.com / Admin123!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Admin user already exists. Skipping seed.';
END
GO

-- Also seed default app settings if empty
IF NOT EXISTS (SELECT 1 FROM app_settings)
BEGIN
    INSERT INTO app_settings (shop_name, admin_email, phone)
    VALUES ('Kids Barbershop', 'admin@kidsbarbershop.com', NULL);
    PRINT '✅ Default app settings inserted.';
END
GO
