    -- VisitorBMC: assign safety induction content to a visit category.
    IF COL_LENGTH('vms.SafetyInductionContents', 'PurposeCategory') IS NULL
    BEGIN
        ALTER TABLE vms.SafetyInductionContents ADD PurposeCategory VARCHAR(30) NULL;
    END
    GO

    UPDATE vms.SafetyInductionContents
    SET PurposeCategory = 'TECHNICAL_SUPPORT'
    WHERE PurposeCategory IS NULL;
    GO

    ALTER TABLE vms.SafetyInductionContents ALTER COLUMN PurposeCategory VARCHAR(30) NOT NULL;
    GO

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_SICContents_PurposeCategory')
    BEGIN
        ALTER TABLE vms.SafetyInductionContents ADD CONSTRAINT CK_SICContents_PurposeCategory
        CHECK (PurposeCategory IN ('MEETING', 'TECHNICAL_SUPPORT'));
    END
    GO

    PRINT 'Migration 013 completed.';
