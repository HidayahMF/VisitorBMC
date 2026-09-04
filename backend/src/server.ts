import app from './app';
import { env } from './config/env';
import { getDbConnection, closeDbConnection } from './config/database';

async function main() {
  try {
    await getDbConnection();
    console.log('Connected to SQL Server database');

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDbConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeDbConnection();
  process.exit(0);
});
