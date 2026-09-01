import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config';

/**
 * Portable SQL layer.
 * - Dev/test: node:sqlite (zero-dependency, file or :memory:)
 * - Production: PostgreSQL via `pg` (DATABASE_URL=postgresql://...)
 * All queries use `?` placeholders; the pg adapter rewrites them to $1..$n.
 * Every query is parameterized — string concatenation is never used for values.
 */

export interface Db {
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  run(sql: string, params?: any[]): Promise<{ changes: number }>;
  tx<T>(fn: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export const newId = (): string => 'c' + crypto.randomBytes(12).toString('base64url');
export const now = (): string => new Date().toISOString();

function sqlitePath(url: string): string {
  if (url === ':memory:' || url === 'file::memory:') return ':memory:';
  const p = url.replace(/^file:/, '');
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function makePgSchema(sqliteSchema: string): string {
  // The schema only uses portable types (TEXT/INTEGER/REAL) — it runs on PG once
  // PRAGMA statements are stripped and booleans stay INTEGER (0/1) for parity.
  return sqliteSchema
    .split('\n')
    .filter((l) => !/^\s*PRAGMA/i.test(l))
    .join('\n');
}

async function createSqliteDb(url: string): Promise<Db> {
  const { DatabaseSync } = require('node:sqlite');
  const file = sqlitePath(url);
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const sdb = new DatabaseSync(file);
  sdb.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  sdb.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  // Idempotent column migrations (for DBs created before a column existed)
  const migrations = [
    'ALTER TABLE couples ADD COLUMN gist_token_enc TEXT',
  ];
  for (const m of migrations) { try { sdb.exec(m); } catch { /* column already exists */ } }
  let inTx = false;
  const db: Db = {
    async all(sql, params = []) { return sdb.prepare(sql).all(...params) as any[]; },
    async get(sql, params = []) { return sdb.prepare(sql).get(...params) as any; },
    async run(sql, params = []) {
      const r = sdb.prepare(sql).run(...params);
      return { changes: Number(r.changes) };
    },
    async tx(fn) {
      if (inTx) return fn();
      inTx = true;
      sdb.exec('BEGIN');
      try { const r = await fn(); sdb.exec('COMMIT'); return r; }
      catch (e) { sdb.exec('ROLLBACK'); throw e; }
      finally { inTx = false; }
    },
    async close() { try { sdb.close(); } catch { /* noop */ } },
  };
  return db;
}

async function createPgDb(url: string): Promise<Db> {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, max: 10 });
  const schema = makePgSchema(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  await pool.query(schema);
  try { await pool.query('ALTER TABLE couples ADD COLUMN IF NOT EXISTS gist_token_enc TEXT'); } catch { /* noop */ }
  const wrapErr = (e: any): never => {
    // surface PG unique violations in a sqlite-compatible way
    if (e && e.code === '23505') { const err: any = new Error('UNIQUE constraint failed'); err.code = 'SQLITE_CONSTRAINT_UNIQUE'; throw err; }
    throw e;
  };
  const db: Db = {
    async all(sql, params = []) { try { return (await pool.query(toPgPlaceholders(sql), params)).rows; } catch (e) { return wrapErr(e); } },
    async get(sql, params = []) { try { return (await pool.query(toPgPlaceholders(sql), params)).rows[0]; } catch (e) { return wrapErr(e); } },
    async run(sql, params = []) { try { const r = await pool.query(toPgPlaceholders(sql), params); return { changes: r.rowCount ?? 0 }; } catch (e) { return wrapErr(e); } },
    async tx(fn) {
      const client = await (pool as any).connect();
      try {
        await client.query('BEGIN');
        const scoped: Db = {
          all: async (s, p = []) => (await client.query(toPgPlaceholders(s), p)).rows,
          get: async (s, p = []) => (await client.query(toPgPlaceholders(s), p)).rows[0],
          run: async (s, p = []) => ({ changes: (await client.query(toPgPlaceholders(s), p)).rowCount ?? 0 }),
          tx: (f) => f(), close: async () => {},
        };
        const r = await withDb(scoped, fn);
        await client.query('COMMIT');
        return r;
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
    },
    async close() { await pool.end(); },
  };
  return db;
}

let current: Db | null = null;
function withDb<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  const prev = current; current = db;
  try { return fn().finally(() => { current = prev; }); } finally { /* restored in finally above */ }
}

export async function getDb(): Promise<Db> {
  if (current) return current;
  const url = config.databaseUrl;
  current = /^postgres(ql)?:\/\//.test(url) ? await createPgDb(url) : await createSqliteDb(url);
  return current;
}

export async function resetDbForTests(): Promise<void> {
  if (current) { await current.close(); current = null; }
}
