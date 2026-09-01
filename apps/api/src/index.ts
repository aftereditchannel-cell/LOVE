import { createApp } from './app';
import { config, assertSecrets } from './config';
import { getDb } from './db';

async function main() {
  assertSecrets();
  await getDb(); // applies schema on first run
  const app = createApp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`❤️  Couple OS API listening on http://0.0.0.0:${config.port}`);
    console.log(`    mode=${config.env} db=${config.databaseUrl.startsWith('postgres') ? 'postgresql' : 'sqlite'} gistBackup=${config.githubToken ? 'configured' : 'not-configured'}`);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
