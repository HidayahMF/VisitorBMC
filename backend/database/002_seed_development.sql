-- ============================================================
-- VisitorBMC - Development Seed Data
-- For local development only. Do NOT use in production.
-- Passwords are stored as hashed values (bcrypt), not plain text.
-- ============================================================

-- ------------------------------------------------------------
-- Safety Induction seed (minimal required for development)
-- ------------------------------------------------------------
INSERT INTO SafetyInductions (Title, Version, ValidMonths, IsActive, ForceReinductionOnNewVersion)
VALUES ('Visitor Safety Induction', 1, 6, 1, 0);

DECLARE @InductionId INT = SCOPE_IDENTITY();

-- Sample content (replace with actual files later)
INSERT INTO SafetyInductionContents (SafetyInductionId, ContentType, ContentUrl, Title, Description, SortOrder, IsRequired)
VALUES
    (@InductionId, 'VIDEO', '/uploads/safety-induction/intro.mp4', 'Welcome & Safety Overview', 'Introduction to site safety rules and emergency procedures.', 1, 1),
    (@InductionId, 'IMAGE', '/uploads/safety-induction/emergency-exit.png', 'Emergency Exits', 'Locations and procedures for emergency evacuation.', 2, 1),
    (@InductionId, 'VIDEO', '/uploads/safety-induction/ppe.mp4', 'Personal Protective Equipment', 'Required PPE and proper usage instructions.', 3, 1),
    (@InductionId, 'IMAGE', '/uploads/safety-induction/no-smoking.jpg', 'Site Rules', 'Prohibited items and areas.', 4, 1);

-- ------------------------------------------------------------
-- System config for quick reference
-- In production, these may be stored in a configuration table
-- ------------------------------------------------------------

-- Notes:
-- 1. No Users are seeded with passwords in plain text.
--    Authentication will be implemented in Phase 3.
--    When it is, use a script like:
--
--    INSERT INTO Users (Name, Username, PasswordHash, Role, IsActive)
--    VALUES ('Administrator', 'admin', '<BCRYPT_HASH_HERE>', 'ADMIN', 1);
--
--    Generate hash with:
--    node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your_password', 10).then(h => console.log(h));"
--
-- 2. No Companies are seeded.
--    These can be created dynamically through the application UI.
--
-- 3. No Visitors are seeded.
--    Visitors are created per visit through the application UI.

PRINT 'Seed data completed: Safety Induction V1 with 4 content items.';
