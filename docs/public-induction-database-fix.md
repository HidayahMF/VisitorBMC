# Public Induction Database Fix

The error `Invalid column name 'InductionAccessTokenExpiresAt'` means the application code is newer than the database schema. Run the following in SSMS while connected to database `BMC` on the VisitorBMC SQL Server.

## 1. Read-only preflight

```sql
SELECT DB_NAME() AS DatabaseName;
SELECT OBJECT_ID('vms.Visits', 'U') AS VisitsObjectId;
SELECT
  COL_LENGTH('vms.Visits', 'InductionAccessTokenHash') AS TokenHashColumn,
  COL_LENGTH('vms.Visits', 'InductionAccessTokenExpiresAt') AS TokenExpiryColumn;
SELECT name, is_unique, filter_definition
FROM sys.indexes
WHERE object_id = OBJECT_ID('vms.Visits')
  AND name = 'UX_Visits_InductionAccessTokenHash';
```

Expected before migration:

- `DatabaseName` is `BMC`.
- `VisitsObjectId` is not `NULL`.
- One or both token column values may be `NULL`.
- The token index may be absent.

## 2. Apply migration 009

Run the complete file:

```text
backend/database/009_public_induction_access.sql
```

Do not run it against ERP tables in `dbo`. It only creates columns and an index on `vms.Visits`.

## 3. Read-only postflight

```sql
SELECT
  COL_LENGTH('vms.Visits', 'InductionAccessTokenHash') AS TokenHashColumn,
  COL_LENGTH('vms.Visits', 'InductionAccessTokenExpiresAt') AS TokenExpiryColumn;

SELECT name, is_unique, filter_definition
FROM sys.indexes
WHERE object_id = OBJECT_ID('vms.Visits')
  AND name = 'UX_Visits_InductionAccessTokenHash';
```

Expected after migration:

- Both column values are non-`NULL`.
- `UX_Visits_InductionAccessTokenHash` exists and is unique.
- Its filter is `InductionAccessTokenHash IS NOT NULL` or an equivalent SQL Server representation.

Restart the backend process after the migration and retry `Mulai Safety Induction`.
