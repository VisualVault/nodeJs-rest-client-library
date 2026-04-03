/**
 * Playwright configuration for VV date-handling tests.
 *
 * Generates a matrix of timezone × browser projects:
 *   BRT-chromium, BRT-firefox, BRT-webkit, IST-chromium, …, UTC0-webkit
 *
 * All spec files run in all projects. Individual tests use test.skip()
 * to self-filter based on testInfo.project.name (prefix match on TZ),
 * so each test only executes in its target timezone across all browsers.
 *
 * Auth: global-setup.js logs into VV once and saves cookies to config/auth-state-pw.json.
 * All tests reuse these cookies via the storageState option.
 *
 * See testing/date-handling/README.md for full documentation.
 */
const { defineConfig } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, 'config', 'auth-state-pw.json');

const timezones = [
    { name: 'BRT', timezoneId: 'America/Sao_Paulo' }, // UTC-3
    { name: 'IST', timezoneId: 'Asia/Kolkata' }, // UTC+5:30
    { name: 'UTC0', timezoneId: 'UTC' }, // UTC+0
];

const browsers = [
    { name: 'chromium', use: { channel: 'chrome' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
];

// Generate TZ × browser matrix: BRT-chromium, BRT-firefox, BRT-webkit, …
const projects = timezones.flatMap((tz) =>
    browsers.map((browser) => ({
        name: `${tz.name}-${browser.name}`,
        use: { timezoneId: tz.timezoneId, ...browser.use },
    }))
);

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
    },

    projects,

    outputDir: './tmp/test-results',
    reporter: [['html', { open: 'never', outputFolder: './tmp/playwright-report' }], ['list']],
});
