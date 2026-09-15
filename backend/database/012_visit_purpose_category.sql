-- VisitorBMC: categorize visit purpose and make safety induction category-specific.
IF COL_LENGTH('vms.Visits', 'PurposeCategory') IS NULL
BEGIN
    ALTER TABLE vms.Visits ADD PurposeCategory VARCHAR(30) NULL;
END
GO

UPDATE vms.Visits
SET PurposeCategory = CASE
    WHEN LOWER(Purpose) LIKE '%technical%' OR LOWER(Purpose) LIKE '%teknisi%' THEN 'TECHNICAL_SUPPORT'
    ELSE 'MEETING'
END
WHERE PurposeCategory IS NULL;
GO

ALTER TABLE vms.Visits ALTER COLUMN PurposeCategory VARCHAR(30) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Visits_PurposeCategory')
BEGIN
    ALTER TABLE vms.Visits ADD CONSTRAINT CK_Visits_PurposeCategory
      CHECK (PurposeCategory IN ('MEETING', 'TECHNICAL_SUPPORT'));
END
GO

PRINT 'Migration 012 completed.';
