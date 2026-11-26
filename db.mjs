import pg from 'pg';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const supabaseCA = readFileSync(new URL('./prod-ca-2021.crt', import.meta.url), 'utf8');

export function connect() {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL,
    ssl: { ca: supabaseCA, rejectUnauthorized: true }, connectionTimeoutMillis: 5000 });
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
