/**
 * Playwright global setup — authenticates with VV before tests run.
 *
 * Runs once before all test files. Logs into VisualVault and saves browser
 * cookies/storage to testing/config/auth-state-pw.json. Individual tests then
 * reuse these cookies via playwright.config.js `storageState`.
 *
 * Auth state freshness: skips login if the saved state is less than 1 hour old.
 * This is a heuristic — VV session cookies typically last longer, but 1 hour
 * provides a safety margin. To force re-login, delete the auth state file.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const { vvConfig, AUTH_STATE_PATH } = require('./fixtures/vv-config');

module.exports = async function globalSetup() {
    // Reuse existing auth state if it was saved less than 1 hour ago.
    // The mtime check is a proxy for session validity — actual VV session
    // cookies may last longer, but this avoids stale state issues.
    if (fs.existsSync(AUTH_STATE_PATH)) {
        const stat = fs.statSync(AUTH_STATE_PATH);
        if (Date.now() - stat.mtimeMs < 3600_000) return;
    }

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(vvConfig.loginUrl);

    // VV login form selectors — verified against the actual vvdemo.visualvault.com login page.
    // The form has: textbox "User Name", textbox "Password", button "Log In".
    // If VV changes these labels, update the selectors here.
    await page.getByRole('textbox', { name: 'User Name' }).fill(vvConfig.username);
    await page.getByRole('textbox', { name: 'Password' }).fill(vvConfig.password);
    await page.getByRole('button', { name: 'Log In' }).click();

    // After successful login, VV redirects to the Form Data Admin page.
    await page.waitForURL('**/FormDataAdmin**', { timeout: 15000 });

    await context.storageState({ path: AUTH_STATE_PATH });
    await browser.close();
};
