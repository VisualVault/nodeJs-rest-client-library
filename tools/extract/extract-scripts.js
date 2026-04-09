#!/usr/bin/env node
/**
 * Extract WADNR web service scripts (outsideprocessadmin).
 * Backward-compatible wrapper — delegates to extract.js --component scripts.
 *
 * Usage:
 *   node tools/extract/extract-scripts.js [--dry-run] [--force] [--headed] [--filter "Lib*"]
 */
const { execFileSync } = require('child_process');
const path = require('path');

const orchestrator = path.join(__dirname, 'extract.js');
const args = ['--component', 'scripts', ...process.argv.slice(2)];

try {
    execFileSync('node', [orchestrator, ...args], { stdio: 'inherit' });
} catch (err) {
    process.exit(err.status || 1);
}
