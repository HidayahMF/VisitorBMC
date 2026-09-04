import dotenv from 'dotenv';
dotenv.config();

const parseSameSite = (val: string | undefined): 'lax' | 'strict' | 'none' => {
  if (val === 'strict') return 'strict';
  if (val === 'none') return 'none';
  return 'lax';
};

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB: {
    SERVER: process.env.DB_SERVER || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '1433', 10),
    DATABASE: process.env.DB_DATABASE || 'BMC',
    USER: process.env.DB_USER || 'sa',
    PASSWORD: process.env.DB_PASSWORD || '',
    ENCRYPT: process.env.DB_ENCRYPT === 'true',
    TRUST_SERVER_CERTIFICATE:
      process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN || '86400', 10),
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  COOKIE_SAME_SITE: parseSameSite(process.env.COOKIE_SAME_SITE),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '100', 10),
  UPLOAD_ALLOWED_TYPES: (
    process.env.UPLOAD_ALLOWED_TYPES || 'mp4,jpg,jpeg,png,gif'
  ).split(','),
  RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || '900000',
    10,
  ),
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || '5',
    10,
  ),
};

if (!env.JWT_SECRET) {
  console.warn(
    'WARNING: JWT_SECRET is not set. Authentication will not work properly.',
  );
}

if (!env.DB.PASSWORD) {
  console.warn(
    'WARNING: DB_PASSWORD is not set. Database connection may fail if SQL authentication is required.',
  );
}
