// Couple OS first-time setup: generates apps/api/.env with random secrets and seeds data.
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';

const envPath = 'apps/api/.env';
if (!existsSync(envPath)) {
  const env = [
    `DATABASE_URL="file:./dev.db"`,
    `AUTH_SECRET="${randomBytes(32).toString('hex')}"`,
    `BACKUP_ENCRYPTION_KEY="${randomBytes(32).toString('hex')}"`,
    `COUPLE_OS_GITHUB_TOKEN=""`,
    `GITHUB_GIST_ID=""`,
    `PORT=4000`,
    `WEB_ORIGIN="http://localhost:5173"`,
    `SEED_DEMO="true"`,
    ``,
  ].join('\n');
  writeFileSync(envPath, env);
  console.log('✅ apps/api/.env created with fresh random secrets (git-ignored).');
} else {
  console.log('ℹ️  apps/api/.env already exists — keeping it.');
}
execSync('npm run seed -w couple-os-api', { stdio: 'inherit' });
console.log('\n🎉 Done. Start the app with:  npm run dev   (web: http://localhost:5173)');
