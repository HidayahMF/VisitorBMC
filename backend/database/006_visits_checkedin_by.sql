-- ============================================================
-- Ensure schema vms exists (idempotent) - all VisitorBMC tables
-- live in the vms schema to avoid collisions with existing dbo
-- ERP tables (dbo.users, VISIT_*, HRIS_*, etc.).
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'vms')
BEGIN
    EXEC(N'CREATE SCHEMA vms');
    PRINT 'Created schema vms.';
END
GO

-- ============================================================
-- VisitorBMC - Migration 006
-- Adds vms.Visits.CheckedInBy for check-in audit trail
--
-- Rationale:
--   * CheckInTime (SYSUTCDATETIME) already records WHEN the visit
--     entered the facility. CheckedInBy records WHICH authenticated
--     user performed the check-in.
--   * The value is populated by the backend from the authenticated
--     identity (JWT), never from the request body.
-- ============================================================

-- 1. Add CheckedInBy column (nullable; only set at check-in)
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('vms.Visits') AND name = 'CheckedInBy'
)
BEGIN
    ALTER TABLE vms.Visits ADD CheckedInBy INT NULL;
    PRINT 'Added vms.Visits.CheckedInBy column.';
END
GO


-- 2. Foreign key to vms.Users (auditable, nullable)
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys
    WHERE name = 'FK_Visits_CheckedInBy' AND parent_object_id = OBJECT_ID('vms.Visits')
)
BEGIN
    ALTER TABLE vms.Visits
        ADD CONSTRAINT FK_Visits_CheckedInBy FOREIGN KEY (CheckedInBy) REFERENCES vms.Users(Id);
    PRINT 'Added FK_Visits_CheckedInBy constraint.';
END
GO

-- 3. Index for audit queries by checking agent
IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE object_id = OBJECT_ID('vms.Visits') AND name = 'IX_Visits_CheckedInBy'
)
BEGIN
    CREATE INDEX IX_Visits_CheckedInBy ON vms.Visits (CheckedInBy);
    PRINT 'Created IX_Visits_CheckedInBy index.';
END
GO

PRINT 'Migration 006 completed.';

-- ROLLBACK (if needed before production data exists):
--   ALTER TABLE vms.Visits DROP CONSTRAINT FK_Visits_CheckedInBy;
--   DROP INDEX IX_Visits_CheckedInBy ON vms.Visits;
--   ALTER TABLE vms.Visits DROP COLUMN CheckedInBy;