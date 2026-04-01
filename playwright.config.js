/**
 * Playwright configuration for VV date-handling tests.
 *
 * Defines 3 timezone projects (BRT, IST, UTC0) that simulate user timezones
 * via Playwright's timezoneId context option — no system timezone changes needed.
 *
 * Test files are matched to projects by filename suffix:
 *   tc-1-A-BRT.spec.js  -> BRT project (America/Sao_Paulo)
 *   tc-1-A-IST.spec.js  -> IST project (Asia/Calcutta)
 *   tc-1-A-UTC0.spec.js -> UTC0 project (Etc/GMT)
 *
 * Auth: global-setup.js logs into VV once and saves cookies to auth-state-pw.json.
 * All tests reuse these cookies via the storageState option.
 *
 * See tests/date-handling/README.md for full documentation.
 */
const { defineConfig } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '.playwright', 'auth-state-pw.json');

module.exports = defineConfig({
    testDir: './tests/date-handling',

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

    globalSetup: './tests/date-handling/global-setup.js',

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

    // Each project simulates a different user timezone. Test files are matched
    // by filename suffix so each project only runs its own timezone's tests.
    projects: [
        {
            name: 'BRT',
            use: { timezoneId: 'America/Sao_Paulo' }, // UTC-3
            testMatch: /.*-BRT\.spec\.js$/,
        },
        {
            name: 'IST',
            use: { timezoneId: 'Asia/Calcutta' }, // UTC+5:30
            testMatch: /.*-IST\.spec\.js$/,
        },
        {
            name: 'UTC0',
            use: { timezoneId: 'Etc/GMT' }, // UTC+0
            testMatch: /.*-UTC0\.spec\.js$/,
        },
    ],

    outputDir: './test-results',
    reporter: [['html', { open: 'never' }], ['list']],
});
