-- ═══════════════════════════════════════════════════════════════════════════
-- Gallery cloud storage: add the columns for Cloudinary-hosted images.
-- Run once in SSMS against the Azure database (and your local DB if you use one).
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID('gallery_images') AND name = 'url')
    ALTER TABLE gallery_images ADD url NVARCHAR(500) NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID('gallery_images') AND name = 'public_id')
    ALTER TABLE gal   
    
    
    lery_images ADD public_id NVARCHAR(255) NULL;
GO

PRINT 'gallery_images is ready for cloud storage.';
GO
