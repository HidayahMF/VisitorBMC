-- Expand visit and safety content categories for visitor registration.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Visits_PurposeCategory')
BEGIN
    ALTER TABLE vms.Visits DROP CONSTRAINT CK_Visits_PurposeCategory;
END
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_SICContents_PurposeCategory')
BEGIN
    ALTER TABLE vms.SafetyInductionContents DROP CONSTRAINT CK_SICContents_PurposeCategory;
END
GO

ALTER TABLE vms.Visits ADD CONSTRAINT CK_Visits_PurposeCategory
    CHECK (PurposeCategory IN ('TAKE_GOODS', 'MONITORING', 'SEND_GOODS', 'MEETING', 'TECHNICAL_SUPPORT'));
GO

ALTER TABLE vms.SafetyInductionContents ADD CONSTRAINT CK_SICContents_PurposeCategory
    CHECK (PurposeCategory IN ('TAKE_GOODS', 'MONITORING', 'SEND_GOODS', 'MEETING', 'TECHNICAL_SUPPORT'));
GO

PRINT 'Migration 017 completed.';
