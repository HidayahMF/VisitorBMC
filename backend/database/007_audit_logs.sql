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
-- VisitorBMC - Migration 007
-- Creates vms.AuditLogs table for critical action audit trail
--
-- Actions recorded (Action column):
--   LOGIN_SUCCESS
--   LOGIN_FAILED
--   VISIT_CREATED
--   SAFETY_INDUCTION_COMPLETED
--   VISIT_CHECKED_IN
--   VISIT_CHECKED_OUT
--
-- Security rules:
--   * Never store passwords, tokens, or secrets.
--   * Details column stores a short JSON string (entity context only).
--   * IpAddress is optional and truncated to fit IPv6.
--   * CreatedAt is always server-generated.
-- ============================================================

IF NOT EXISTS (
    SELECT * FROM sys.objects
    WHERE object_id = OBJECT_ID('vms.AuditLogs') AND type = 'U'
)
BEGIN
    CREATE TABLE vms.AuditLogs (
        Id          INT IDENTITY(1,1)   NOT NULL,
        UserId      INT                 NULL,
        Action      VARCHAR(50)         NOT NULL,
        EntityType  VARCHAR(50)         NOT NULL,
        EntityId    INT                 NULL,
        Details     NVARCHAR(2000)      NULL,
        IpAddress   VARCHAR(45)         NULL,
        CreatedAt   DATETIME2           NOT NULL    CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_AuditLogs          PRIMARY KEY (Id),
        CONSTRAINT FK_AuditLogs_Users    FOREIGN KEY (UserId) REFERENCES vms.Users(Id)
    );
    PRINT 'Created vms.AuditLogs table.';
END
GO


-- Indexes for audit queries
IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE object_id = OBJECT_ID('vms.AuditLogs') AND name = 'IX_AuditLogs_Action'
)
BEGIN
    CREATE INDEX IX_AuditLogs_Action ON vms.AuditLogs (Action);
    PRINT 'Created IX_AuditLogs_Action index.';
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE object_id = OBJECT_ID('vms.AuditLogs') AND name = 'IX_AuditLogs_EntityType_EntityId'
)
BEGIN
    CREATE INDEX IX_AuditLogs_EntityType_EntityId ON vms.AuditLogs (EntityType, EntityId);
    PRINT 'Created IX_AuditLogs_EntityType_EntityId index.';
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE object_id = OBJECT_ID('vms.AuditLogs') AND name = 'IX_AuditLogs_UserId'
)
BEGIN
    CREATE INDEX IX_AuditLogs_UserId ON vms.AuditLogs (UserId);
    PRINT 'Created IX_AuditLogs_UserId index.';
END
GO

PRINT 'Migration 007 completed.';

-- ROLLBACK (if needed before production data exists):
--   DROP TABLE vms.AuditLogs;