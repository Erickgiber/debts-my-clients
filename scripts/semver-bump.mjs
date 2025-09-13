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
if (!commitMsgFile) {
  process.exit(0); // nada que hacer
}

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

// NOTA: No hacemos git add aquí; el hook commit-msg se ejecuta tarde (después de crear el commit).
// Opción: informar al usuario que haga un commit de seguimiento si quiere incluir el cambio de versión.
// Alternativa: usar pre-commit para hacer el bump antes y agregar el archivo automáticamente.
