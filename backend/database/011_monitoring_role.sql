-- Add the Monitoring role while preserving existing users and permissions.
IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_Users_Role' AND parent_object_id = OBJECT_ID('vms.Users')
)
BEGIN
    ALTER TABLE vms.Users DROP CONSTRAINT CK_Users_Role;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_Users_Role' AND parent_object_id = OBJECT_ID('vms.Users')
)
BEGIN
    ALTER TABLE vms.Users ADD CONSTRAINT CK_Users_Role
      CHECK (Role IN ('ADMIN', 'SECURITY', 'MONITORING'));
END
GO
