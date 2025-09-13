// Script para generar un archivo `.env.production.local` con la variable VITE_APP_VERSION
// Ejecutado antes de `vite build` para forzar actualización del Service Worker y caches.
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function getGitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'nogit';
  }
}

function getPkgVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

const ver = getPkgVersion();
const hash = getGitHash();
const ts = timestamp();
const fullVersion = `${ver}-${hash}-${ts}`;

const outPath = resolve(process.cwd(), '.env.production.local');
const content = `# Archivo autogenerado por scripts/generate-version.mjs\nVITE_APP_VERSION=${fullVersion}\n`;
writeFileSync(outPath, content, 'utf8');
console.log(`[generate-version] VITE_APP_VERSION=${fullVersion}`);
