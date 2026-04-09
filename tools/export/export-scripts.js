#!/usr/bin/env node
/**
 * Export WADNR web service scripts (outsideprocessadmin).
 * Backward-compatible wrapper — delegates to export-wadnr.js --component scripts.
 *
 * Usage:
 *   node tools/export/export-scripts.js [--dry-run] [--force] [--headed] [--filter "Lib*"]
 */
const { execFileSync } = require('child_process');
const path = require('path');

const orchestrator = path.join(__dirname, 'export.js');
const args = ['--component', 'scripts', ...process.argv.slice(2)];

try {
    execFileSync('node', [orchestrator, ...args], { stdio: 'inherit' });
} catch (err) {
    process.exit(err.status || 1);
}
