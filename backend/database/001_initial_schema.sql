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
-- VisitorBMC - Visitor Management & Safety Induction System
-- Database Schema: SQL Server
-- Timestamps: All timestamps stored in UTC (SYSUTCDATETIME())
-- ============================================================

-- ============================================================
-- 1. vms.Users
-- ============================================================
CREATE TABLE vms.Users (
    Id              INT IDENTITY(1,1)   NOT NULL,
    Name            NVARCHAR(100)       NOT NULL,
    Username        VARCHAR(50)         NOT NULL,
    PasswordHash    VARCHAR(255)        NOT NULL,
    Role            VARCHAR(20)         NOT NULL,
    IsActive        BIT                 NOT NULL    CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAt       DATETIME2           NOT NULL    CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NULL,

    CONSTRAINT PK_Users               PRIMARY KEY (Id),
    CONSTRAINT UQ_Users_Username      UNIQUE (Username),
    CONSTRAINT CK_Users_Role          CHECK (Role IN ('ADMIN', 'SECURITY'))
);
GO


-- ============================================================
-- 2. vms.Companies
-- ============================================================
CREATE TABLE vms.Companies (
    Id              INT IDENTITY(1,1)   NOT NULL,
    CompanyName     NVARCHAR(100)       NOT NULL,
    IsActive        BIT                 NOT NULL    CONSTRAINT DF_Companies_IsActive DEFAULT 1,
    CreatedAt       DATETIME2           NOT NULL    CONSTRAINT DF_Companies_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NULL,

    CONSTRAINT PK_Companies            PRIMARY KEY (Id)
);
GO

-- Index for company name search
CREATE INDEX IX_Companies_CompanyName ON vms.Companies (CompanyName);
GO

-- ============================================================
-- 3. vms.Visitors
-- ============================================================
CREATE TABLE vms.Visitors (
    Id              INT IDENTITY(1,1)   NOT NULL,
    VisitorCode     VARCHAR(20)         NOT NULL,
    VisitorName     NVARCHAR(100)       NOT NULL,
    CompanyId       INT                 NOT NULL,
    PhoneNumber     VARCHAR(20)         NULL,
    IsActive        BIT                 NOT NULL    CONSTRAINT DF_Visitors_IsActive DEFAULT 1,
    CreatedAt       DATETIME2           NOT NULL    CONSTRAINT DF_Visitors_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NULL,

    CONSTRAINT PK_Visitors             PRIMARY KEY (Id),
    CONSTRAINT UQ_Visitors_VisitorCode UNIQUE (VisitorCode),
    CONSTRAINT FK_Visitors_Companies   FOREIGN KEY (CompanyId) REFERENCES vms.Companies(Id)
);
GO

CREATE INDEX IX_Visitors_VisitorName  ON vms.Visitors (VisitorName);
CREATE INDEX IX_Visitors_CompanyId    ON vms.Visitors (CompanyId);
GO

-- ============================================================
-- 4. vms.Visits
-- ============================================================
CREATE TABLE vms.Visits (
    Id              INT IDENTITY(1,1)   NOT NULL,
    VisitCode       VARCHAR(20)         NOT NULL,
    CompanyId       INT                 NOT NULL,
    HostName        NVARCHAR(100)       NOT NULL,
    Purpose         NVARCHAR(255)       NOT NULL,
    VisitDate       DATE                NOT NULL,
    CheckInTime     DATETIME2           NULL,
    CheckOutTime    DATETIME2           NULL,
    Status          VARCHAR(20)         NOT NULL    CONSTRAINT DF_Visits_Status DEFAULT 'PENDING_INDUCTION',
    CreatedBy       INT                 NOT NULL,
    CheckedOutBy    INT                 NULL,
    CreatedAt       DATETIME2           NOT NULL    CONSTRAINT DF_Visits_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NULL,

    CONSTRAINT PK_Visits               PRIMARY KEY (Id),
    CONSTRAINT UQ_Visits_VisitCode     UNIQUE (VisitCode),
    CONSTRAINT FK_Visits_Companies     FOREIGN KEY (CompanyId) REFERENCES vms.Companies(Id),
    CONSTRAINT FK_Visits_CreatedBy     FOREIGN KEY (CreatedBy) REFERENCES vms.Users(Id),
    CONSTRAINT FK_Visits_CheckedOutBy  FOREIGN KEY (CheckedOutBy) REFERENCES vms.Users(Id),
    CONSTRAINT CK_Visits_Status        CHECK (Status IN ('PENDING_INDUCTION', 'IN', 'OUT', 'CANCELLED'))
);
GO

-- IX_Visits_VisitCode is intentionally omitted:
-- UQ_Visits_VisitCode (UNIQUE constraint) already creates a unique index.
CREATE INDEX IX_Visits_VisitDate      ON vms.Visits (VisitDate);
CREATE INDEX IX_Visits_Status         ON vms.Visits (Status);
CREATE INDEX IX_Visits_CompanyId      ON vms.Visits (CompanyId);
GO

-- ============================================================
-- 5. vms.VisitVisitors (junction table)
-- ============================================================
-- Junction table: links vms.Visits to vms.Visitors (Many-to-Many).
-- SafetyStatus is intentionally NOT stored here.
-- It is computed at runtime based on the latest vms.VisitorInductionRecords
-- and the current SafetyInduction configuration.
-- Reason: storing it would create a duplicate source of truth and
-- require constant synchronization when induction status changes.
CREATE TABLE vms.VisitVisitors (
    Id              INT IDENTITY(1,1)   NOT NULL,
    VisitId         INT                 NOT NULL,
    VisitorId       INT                 NOT NULL,
    CreatedAt       DATETIME2           NOT NULL    CONSTRAINT DF_VisitVisitors_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_VisitVisitors            PRIMARY KEY (Id),
    CONSTRAINT UQ_VisitVisitors_Visit_Visitor UNIQUE (VisitId, VisitorId),
    CONSTRAINT FK_VisitVisitors_Visits     FOREIGN KEY (VisitId) REFERENCES vms.Visits(Id),
    CONSTRAINT FK_VisitVisitors_Visitors   FOREIGN KEY (VisitorId) REFERENCES vms.Visitors(Id)
);
GO

CREATE INDEX IX_VisitVisitors_VisitId     ON vms.VisitVisitors (VisitId);
CREATE INDEX IX_VisitVisitors_VisitorId   ON vms.VisitVisitors (VisitorId);
GO

-- ============================================================
-- 6. vms.SafetyInductions
-- ============================================================
CREATE TABLE vms.SafetyInductions (
    Id                          INT IDENTITY(1,1)   NOT NULL,
    Title                       NVARCHAR(200)       NOT NULL,
    Version                     INT                 NOT NULL    CONSTRAINT DF_SafetyInductions_Version DEFAULT 1,
    ValidMonths                 INT                 NOT NULL    CONSTRAINT DF_SafetyInductions_ValidMonths DEFAULT 6,
    IsActive                    BIT                 NOT NULL    CONSTRAINT DF_SafetyInductions_IsActive DEFAULT 1,
    ForceReinductionOnNewVersion BIT                NOT NULL    CONSTRAINT DF_SafetyInductions_ForceReinduction DEFAULT 0,
    CreatedAt                   DATETIME2           NOT NULL    CONSTRAINT DF_SafetyInductions_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt                   DATETIME2           NULL,

    CONSTRAINT PK_SafetyInductions        PRIMARY KEY (Id),
    CONSTRAINT CK_SafetyInductions_Version CHECK (Version > 0),
    CONSTRAINT CK_SafetyInductions_ValidMonths CHECK (ValidMonths > 0)
);
GO

-- ============================================================
-- 7. vms.SafetyInductionContents
-- ============================================================
CREATE TABLE vms.SafetyInductionContents (
    Id                      INT IDENTITY(1,1)   NOT NULL,
    SafetyInductionId       INT                 NOT NULL,
    ContentType             VARCHAR(10)         NOT NULL,
    ContentUrl              NVARCHAR(500)       NOT NULL,
    Title                   NVARCHAR(200)       NULL,
    Description             NVARCHAR(1000)      NULL,
    SortOrder               INT                 NOT NULL    CONSTRAINT DF_SICContents_SortOrder DEFAULT 0,
    IsRequired              BIT                 NOT NULL    CONSTRAINT DF_SICContents_IsRequired DEFAULT 1,
    CreatedAt               DATETIME2           NOT NULL    CONSTRAINT DF_SICContents_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_SICContents                     PRIMARY KEY (Id),
    CONSTRAINT FK_SICContents_SafetyInductions    FOREIGN KEY (SafetyInductionId) REFERENCES vms.SafetyInductions(Id),
    CONSTRAINT CK_SICContents_ContentType         CHECK (ContentType IN ('IMAGE', 'VIDEO'))
);
GO

CREATE INDEX IX_SICContents_SafetyInductionId ON vms.SafetyInductionContents (SafetyInductionId);
GO

-- ============================================================
-- 8. vms.VisitorInductionRecords
-- ============================================================
-- This is the critical audit/history table.
-- Each row represents one completed induction by one visitor.
-- Old records are NEVER deleted or overwritten.
-- Validity is server-calculated: CompletedAt + ValidMonths.
CREATE TABLE vms.VisitorInductionRecords (
    Id                      INT IDENTITY(1,1)   NOT NULL,
    VisitorId               INT                 NOT NULL,
    VisitId                 INT                 NOT NULL,
    SafetyInductionId       INT                 NOT NULL,
    InductionVersion        INT                 NOT NULL,
    CompletedAt             DATETIME2           NOT NULL    CONSTRAINT DF_VIRecords_CompletedAt DEFAULT SYSUTCDATETIME(),
    ValidUntil              DATETIME2           NOT NULL,
    Acknowledged           BIT                 NOT NULL    CONSTRAINT DF_VIRecords_Acknowledged DEFAULT 0,
    AcknowledgedAt         DATETIME2           NULL,
    CreatedBy              INT                 NULL,
    CreatedAt              DATETIME2           NOT NULL    CONSTRAINT DF_VIRecords_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_VIRecords                         PRIMARY KEY (Id),
    CONSTRAINT FK_VIRecords_Visitors                FOREIGN KEY (VisitorId) REFERENCES vms.Visitors(Id),
    CONSTRAINT FK_VIRecords_Visits                  FOREIGN KEY (VisitId) REFERENCES vms.Visits(Id),
    CONSTRAINT FK_VIRecords_SafetyInductions        FOREIGN KEY (SafetyInductionId) REFERENCES vms.SafetyInductions(Id),
    CONSTRAINT FK_VIRecords_CreatedBy               FOREIGN KEY (CreatedBy) REFERENCES vms.Users(Id),
    CONSTRAINT CK_VIRecords_InductionVersion        CHECK (InductionVersion > 0)
);
GO

-- Index for fast validity checks and history queries
CREATE INDEX IX_VIRecords_VisitorId                ON vms.VisitorInductionRecords (VisitorId);
CREATE INDEX IX_VIRecords_VisitorId_SafetyInductionId_CompletedAt
    ON vms.VisitorInductionRecords (VisitorId, SafetyInductionId, CompletedAt);
CREATE INDEX IX_VIRecords_ValidUntil               ON vms.VisitorInductionRecords (ValidUntil);
-- FK index for audit queries: find inductions supervised by a specific Security user
CREATE INDEX IX_VIRecords_CreatedBy               ON vms.VisitorInductionRecords (CreatedBy);
GO
