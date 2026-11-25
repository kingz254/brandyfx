import pg from 'pg';
import { readFile } from 'node:fs/promises';

export function connect() {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
}

if (process.argv[2] === 'migrate') {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const db = connect();
  try {
    await db.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  } finally {
    await db.end();
  }
}
