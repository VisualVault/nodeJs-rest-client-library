/**
 * Exploration global setup — authenticates with VV (auth only, no record creation).
 *
 * Shares auth-state-pw.json with testing/ to avoid double-login.
 * Cached for 1 hour — delete testing/config/auth-state-pw.json to force re-auth.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../../testing/fixtures/env-config');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'testing', 'config', 'auth-state-pw.json');
const CACHE_MAX_AGE_MS = 3600_000; // 1 hour

function isCacheFresh(filePath, maxAge = CACHE_MAX_AGE_MS) {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs < maxAge;
}

module.exports = async function globalSetup() {
    if (isCacheFresh(AUTH_STATE_PATH)) return;

    const config = loadConfig();
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(config.loginUrl);
    await page.getByRole('textbox', { name: 'User Name' }).fill(config.username);
    await page.getByRole('textbox', { name: 'Password' }).fill(config.password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('**/FormDataAdmin**', { timeout: 15000 });

    await context.storageState({ path: AUTH_STATE_PATH });
    await browser.close();
};
