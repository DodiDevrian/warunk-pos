import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import path from 'path';
import * as schema from './schema.js';

const dbUrl = process.env.DATABASE_URL || './data/warunk.db';
const dbDir = path.dirname(dbUrl);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// libsql wants an absolute file: URL for reliable local file access.
const absolute = path.resolve(dbUrl);
export const client = createClient({ url: `file:${absolute}` });

// Enable foreign keys for this connection.
await client.execute('PRAGMA foreign_keys = ON');

export const db = drizzle(client, { schema });
export * as tables from './schema.js';
