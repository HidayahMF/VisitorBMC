-- ============================================================
-- VisitorBMC - Phase 5: Visit Registration Migration
-- Adds READY_FOR_CHECKIN status and daily counter table for VisitCode
-- ============================================================

-- 1. Update Visits status CHECK constraint to include READY_FOR_CHECKIN
-- First drop the existing constraint
IF EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE object_id = OBJECT_ID('CK_Visits_Status') 
    AND parent_object_id = OBJECT_ID('Visits')
)
BEGIN
    ALTER TABLE Visits DROP CONSTRAINT CK_Visits_Status;
    PRINT 'Dropped CK_Visits_Status constraint.';
END
GO

-- Add updated constraint with READY_FOR_CHECKIN
ALTER TABLE Visits ADD CONSTRAINT CK_Visits_Status 
CHECK (Status IN ('PENDING_INDUCTION', 'READY_FOR_CHECKIN', 'IN', 'OUT', 'CANCELLED'));
GO

PRINT 'Added CK_Visits_Status with READY_FOR_CHECKIN.';

-- 2. Create daily counter table for VisitCode generation
-- This ensures concurrency-safe sequential numbering per day
IF NOT EXISTS (
    SELECT * FROM sys.objects 
    WHERE object_id = OBJECT_ID('VisitDailyCounters') 
    AND type = 'U'
)
BEGIN
    CREATE TABLE VisitDailyCounters (
        VisitDate     DATE        NOT NULL,
        Counter       INT         NOT NULL    CONSTRAINT DF_VisitDailyCounters_Counter DEFAULT 0,
        CreatedAt     DATETIME2   NOT NULL    CONSTRAINT DF_VisitDailyCounters_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt     DATETIME2   NULL,

        CONSTRAINT PK_VisitDailyCounters PRIMARY KEY (VisitDate)
    );
    PRINT 'Created VisitDailyCounters table.';
END
GO

-- 3. Add index on Visits.CreatedBy for audit queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE object_id = OBJECT_ID('Visits') AND name = 'IX_Visits_CreatedBy'
)
BEGIN
    CREATE INDEX IX_Visits_CreatedBy ON Visits (CreatedBy);
    PRINT 'Created IX_Visits_CreatedBy index.';
END
GO

-- 4. Add index on Visits.VisitDate + Status for common queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE object_id = OBJECT_ID('Visits') AND name = 'IX_Visits_VisitDate_Status'
)
BEGIN
    CREATE INDEX IX_Visits_VisitDate_Status ON Visits (VisitDate, Status);
    PRINT 'Created IX_Visits_VisitDate_Status index.';
END
GO

PRINT 'Migration 005 completed.';