-- ============================================================
-- VisitorBMC - Safety induction content management
-- ============================================================

IF COL_LENGTH('vms.SafetyInductionContents', 'IsActive') IS NULL
BEGIN
    ALTER TABLE vms.SafetyInductionContents
      ADD IsActive BIT NOT NULL CONSTRAINT DF_SICContents_IsActive DEFAULT 1;
END
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_SICContents_ContentType')
BEGIN
    ALTER TABLE vms.SafetyInductionContents DROP CONSTRAINT CK_SICContents_ContentType;
END
GO

ALTER TABLE vms.SafetyInductionContents
  ADD CONSTRAINT CK_SICContents_ContentType CHECK (ContentType IN ('IMAGE', 'VIDEO', 'PDF'));
GO

-- Development defaults. The frontend resolves these asset keys to the files
-- already committed under frontend/src/assets.
UPDATE vms.SafetyInductionContents
SET ContentUrl = 'asset://bmc-k3-video',
    ContentType = 'VIDEO',
    Title = 'Video K3 BMC Versi Tamu',
    Description = 'Video safety induction untuk visitor BMC.',
    SortOrder = 1,
    IsActive = 1
WHERE ContentUrl LIKE '%intro.mp4%';

UPDATE vms.SafetyInductionContents
SET ContentUrl = 'asset://bmc-safety-riding',
    ContentType = 'IMAGE',
    Title = 'Imbauan Safety Riding',
    Description = 'Imbauan keselamatan berkendara di area BMC.',
    SortOrder = 2,
    IsActive = 1
WHERE ContentUrl LIKE '%emergency-exit%';

UPDATE vms.SafetyInductionContents
SET IsActive = 0
WHERE ContentUrl LIKE '%ppe.mp4%' OR ContentUrl LIKE '%no-smoking%';
GO
