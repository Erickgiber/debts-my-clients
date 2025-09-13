#!/usr/bin/env node
// Bump de versión semántico (hook commit-msg)
// Reglas:
//  - BREAKING CHANGE / !: => major
//  - feat => minor
//  - fix/perf/release => patch
//  - Otros tipos: sin cambio (a menos que usen !)
//  - --force <major|minor|patch> para sobrescribir
// Flujo:
//  1. Lee mensaje (archivo commit-msg)
//  2. Decide bump; si no hay -> exit 0
//  3. Actualiza package.json y hace amend para incluir el cambio
//  4. Crea tag anotado vX.Y.Z (si no existe) y opcionalmente push si env PUSH_TAG=1

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { commitMsgFile: null, force: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!opts.commitMsgFile) opts.commitMsgFile = a;
    if (a === '--force') {
      opts.force = args[i + 1];
      i++;
    }
  }
  return opts;
}

const { commitMsgFile, force } = parseArgs();
if (!commitMsgFile) process.exit(0);
let msg = '';
try {
  msg = readFileSync(commitMsgFile, 'utf8').trim();
} catch {
  process.exit(0);
}
if (!msg) process.exit(0);

function decideBump(m) {
  if (force && ['major', 'minor', 'patch'].includes(force)) return force;
  const lowered = m.toLowerCase();
  const breaking = /breaking change/i.test(m) || /!:/.test(m.split('\n')[0]);
  if (breaking) return 'major';
  if (/^feat(\(|:)/.test(lowered)) return 'minor';
  if (/^(fix|perf)(\(|:)/.test(lowered)) return 'patch';
  if (/^release(\(|:)/.test(lowered)) return 'patch';
  return null; // sin cambio
}

const bump = decideBump(msg);
if (!bump) {
  process.exit(0);
}

const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const current = pkg.version || '0.0.0';
const [maj, min, pat] = current.split('.').map((n) => parseInt(n, 10) || 0);
let next;
if (bump === 'major') next = `${maj + 1}.0.0`;
else if (bump === 'minor') next = `${maj}.${min + 1}.0`;
else next = `${maj}.${min}.${pat + 1}`;

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`[semver-bump] ${current} -> ${next} (${bump})`);

try {
  execSync('git add package.json', { stdio: 'ignore' });
} catch {}
try {
  execSync('git commit --amend --no-edit', { stdio: 'ignore' });
  console.log('[semver-bump] Commit enmendado');
} catch {
  console.warn('[semver-bump] No se pudo amendar commit (quizá --no-verify).');
}

// Tagging
const tagName = `v${next}`;
try {
  const existing = execSync(`git tag -l ${tagName}`, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
  if (!existing) {
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { stdio: 'ignore' });
    console.log(`[semver-bump] Tag creado ${tagName}`);
    if (process.env.PUSH_TAG === '1') {
      try {
        execSync(`git push --follow-tags`, { stdio: 'ignore' });
        console.log('[semver-bump] Tags enviados (push)');
      } catch {
        console.warn('[semver-bump] No se pudo hacer push de tags');
      }
    }
  }
} catch (e) {
  console.warn('[semver-bump] Error gestionando tags');
}
