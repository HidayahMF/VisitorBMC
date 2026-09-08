-- Read-only deployment verification for BMC. Run in SSMS against BMC.
SELECT DB_NAME() AS DatabaseName, IIF(EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'vms'), 'PASS', 'FAIL') AS VmsSchema;
SELECT s.name AS SchemaName, t.name AS TableName, IIF(t.object_id IS NULL, 'MISSING', 'PRESENT') AS Result
FROM (VALUES ('Users'),('Companies'),('Visitors'),('Visits'),('VisitVisitors'),('VisitDailyCounters'),('SafetyInductions'),('SafetyInductionContents'),('VisitorInductionRecords'),('AuditLogs')) required(name)
LEFT JOIN sys.tables t ON t.name=required.name AND SCHEMA_NAME(t.schema_id)='vms' CROSS JOIN (SELECT 'vms' AS name) s;
SELECT COL_LENGTH('vms.Visits','InductionAccessTokenHash') AS TokenHashColumn, COL_LENGTH('vms.Visits','InductionAccessTokenExpiresAt') AS TokenExpiryColumn;
SELECT IIF(COL_LENGTH('vms.Visits','InductionAccessTokenHash') IS NOT NULL AND COL_LENGTH('vms.Visits','InductionAccessTokenExpiresAt') IS NOT NULL, 'PASS', 'FAIL - run 009_public_induction_access.sql') AS PublicInductionColumns;
SELECT name, is_unique, filter_definition FROM sys.indexes WHERE object_id=OBJECT_ID('vms.Visits') AND name='UX_Visits_InductionAccessTokenHash';
SELECT name, is_unique FROM sys.indexes WHERE object_id=OBJECT_ID('vms.VisitorInductionRecords') AND name='UX_VisitorInductionRecords_Visitor_Visit_Induction';
SELECT VisitorId, VisitId, SafetyInductionId, COUNT(*) AS DuplicateCount FROM vms.VisitorInductionRecords GROUP BY VisitorId,VisitId,SafetyInductionId HAVING COUNT(*)>1;
SELECT IIF(OBJECT_ID('dbo.hris_Employee','U') IS NOT NULL, 'PASS', 'FAIL') AS HrisTable;
SELECT fk.name, OBJECT_SCHEMA_NAME(fk.parent_object_id) AS ParentSchema, OBJECT_NAME(fk.parent_object_id) AS ParentTable FROM sys.foreign_keys fk WHERE fk.parent_object_id IN (OBJECT_ID('vms.Users'),OBJECT_ID('vms.Visits'),OBJECT_ID('vms.VisitorInductionRecords'));
SELECT name, SCHEMA_NAME(schema_id) AS SchemaName FROM sys.tables WHERE name IN ('Users','Companies','Visitors','Visits','VisitVisitors','SafetyInductions','AuditLogs');
-- Expected: vms objects present, migration columns/indexes present, duplicate query empty,
-- dbo.hris_Employee present, and no VisitorBMC table unexpectedly owned by dbo.
