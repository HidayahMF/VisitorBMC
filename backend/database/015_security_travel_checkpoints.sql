-- Security departure checkpoints. ERP travel approval remains read-only.
IF OBJECT_ID('vms.SecurityTravelCheckpoints', 'U') IS NULL
BEGIN
    CREATE TABLE vms.SecurityTravelCheckpoints (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SecurityTravelCheckpoints PRIMARY KEY,
        TravelId VARCHAR(50) NOT NULL,
        NIP VARCHAR(50) NOT NULL,
        DepartureDate DATE NOT NULL CONSTRAINT DF_SecurityTravelCheckpoints_DepartureDate DEFAULT CONVERT(date, GETDATE()),
        DepartureTime TIME(0) NOT NULL,
        ReturnedDate DATE NULL,
        ReturnedTime TIME(0) NULL,
        DepartedBy INT NOT NULL,
        ReturnedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SecurityTravelCheckpoints_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT UQ_SecurityTravelCheckpoints_ActiveTravel UNIQUE (TravelId, ReturnedDate)
    );
END
GO

CREATE INDEX IX_SecurityTravelCheckpoints_Active
ON vms.SecurityTravelCheckpoints (ReturnedDate, DepartureDate);
GO
