import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load root .env then server/.env without overriding existing environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'speed_buzzer',
    ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || (!['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost') && process.env.DB_SSL !== 'false'),
  },

  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret',
  },

  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'none',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
  },

  rateLimits: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    buzzPerSecond: parseInt(process.env.BUZZ_RATE_LIMIT_PER_SECOND || '5', 10),
  },
} as const;
