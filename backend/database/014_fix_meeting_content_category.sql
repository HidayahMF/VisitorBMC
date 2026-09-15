-- Correct legacy content whose title clearly identifies it as Meeting content.
UPDATE vms.SafetyInductionContents
SET PurposeCategory = 'MEETING'
WHERE LOWER(ISNULL(Title, '')) LIKE '%meeting%';
GO

PRINT 'Migration 014 completed.';
