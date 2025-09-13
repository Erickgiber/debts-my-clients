#!/usr/bin/env node
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

let lastCommit;
try {
  lastCommit = execSync('git log -1 --pretty=%B').toString().trim();
} catch (e) {
  console.error('❌ Error leyendo el último commit:', e.message);
  process.exit(1);
}

let [major, minor, patch] = pkg.version.split('.').map(Number);
let type = null;

// 🔎 Detectar tipo de bump según mensaje de commit
if (/breaking change/i.test(lastCommit) || /^[a-zA-Z]+!:/.test(lastCommit)) {
  type = 'major';
  major++;
  minor = 0;
  patch = 0;
} else if (/^feat(\(|:)/.test(lastCommit)) {
  type = 'minor';
  minor++;
  patch = 0;
} else if (/^(fix|perf|release)(\(|:)/.test(lastCommit)) {
  type = 'patch';
  patch++;
}

if (!type) {
  console.log('🔹 No semantic commit detected. Skipping bump.');
  process.exit(0);
}

pkg.version = `${major}.${minor}.${patch}`;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log(`✅ Version bumped to ${pkg.version} (${type})`);

// ✅ Añadir cambios al staging para que se suban en el mismo commit
try {
  execSync('git add package.json', { stdio: 'inherit' });
} catch (e) {
  console.error('⚠️ No se pudo añadir package.json:', e.message);
}
