#!/usr/bin/env node
// Bump de versión semántico basado en el mensaje de commit.
// Reglas:
//  - Mensaje que contiene 'BREAKING CHANGE' o usa '!' después del tipo => major
//  - Prefijos: feat => minor
//  - fix, perf => patch
//  - build, chore, docs, refactor, test, ci, style => no cambia (a menos que lleven '!')
//  - Si se pasa flag --force <tipo> obliga el bump (major|minor|patch)
//  - Sólo se ejecuta si el hook commit-msg lo llamó con ruta del archivo del commit.

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
// Si estamos en pre-commit quizá no tengamos archivo de mensaje todavía; tomar HEAD commit message provisional
let msg = '';
if (commitMsgFile) {
  try {
    msg = readFileSync(commitMsgFile, 'utf8').trim();
  } catch {
    /* ignore */
  }
}
if (!msg) {
  try {
    // Obtener mensaje staged usando git interpretado (si se corre en pre-commit será el último commit HEAD si es amend, o vacío si primero)
    msg = execSync('git log -1 --pretty=%B', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    /* ignore */
  }
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

// Evitar bucle infinito al amendar
if (!process.env.SEMVER_BUMP_DONE) {
  try {
    execSync('git add package.json', { stdio: 'ignore' });
  } catch (e) {
    console.warn('[semver-bump] No se pudo hacer git add package.json');
  }
} else {
  process.exit(0);
}

// Si se está ejecutando en commit-msg ya es tarde para incluirlo sin amend; preferimos hacer amend
try {
  execSync('git commit --amend --no-edit', {
    stdio: 'ignore',
    env: { ...process.env, SEMVER_BUMP_DONE: '1' },
  });
  console.log('[semver-bump] Commit enmendado con nueva versión');
} catch (e) {
  console.warn(
    '[semver-bump] No se pudo amendar commit, realiza un commit manual para incluir version.',
  );
}
