#!/usr/bin/env node
/**
 * Genera/actualiza CHANGELOG.md basado en commits desde el último tag (o todos si no hay tags).
 * Agrupa por tipos convencional commits: feat, fix, perf, BREAKING CHANGE, otros.
 * - Detecta la versión actual de package.json.
 * - Si hay un tag vX.Y.Z que coincide con package.json, genera sección para la próxima versión (unreleased) usando fecha actual.
 * - Si el workflow ya hizo bump, se asume que package.json contiene la nueva versión que se está taggeando.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
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

function getLastTag() {
  const tag = sh('git describe --tags --abbrev=0');
  return tag.startsWith('v') ? tag : tag ? `v${tag}` : '';
}

function getRepoInfo() {
  // origin URL puede venir en formato git@github.com:owner/repo.git o https://github.com/owner/repo.git
  const url = sh('git config --get remote.origin.url');
  if (!url) return null;
  let m = url.match(/github.com[:/](.+?)\.git$/);
  if (!m) m = url.match(/github.com[:/](.+?)$/);
  if (!m) return null;
  const [owner, repo] = m[1].split('/');
  if (!owner || !repo) return null;
  return { owner, repo };
}

function collectCommits(sinceTag) {
  let range = '';
  if (sinceTag) range = `${sinceTag}..HEAD`;
  const raw = sh(`git log --pretty=format:%H__SEP__%s__NL__ ${range}`);
  if (!raw) return [];
  return raw
    .split('__NL__\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, subject] = line.split('__SEP__');
      return { hash, subject };
    });
}

function parseConventional(commit) {
  // patrón: type(scope)!: description
  const raw = commit.subject;
  const match = raw.match(
    /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s*(?<desc>.+)$/,
  );
  if (!match) {
    // fallback para BREAKING en cuerpo no disponible aquí; se detectará con regex
    return { type: null, scope: null, breaking: /breaking change/i.test(raw), desc: raw };
  }
  return {
    type: match.groups.type.toLowerCase(),
    scope: match.groups.scope || null,
    breaking: !!match.groups.breaking || /breaking change/i.test(raw),
    desc: match.groups.desc.trim(),
  };
}

function classify(commit) {
  const meta = parseConventional(commit);
  if (meta.breaking) return { group: 'breaking', meta };
  if (meta.type === 'feat') return { group: 'feat', meta };
  if (meta.type === 'fix') return { group: 'fix', meta };
  if (meta.type === 'perf') return { group: 'perf', meta };
  return { group: 'other', meta };
}

function groupByScope(items) {
  const byScope = new Map();
  for (const it of items) {
    const scope = it.meta.scope || 'general';
    if (!byScope.has(scope)) byScope.set(scope, []);
    byScope.get(scope).push(it);
  }
  // ordenar scopes alfabéticamente dejando 'general' primero
  return Array.from(byScope.entries()).sort((a, b) => {
    if (a[0] === 'general') return -1;
    if (b[0] === 'general') return 1;
    return a[0].localeCompare(b[0]);
  });
}

function formatSection(title, items, repoInfo) {
  if (!items.length) return '';
  const byScope = groupByScope(items);
  let out = `### ${title}\n`;
  for (const [scope, scopedItems] of byScope) {
    if (byScope.length > 1 || scope !== 'general') out += `#### ${scope}\n`;
    for (const it of scopedItems) {
      const shortHash = it.hash.slice(0, 7);
      const link = repoInfo
        ? `([${shortHash}](${`https://github.com/${repoInfo.owner}/${repoInfo.repo}/commit/${it.hash}`}))`
        : `(${shortHash})`;
      out += `- ${it.meta.desc} ${link}\n`;
    }
    out += '\n';
  }
  return out;
}

function buildChangelog(version, commits, previousTag) {
  const repoInfo = getRepoInfo();
  const groups = { breaking: [], feat: [], fix: [], perf: [], other: [] };
  commits.forEach((c) => {
    const cls = classify(c);
    groups[cls.group].push({ ...c, ...cls });
  });
  const date = new Date().toISOString().slice(0, 10);
  let header = `## ${version} - ${date}\n\n`;
  header += formatSection('BREAKING CHANGES', groups.breaking, repoInfo);
  header += formatSection('Features', groups.feat, repoInfo);
  header += formatSection('Fixes', groups.fix, repoInfo);
  header += formatSection('Performance', groups.perf, repoInfo);
  header += formatSection('Other', groups.other, repoInfo);
  if (
    !groups.breaking.length &&
    !groups.feat.length &&
    !groups.fix.length &&
    !groups.perf.length &&
    !groups.other.length
  ) {
    header += '_No changes._\n\n';
  }
  return header;
}

(function main() {
  const version = getPkgVersion();
  const lastTag = getLastTag();
  const commits = collectCommits(lastTag);
  const section = buildChangelog(version, commits, lastTag);
  const changelogPath = resolve(process.cwd(), 'CHANGELOG.md');
  let existing = '';
  if (existsSync(changelogPath)) existing = readFileSync(changelogPath, 'utf8');

  let newContent;
  if (existing.startsWith('# Changelog')) {
    // Insert after title
    const parts = existing.split(/\n## /);
    const title = parts.shift();
    newContent = title + '\n' + section + (parts.length ? '## ' + parts.join('\n## ') : '');
  } else {
    newContent = `# Changelog\n\n${section}${existing}`;
  }
  writeFileSync(changelogPath, newContent.trimEnd() + '\n', 'utf8');
  console.log('[changelog] updated');
})();
