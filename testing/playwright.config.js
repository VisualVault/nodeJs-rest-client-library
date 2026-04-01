/**
 * Playwright configuration for VV date-handling tests.
 *
 * Defines 3 timezone projects (BRT, IST, UTC0) that simulate user timezones
 * via Playwright's timezoneId context option — no system timezone changes needed.
 *
 * All spec files run in all 3 projects. Individual tests use test.skip()
 * to self-filter based on testInfo.project.name, so each test only
 * executes in its target timezone.
 *
 * Auth: global-setup.js logs into VV once and saves cookies to config/auth-state-pw.json.
 * All tests reuse these cookies via the storageState option.
 *
 * See testing/date-handling/README.md for full documentation.
 */
const { defineConfig } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, 'config', 'auth-state-pw.json');

module.exports = defineConfig({
    testDir: './date-handling',

    // Serial execution — VV creates server-side state per form instance,
    // and concurrent requests to the same VV instance can interfere.
    fullyParallel: false,
    workers: 1,

    // No retries — date tests are deterministic. A failure means a real bug
    // or environment issue that should be investigated, not retried.
    retries: 0,

    // 60s test timeout — VV Angular SPA can take 10-15s to load; calendar
    // popup interactions add another 5-10s. 60s provides comfortable margin.
    timeout: 60_000,
    expect: { timeout: 10_000 },

    globalSetup: './global-setup.js',

    use: {
        baseURL: 'https://vvdemo.visualvault.com',
        storageState: AUTH_STATE_PATH,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',

        // Must use real Chrome — VV's Angular SPA and Kendo UI components
        // require a full Chrome engine. Playwright's bundled Chromium works
        // but 'chrome' channel uses the installed Chrome for maximum compatibility.
        channel: 'chrome',
    },

    // Each project simulates a different user timezone. All spec files run in
    // all projects — individual tests use test.skip() to self-filter based on
    // testInfo.project.name, ensuring each test only executes in its target TZ.
    projects: [
        {
            name: 'BRT',
            use: { timezoneId: 'America/Sao_Paulo' }, // UTC-3
        },
        {
            name: 'IST',
            use: { timezoneId: 'Asia/Calcutta' }, // UTC+5:30
        },
        {
            name: 'UTC0',
            use: { timezoneId: 'Etc/GMT' }, // UTC+0
        },
    ],

    outputDir: './test-results',
    reporter: [['html', { open: 'never', outputFolder: './playwright-report' }], ['list']],
});
