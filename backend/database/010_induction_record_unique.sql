-- Defense-in-depth for one completion per visitor/visit/induction.
-- This migration intentionally fails before creating the index if historical
-- duplicates exist; it never deletes or rewrites operational history.
IF EXISTS (
    SELECT 1
    FROM vms.VisitorInductionRecords
    GROUP BY VisitorId, VisitId, SafetyInductionId
    HAVING COUNT(*) > 1
)
BEGIN
    THROW 51010, 'Migration 010 blocked: duplicate VisitorInductionRecords require reviewed cleanup.', 1;
END
GO

-- Business rule prerequisite: a visit must not contain multiple historical
-- completion rows for the same induction. This is intentionally not a
-- cleanup script. Review duplicates before re-running this migration.

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('vms.VisitorInductionRecords')
      AND name = 'UX_VisitorInductionRecords_Visitor_Visit_Induction'
)
BEGIN
    CREATE UNIQUE INDEX UX_VisitorInductionRecords_Visitor_Visit_Induction
      ON vms.VisitorInductionRecords (VisitorId, VisitId, SafetyInductionId);
END
GO
