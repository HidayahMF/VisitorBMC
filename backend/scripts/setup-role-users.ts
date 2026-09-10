import { closeDbConnection, getDbConnection, sql } from '../src/config/database';
import { hashPassword } from '../src/services/auth.service';

const users = [
  { name: 'Administrator', username: 'admin', password: 'adminbmc', role: 'ADMIN' },
  { name: 'Monitoring User', username: 'monitoring', password: 'monitoringbmc', role: 'MONITORING' },
  { name: 'Security User', username: 'security', password: 'securitybmc', role: 'SECURITY' },
] as const;

async function main() {
  const pool = await getDbConnection();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    for (const user of users) {
      const passwordHash = await hashPassword(user.password);
      await transaction
        .request()
        .input('name', sql.NVarChar(100), user.name)
        .input('username', sql.VarChar(50), user.username)
        .input('passwordHash', sql.VarChar(255), passwordHash)
        .input('role', sql.VarChar(20), user.role)
        .query(`
          IF EXISTS (SELECT 1 FROM vms.Users WHERE Username = @username)
            UPDATE vms.Users
            SET Name = @name, PasswordHash = @passwordHash, Role = @role,
                IsActive = 1, UpdatedAt = SYSUTCDATETIME()
            WHERE Username = @username;
          ELSE
            INSERT INTO vms.Users (Name, Username, PasswordHash, Role, IsActive)
            VALUES (@name, @username, @passwordHash, @role, 1);
        `);
    }

    await transaction.commit();
    const result = await pool.request().query(`
      SELECT Username, Name, Role, IsActive,
             CASE WHEN PasswordHash LIKE '$2%' THEN 'BCRYPT' ELSE 'NOT_BCRYPT' END AS PasswordStorage
      FROM vms.Users
      WHERE Username IN ('admin', 'monitoring', 'security')
      ORDER BY Username;
    `);
    console.table(result.recordset);
    console.log('Role users created or updated successfully.');
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await closeDbConnection();
  }
}

main().catch((error) => {
  console.error('Failed to set up role users:', error);
  process.exitCode = 1;
});
