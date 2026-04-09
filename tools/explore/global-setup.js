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
const { captureBuildContext } = require('../helpers/build-context');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'testing', 'config', 'auth-state-pw.json');
const BUILD_CONTEXT_PATH = path.join(__dirname, '..', '..', 'testing', 'config', 'build-context.json');
const CACHE_MAX_AGE_MS = 3600_000; // 1 hour

function isCacheFresh(filePath, maxAge = CACHE_MAX_AGE_MS) {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs < maxAge;
}

async function captureBuild(config) {
    if (isCacheFresh(BUILD_CONTEXT_PATH)) return;
    try {
        const ctx = await captureBuildContext(config);
        fs.writeFileSync(BUILD_CONTEXT_PATH, JSON.stringify(ctx, null, 2));
    } catch (e) {
        console.warn('[global-setup] Build context capture failed:', e.message);
    }
}

module.exports = async function globalSetup() {
    const config = loadConfig();

    // Build context capture runs in parallel with auth (no dependency)
    const buildPromise = captureBuild(config);

    if (isCacheFresh(AUTH_STATE_PATH)) {
        await buildPromise;
        return;
    }
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
    await buildPromise;
};
