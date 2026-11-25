const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load backend/.env first, then non-overriding fallback from frontend/.env for shared auth secrets in local dev
const backendEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

const frontendEnvPath = path.resolve(__dirname, '../../../frontend/.env');
if (fs.existsSync(frontendEnvPath)) {
  dotenv.config({ path: frontendEnvPath, override: false });
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI environment variable.');
}

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  'wattwise-local-dev-secret-change-in-production-32chars';

module.exports = {
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI,
  DB_NAME: process.env.MONGODB_DB_NAME || 'wattwise',
  JWT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};
