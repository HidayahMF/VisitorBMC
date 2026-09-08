-- Short-lived bearer access for public safety induction.
IF OBJECT_ID('vms.Visits', 'U') IS NULL
BEGIN
    THROW 51009, 'Migration 009 blocked: vms.Visits does not exist.', 1;
END
GO

IF COL_LENGTH('vms.Visits', 'InductionAccessTokenHash') IS NULL
BEGIN
    ALTER TABLE vms.Visits ADD InductionAccessTokenHash VARBINARY(32) NULL;
END
GO

IF COL_LENGTH('vms.Visits', 'InductionAccessTokenExpiresAt') IS NULL
BEGIN
    ALTER TABLE vms.Visits ADD InductionAccessTokenExpiresAt DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('vms.Visits') AND name = 'UX_Visits_InductionAccessTokenHash')
BEGIN
    CREATE UNIQUE INDEX UX_Visits_InductionAccessTokenHash ON vms.Visits(InductionAccessTokenHash) WHERE InductionAccessTokenHash IS NOT NULL;
END
GO
