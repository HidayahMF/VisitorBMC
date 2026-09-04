import * as readline from 'readline';
import { getDbConnection, closeDbConnection, sql } from '../src/config/database';
import { hashPassword } from '../src/services/auth.service';

async function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function parseArgs(): { name?: string; username?: string; password?: string } {
  const args: { name?: string; username?: string; password?: string } = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--name' && i + 1 < argv.length) args.name = argv[++i];
    if (argv[i] === '--username' && i + 1 < argv.length) args.username = argv[++i];
    if (argv[i] === '--password' && i + 1 < argv.length) args.password = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let name = args.name;
    let username = args.username;
    let password = args.password;

    if (!name) name = await question(rl, 'Name: ');
    if (!username) username = await question(rl, 'Username: ');
    if (!password) password = await question(rl, 'Password: ');

    if (!name || !username || !password) {
      console.error('Error: name, username, and password are all required.');
      process.exit(1);
    }

    const pool = await getDbConnection();

    const exists = await pool
      .request()
      .input('username', sql.VarChar(50), username)
      .query('SELECT 1 FROM Users WHERE Username = @username');

    if (exists.recordset.length > 0) {
      console.error(`Error: Username "${username}" already exists.`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);

    await pool
      .request()
      .input('name', sql.NVarChar(100), name)
      .input('username', sql.VarChar(50), username)
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .input('role', sql.VarChar(20), 'ADMIN')
      .query(
        `INSERT INTO Users (Name, Username, PasswordHash, Role)
         VALUES (@name, @username, @passwordHash, @role)`,
      );

    console.log(`Admin user "${username}" created successfully.`);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  } finally {
    rl.close();
    await closeDbConnection();
  }
}

main();
