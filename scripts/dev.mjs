import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

// Some sandboxes run behind a TLS-inspecting proxy; let Node trust the system CA bundle too.
if (!process.env.NODE_EXTRA_CA_CERTS && existsSync('/etc/ssl/certs/ca-certificates.crt')) {
  process.env.NODE_EXTRA_CA_CERTS = '/etc/ssl/certs/ca-certificates.crt';
}

const procs = [
  spawn('npm', ['run', 'dev', '-w', 'couple-os-api'], { stdio: 'inherit', shell: true }),
  spawn('npm', ['run', 'dev', '-w', 'couple-os-web'], { stdio: 'inherit', shell: true }),
];
const kill = () => procs.forEach((p) => p.kill('SIGTERM'));
process.on('SIGINT', () => { kill(); process.exit(0); });
process.on('SIGTERM', kill);
