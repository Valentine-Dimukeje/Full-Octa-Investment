import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Try to load from local env if running standalone

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:{
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });
