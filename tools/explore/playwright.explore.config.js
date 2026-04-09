/**
 * Playwright configuration for VV platform exploration.
 *
 * Lightweight config — single browser, no TZ matrix, longer timeouts.
 * Used by tools/explore/specs/ for platform investigation, not regression testing.
 *
 * Auth: shares testing/config/auth-state-pw.json with the test suite.
 *
 * Usage:
 *   npm run explore              # headless
 *   npm run explore:headed       # visible browser
 *   npm run explore:report       # open HTML report
 */
const { defineConfig } = require('@playwright/test');
const path = require('path');
const { loadConfig } = require('../../testing/fixtures/env-config');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'testing', 'config', 'auth-state-pw.json');

module.exports = defineConfig({
    testDir: './specs',

    fullyParallel: false,
    workers: 1,
    retries: 0,

    // 2 min per test — exploration probes many endpoints sequentially
    timeout: 120_000,
    expect: { timeout: 10_000 },

    globalSetup: './global-setup.js',

    use: {
        baseURL: loadConfig().baseUrl,
        storageState: AUTH_STATE_PATH,
        screenshot: 'only-on-failure',
    },

    projects: [{ name: 'explore-chromium', use: { channel: 'chrome' } }],

    outputDir: '../../testing/tmp/exploration-results',
    reporter: [['html', { open: 'never', outputFolder: '../../testing/tmp/exploration-report' }], ['list']],
});
