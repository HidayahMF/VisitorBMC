IF COL_LENGTH('vms.SecurityTravelCheckpoints', 'TravelId') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_SecurityTravelCheckpoints_ActiveTravel')
        ALTER TABLE vms.SecurityTravelCheckpoints DROP CONSTRAINT UQ_SecurityTravelCheckpoints_ActiveTravel;
    ALTER TABLE vms.SecurityTravelCheckpoints
      ALTER COLUMN TravelId VARCHAR(50) NOT NULL;
    ALTER TABLE vms.SecurityTravelCheckpoints
      ADD CONSTRAINT UQ_SecurityTravelCheckpoints_ActiveTravel UNIQUE (TravelId, ReturnedDate);
END
GO
