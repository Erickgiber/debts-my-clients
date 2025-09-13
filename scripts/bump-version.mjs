#!/usr/bin/env node
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const lastCommit = require('child_process').execSync('git log -1 --pretty=%B').toString().trim();

let [major, minor, patch] = pkg.version.split('.').map(Number);
let type = null;

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

try {
  require('child_process').execSync('git add package.json', { stdio: 'inherit' });
} catch (e) {
  console.error('⚠️ Could not stage package.json:', e.message);
}
