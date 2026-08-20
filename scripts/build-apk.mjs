#!/usr/bin/env node
/**
 * Couple OS — APK builder (SDK-free pipeline).
 *
 * Builds a genuine, signed Android APK without Android Studio / SDK, using only
 * npm + PyPI downloadable tools:
 *   aapt2   (native, via npm package "aaptjs3")
 *   android.jar, ecj, d8, apksigner, debug.keystore  (via npm package "@drxiaozhi/minapk" tools/)
 *   Java runtime  (via PyPI wheel "jdk4py" — Temurin JRE)
 *
 * Steps: resources → link (APK skeleton) → javac(ECJ) → d8 (classes.dex) → inject → sign.
 *
 * Env:
 *   COUPLE_OS_APK_URL   URL the app shell loads (default: sandbox preview or http://10.0.2.2:5173)
 *
 * Usage:  npm run build:apk
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, cpSync, chmodSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APKDIR = path.join(ROOT, 'apps', 'apk');
const TOOLS = path.join(APKDIR, '.toolchain');
const BUILD = path.join(APKDIR, 'build');
const OUTDIR = path.join(ROOT, 'release');
const log = (m) => console.log(`\x1b[35m[apk]\x1b[0m ${m}`);
const sh = (cmd, args, opts = {}) => {
  log(`$ ${path.basename(cmd)} ${args.join(' ')}`.slice(0, 140));
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], ...opts });
};

function tool(name) { return path.join(TOOLS, name); }

/** Download & stage the toolchain once (idempotent; gitignored). */
async function ensureTools() {
  mkdirSync(TOOLS, { recursive: true });
  const needJarTools = !existsSync(tool('android.jar')) || !existsSync(tool('d8.jar')) || !existsSync(tool('ecj-3.45.0.jar')) || !existsSync(tool('apksigner.jar')) || !existsSync(tool('debug.keystore'));
  const needAapt2 = !existsSync(tool('aapt2'));
  const needJre = !existsSync(tool('jre/bin/java'));

  if (needJarTools || needAapt2) {
    log('fetching tool packages from npm (one-off)…');
    const tmp = mkdtempSync(path.join(tmpdir(), 'apk-tools-'));
    if (needJarTools) {
      execSync(`npm pack @drxiaozhi/minapk@0.2.1 --silent --pack-destination "${tmp}"`, { stdio: 'inherit' });
      execSync(`tar xzf "${tmp}"/drxiaozhi-minapk-*.tgz -C "${tmp}"`, { stdio: 'inherit' });
      for (const f of ['android.jar', 'd8.jar', 'ecj-3.45.0.jar', 'apksigner.jar', 'debug.keystore']) {
        cpSync(path.join(tmp, 'package', 'tools', f), tool(f), { force: true });
      }
    }
    if (needAapt2) {
      execSync(`npm pack aaptjs3@2.0.2 --silent --pack-destination "${tmp}"`, { stdio: 'inherit' });
      execSync(`tar xzf "${tmp}"/aaptjs3-*.tgz -C "${tmp}"`, { stdio: 'inherit' });
      cpSync(path.join(tmp, 'package', 'bin', 'x64', 'linux', 'aapt2'), tool('aapt2'), { force: true });
    }
  }
  if (needJre) {
    log('fetching Temurin Java runtime wheel from PyPI (one-off)…');
    const meta = await (await fetch('https://pypi.org/pypi/jdk4py/json')).json();
    const wheel = meta.urls.find((u) => u.url.includes('manylinux_2_17_x86_64'));
    if (!wheel) throw new Error('no linux x86_64 jdk4py wheel found');
    const tmp = mkdtempSync(path.join(tmpdir(), 'jdk-dl-'));
    execSync(`curl -sSL -o "${tmp}/jdk.whl" "${wheel.url}"`, { stdio: 'inherit' });
    execSync(`python3 -m zipfile -e "${tmp}/jdk.whl" "${tmp}/jdk"`, { stdio: 'inherit' });
    cpSync(path.join(tmp, 'jdk', 'jdk4py', 'java-runtime'), tool('jre'), { recursive: true });
  }
  chmodSync(tool('aapt2'), 0o755);
  chmodSync(tool('jre/bin/java'), 0o755);
}

async function main() {
  await ensureTools();
  const JAVA = tool('jre/bin/java');
  const AAPT2 = tool('aapt2');
  const ANDROID_JAR = tool('android.jar');
  const appUrl = process.env.COUPLE_OS_APK_URL
    || (process.env.E2B_SANDBOX_ID ? `https://5173-${process.env.E2B_SANDBOX_ID}.e2b.app` : 'http://10.0.2.2:5173');

  // fresh build dir
  execSync(`rm -rf "${BUILD}"`, { stdio: 'inherit' });
  mkdirSync(path.join(BUILD, 'assets'), { recursive: true });
  writeFileSync(path.join(BUILD, 'assets', 'config.txt'), appUrl + '\n');
  log(`app URL → ${appUrl}`);

  // 1) resources
  sh(AAPT2, ['compile', '--dir', path.join(APKDIR, 'res'), '-o', path.join(BUILD, 'res.zip')]);

  // 2) link skeleton APK
  sh(AAPT2, ['link', '-o', path.join(BUILD, 'unsigned.apk'),
    '-I', ANDROID_JAR,
    '--manifest', path.join(APKDIR, 'AndroidManifest.xml'),
    '-A', path.join(BUILD, 'assets'),
    path.join(BUILD, 'res.zip')]);

  // 3) compile MainActivity (ECJ = eclipse javac-compatible compiler, runs on the JRE)
  mkdirSync(path.join(BUILD, 'classes'), { recursive: true });
  sh(JAVA, ['-jar', tool('ecj-3.45.0.jar'),
    '-1.8', '-encoding', 'UTF-8', '-proc:none', '-nowarn',
    '-classpath', ANDROID_JAR,
    '-d', path.join(BUILD, 'classes'),
    path.join(APKDIR, 'src', 'com', 'coupleos', 'love', 'MainActivity.java')]);

  // 4) dex (d8) — output dir must exist beforehand
  mkdirSync(path.join(BUILD, 'dex'), { recursive: true });
  sh(JAVA, ['-cp', tool('d8.jar'), 'com.android.tools.r8.D8',
    '--lib', ANDROID_JAR, '--min-api', '21',
    '--output', path.join(BUILD, 'dex'),
    path.join(BUILD, 'classes', 'com', 'coupleos', 'love', 'MainActivity.class'),
    path.join(BUILD, 'classes', 'com', 'coupleos', 'love', 'MainActivity$1.class'),
    path.join(BUILD, 'classes', 'com', 'coupleos', 'love', 'MainActivity$2.class')]);

  // 5) inject classes.dex at zip root
  execSync(`python3 - <<'PY'
import zipfile
apk = ${JSON.stringify(path.join(BUILD, 'unsigned.apk'))}
with zipfile.ZipFile(apk, 'a', zipfile.ZIP_DEFLATED) as z:
    z.write(${JSON.stringify(path.join(BUILD, 'dex', 'classes.dex'))}, 'classes.dex')
print('dex injected')
PY`, { stdio: 'inherit' });

  // 6) sign (debug keystore — v1+v2+v3)
  mkdirSync(OUTDIR, { recursive: true });
  const manifest = readFileSync(path.join(APKDIR, 'AndroidManifest.xml'), 'utf8');
  const version = (manifest.match(/versionName="([^"]+)"/) || [])[1] || '1.0.0';
  const outApk = path.join(OUTDIR, `CoupleOS-${version}-debug.apk`);
  sh(JAVA, ['-cp', tool('apksigner.jar'), 'com.android.apksigner.ApkSignerTool', 'sign',
    '--ks', tool('debug.keystore'), '--ks-key-alias', 'androiddebugkey',
    '--ks-pass', 'pass:android', '--key-pass', 'pass:android',
    '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
    '--in', path.join(BUILD, 'unsigned.apk'), '--out', outApk]);

  // 7) verify + report
  sh(JAVA, ['-cp', tool('apksigner.jar'), 'com.android.apksigner.ApkSignerTool', 'verify', '--verbose', outApk]);
  const badging = sh(AAPT2, ['dump', 'badging', outApk]).toString().split('\n').filter((l) => /^(package|application-label|sdkVersion|targetSdkVersion|uses-permission)/.test(l));
  const buf = readFileSync(outApk);
  console.log('\n' + badging.join('\n'));
  console.log(`\n\x1b[32m✅ APK ready:\x1b[0m ${outApk}`);
  console.log(`   size: ${(buf.length / 1024).toFixed(1)} KB  sha256: ${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24)}…`);
  console.log('   نصب: فایل رو روی گوشی باز کن و «نصب از منابع ناشناس» رو اجازه بده (کلید debug است).');
}

main().catch((e) => { console.error('\x1b[31m[apk] build failed:\x1b[0m', e.message); process.exit(1); });
