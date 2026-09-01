import fs from 'node:fs';
import path from 'node:path';

// Minimal .env loader (no external dep). Values here are SERVER-ONLY secrets.
function loadEnvFile(file: string) {
  try {
    if (!fs.existsSync(file)) return;
    for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* ignore */ }
}
loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(__dirname, '..', '.env'));

function req(name: string, fallback = ''): string {
  const v = process.env[name] ?? fallback;
  return v;
}

export const config = {
  env: req('NODE_ENV', 'development'),
  port: parseInt(req('PORT', '4000'), 10),
  webOrigin: req('WEB_ORIGIN', 'http://localhost:5173'),
  databaseUrl: req('DATABASE_URL', 'file:./dev.db'),
  authSecret: req('AUTH_SECRET'),
  backupKey: req('BACKUP_ENCRYPTION_KEY'),
  githubToken: req('COUPLE_OS_GITHUB_TOKEN'),       // SERVER ONLY — never sent to client
  githubGistId: req('GITHUB_GIST_ID'),
  seedDemo: req('SEED_DEMO', 'true') === 'true',
  mail: {
    host: req('MAIL_HOST'), port: parseInt(req('MAIL_PORT', '587'), 10),
    user: req('MAIL_USER'), pass: req('MAIL_PASS'),
    from: req('MAIL_FROM', 'Couple OS <no-reply@couple-os.local>'),
  },
  isProd: req('NODE_ENV') === 'production',
};

export function assertSecrets() {
  if (!config.authSecret || config.authSecret.length < 32) {
    if (config.isProd) throw new Error('AUTH_SECRET must be set (>=32 chars) in production.');
    process.env.AUTH_SECRET = config.authSecret = require('node:crypto').randomBytes(32).toString('hex');
    console.warn('⚠️  AUTH_SECRET missing — generated an ephemeral dev secret (sessions reset on restart).');
  }
  if (!config.backupKey || config.backupKey.length < 32) {
    process.env.BACKUP_ENCRYPTION_KEY = config.backupKey = require('node:crypto').randomBytes(32).toString('hex');
    console.warn('⚠️  BACKUP_ENCRYPTION_KEY missing — generated ephemeral dev key (old backups unreadable).');
  }
}
