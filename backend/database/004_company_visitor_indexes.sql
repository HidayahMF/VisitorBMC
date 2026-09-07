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
-- VisitorBMC - Company & Visitor Indexes Migration
-- Adds indexes to support duplicate detection and search
-- ============================================================

-- Index on PhoneNumber for visitor duplicate detection
-- Filtered index: only non-NULL phone numbers are indexed
IF NOT EXISTS (
  SELECT * FROM sys.indexes 
  WHERE object_id = OBJECT_ID('vms.Visitors') AND name = 'IX_Visitors_PhoneNumber'
)
BEGIN
  CREATE INDEX IX_Visitors_PhoneNumber 
  ON vms.Visitors (PhoneNumber) 
  WHERE PhoneNumber IS NOT NULL;
  PRINT 'Index IX_Visitors_PhoneNumber created.';
END
GO


-- Index on vms.Companies (CompanyName, IsActive) for efficient active-only search
-- The single-column IX_Companies_CompanyName already exists from the initial schema.
-- This composite index supports filtering by both name and active status.
IF NOT EXISTS (
  SELECT * FROM sys.indexes 
  WHERE object_id = OBJECT_ID('vms.Companies') AND name = 'IX_Companies_CompanyName_IsActive'
)
BEGIN
  CREATE INDEX IX_Companies_CompanyName_IsActive 
  ON vms.Companies (CompanyName, IsActive);
  PRINT 'Index IX_Companies_CompanyName_IsActive created.';
END
GO

-- Index on vms.Visitors (VisitorName, CompanyId, IsActive) for efficient
-- duplicate detection by name + company combination.
IF NOT EXISTS (
  SELECT * FROM sys.indexes 
  WHERE object_id = OBJECT_ID('vms.Visitors') AND name = 'IX_Visitors_Name_Company'
)
BEGIN
  CREATE INDEX IX_Visitors_Name_Company 
  ON vms.Visitors (VisitorName, CompanyId);
  PRINT 'Index IX_Visitors_Name_Company created.';
END
GO

PRINT 'Migration 004 completed.';
