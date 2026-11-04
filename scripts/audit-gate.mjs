#!/usr/bin/env node
/**
 * Dependency-audit gate.
 *
 * `npm audit` reports vulnerabilities across both runtime and development
 * dependencies. Lowering its threshold would hide the next real problem too,
 * so every accepted risk is written down in `.github/audit-exceptions.json` with
 * a reason and an expiry date. An exception that has expired fails the build exactly like an
 * unlisted advisory, which stops the file from becoming a permanent mute.
 *
 * Usage: node scripts/audit-gate.mjs
 * Exits 0 when every high/critical advisory in the full dependency tree is a live exception.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Overridable so the gate itself can be tested with fixture exception files.
const EXCEPTIONS_PATH =
  process.env.AUDIT_EXCEPTIONS_PATH ??
  new URL('../.github/audit-exceptions.json', import.meta.url).pathname;
const BLOCKING = new Set(['high', 'critical']);

function runAudit() {
  try {
    return execFileSync('npm', ['audit', '--json'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    // npm exits non-zero when advisories exist, but still prints the report.
    if (typeof error.stdout === 'string' && error.stdout.trim().startsWith('{')) return error.stdout;
    throw error;
  }
}

function loadExceptions() {
  try {
    const raw = JSON.parse(readFileSync(EXCEPTIONS_PATH, 'utf8'));
    return Array.isArray(raw.exceptions) ? raw.exceptions : [];
  } catch {
    return [];
  }
}

const report = JSON.parse(runAudit());
if (
  !report ||
  typeof report !== 'object' ||
  report.error ||
  !report.metadata?.vulnerabilities ||
  !report.vulnerabilities ||
  typeof report.vulnerabilities !== 'object'
) {
  console.error('npm audit did not return a complete vulnerability report; failing closed.');
  process.exit(1);
}
const vulnerabilities = report.vulnerabilities;
const exceptions = loadExceptions();
const today = new Date().toISOString().slice(0, 10);

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const isCovered = (name, severity, advisoryIds) => {
  const matches = exceptions.filter((entry) => entry.package === name);
  // Multiple entries are ambiguous and should be merged by a reviewer, not
  // interpreted as a way to broaden an exception.
  if (matches.length !== 1) return false;
  const match = matches[0];
  if (!Array.isArray(match.severity) || !match.severity.includes(severity)) return false;
  if (typeof match.reason !== 'string' || match.reason.trim().length < 20) return false;
  if (!isValidDateOnly(match.expires) || match.expires < today) return false;
  // Every covered package must pin the exact advisory IDs. An empty list, or a
  // new advisory not named in the exception, fails closed.
  if (!Array.isArray(match.advisories) || match.advisories.length === 0) return false;
  return advisoryIds.length > 0 && advisoryIds.every((id) => match.advisories.includes(id));
};

const blocking = [];
const accepted = [];

for (const [name, info] of Object.entries(vulnerabilities)) {
  if (info?.severity && !BLOCKING.has(info.severity)) continue;
  const advisories = Array.isArray(info?.via) ? info.via.filter((v) => typeof v === 'object') : [];
  const ids = advisories.map((v) => v.url?.split('/').pop()).filter(Boolean);
  if (isCovered(name, info.severity, ids)) {
    accepted.push({ name, severity: info.severity, ids });
  } else {
    blocking.push({ name, severity: info.severity, ids, title: advisories[0]?.title });
  }
}

for (const item of accepted) {
  console.log(`accepted  ${item.severity.padEnd(8)} ${item.name}  (${item.ids.join(', ') || 'exception'})`);
}
for (const item of blocking) {
  console.error(`BLOCKING  ${item.severity.padEnd(8)} ${item.name}  ${item.title ?? ''}`);
}

if (blocking.length > 0) {
  console.error(
    `\n${blocking.length} unaccepted high/critical advisor${blocking.length === 1 ? 'y' : 'ies'} in the dependency tree.`,
  );
  console.error('Fix it, or add a reasoned, time-boxed entry to .github/audit-exceptions.json.');
  process.exit(1);
}

console.log(
  `\nAudit gate passed: ${accepted.length} accepted exception(s), 0 blocking advisories.`,
);
