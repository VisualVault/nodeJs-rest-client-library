#!/usr/bin/env node
/**
 * VV Platform Version Snapshot
 *
 * Captures all discoverable version/build information from a VV environment
 * and saves a timestamped JSON snapshot. Run before/after deploy notifications
 * to track what changed.
 *
 * Data sources:
 *   1. /api/v1/{customer}/{db}/version  — core platform version, DB version
 *   2. /configuration/* endpoints       — service URLs for FormsAPI, DocAPI, etc.
 *   3. FormViewer DOM                   — build number (span.app-version)
 *   4. FormViewer script URLs           — content hashes that change per deploy
 *   5. HTTP response headers            — IIS, ASP.NET, MVC versions
 *
 * Usage:
 *   node tools/explore/version-snapshot.js              # save snapshot
 *   node tools/explore/version-snapshot.js --print      # print to stdout only
 *   node tools/explore/version-snapshot.js --output dir # custom output dir
 *
 * Output: tools/explore/snapshots/version-{env}-{YYYYMMDD-HHmmss}.json
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../../testing/fixtures/env-config');

// --- CLI args ---
const args = process.argv.slice(2);
const printOnly = args.includes('--print');
const outputIdx = args.indexOf('--output');
const customOutput = outputIdx >= 0 ? args[outputIdx + 1] : null;

const config = loadConfig();
const BASE_URL = config.baseUrl;
const CUSTOMER = config.customerAlias;
const DATABASE = config.databaseAlias;
const ENV_NAME = config.instance.replace('/', '-'); // e.g., "vvdemo-EmanuelJofre"

// FormViewer URL for build number capture (DateTest form on vvdemo — adjust GUIDs for other envs)
const FORMVIEWER_URL =
    `${BASE_URL}/FormViewer/app?hidemenu=true` +
    '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'testing', 'config', 'auth-state-pw.json');

// --- OAuth ---

async function getToken() {
    const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        username: config.username,
        password: config.password,
        grant_type: 'password',
    });
    const resp = await fetch(`${BASE_URL}/OAuth/Token`, { method: 'POST', body: params });
    if (!resp.ok) throw new Error(`OAuth failed: ${resp.status}`);
    const data = await resp.json();
    return data.access_token;
}

// --- API probes (no Playwright needed) ---

async function captureApiVersion(token) {
    const url = `${BASE_URL}/api/v1/${CUSTOMER}/${DATABASE}/version`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return { error: `${resp.status} ${resp.statusText}` };
    const json = await resp.json();
    return json.data || json;
}

async function captureConfigEndpoints(token) {
    const components = ['docapi', 'formsapi', 'objectsapi', 'studioapi', 'notificationapi'];
    const results = {};
    for (const component of components) {
        const url = `${BASE_URL}/api/v1/${CUSTOMER}/${DATABASE}/configuration/${component}`;
        try {
            const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (resp.ok) {
                const json = await resp.json();
                results[component] = json.data || json;
            } else {
                results[component] = { error: `${resp.status}` };
            }
        } catch (e) {
            results[component] = { error: e.message };
        }
    }
    return results;
}

async function captureServerHeaders(token) {
    // Hit the main API endpoint to capture IIS/ASP.NET headers
    const url = `${BASE_URL}/api/v1/${CUSTOMER}/${DATABASE}/version`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const headers = {};
    for (const [name, value] of resp.headers) {
        if (/server|version|powered|aspnet|mvc/i.test(name)) {
            headers[name] = value;
        }
    }
    return headers;
}

// --- Browser probes (Playwright needed) ---

async function captureFormViewerInfo() {
    // Check if auth state exists
    if (!fs.existsSync(AUTH_STATE_PATH)) {
        return { error: 'No auth state — run npm run explore first to authenticate' };
    }

    let browser;
    try {
        browser = await chromium.launch();
        const context = await browser.newContext({ storageState: AUTH_STATE_PATH });
        const page = await context.newPage();

        await page.goto(FORMVIEWER_URL, { waitUntil: 'networkidle', timeout: 60000 });

        // Wait for VV to load (partial is fine)
        await page.waitForFunction(() => typeof VV !== 'undefined', { timeout: 30000 }).catch(() => {});

        // Capture build number
        const buildInfo = await page.evaluate(() => {
            const el = document.querySelector('span.app-version');
            const buildText = el ? el.textContent.trim() : null;
            const buildMatch = buildText ? buildText.match(/(\d{8}\.\d+)/) : null;
            return {
                buildText,
                buildNumber: buildMatch ? buildMatch[1] : null,
            };
        });

        // Capture script hashes (Angular content-hashed filenames)
        const scriptHashes = await page.evaluate(() => {
            return [...document.querySelectorAll('script[src]')]
                .map((s) => s.src)
                .filter((s) => s.includes('/FormViewer/'))
                .map((s) => {
                    const filename = s.split('/').pop().split('?')[0];
                    return filename;
                });
        });

        // Capture page title (contains form record ID)
        const title = await page.title();

        await browser.close();

        return {
            buildNumber: buildInfo.buildNumber,
            buildText: buildInfo.buildText,
            scriptFiles: scriptHashes,
            pageTitle: title,
        };
    } catch (e) {
        if (browser) await browser.close();
        return { error: e.message };
    }
}

// --- Main ---

async function main() {
    const startTime = Date.now();
    console.log(`\nCapturing version snapshot for ${config.instance}...`);
    console.log(`Environment: ${BASE_URL}\n`);

    // API probes (parallel)
    const token = await getToken();
    console.log('  [1/4] API version endpoint...');
    const [apiVersion, configEndpoints, serverHeaders] = await Promise.all([
        captureApiVersion(token),
        captureConfigEndpoints(token),
        captureServerHeaders(token),
    ]);
    console.log('  [2/4] Configuration endpoints...');
    console.log('  [3/4] Server headers...');

    // Browser probe
    console.log('  [4/4] FormViewer build number (browser)...');
    const formViewer = await captureFormViewerInfo();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Build snapshot
    const snapshot = {
        meta: {
            timestamp: new Date().toISOString(),
            environment: BASE_URL,
            instance: config.instance,
            customer: CUSTOMER,
            database: DATABASE,
            capturedIn: `${elapsed}s`,
        },
        platform: {
            progVersion: apiVersion.progVersion || null,
            dbVersion: apiVersion.dbVersion || null,
            dbCreateDate: apiVersion.dbCreateDate || null,
            dbModifiedDate: apiVersion.dbModifiedDate || null,
            progCreateDate: apiVersion.progCreateDate || null,
            progModifiedDate: apiVersion.progModifiedDate || null,
            utcOffset: apiVersion.utcOffset ?? null,
            raw: apiVersion,
        },
        formViewer: {
            buildNumber: formViewer.buildNumber || null,
            buildText: formViewer.buildText || null,
            scriptFiles: formViewer.scriptFiles || [],
            error: formViewer.error || null,
        },
        services: {},
        server: serverHeaders,
    };

    // Extract service URLs from config endpoints
    for (const [component, data] of Object.entries(configEndpoints)) {
        const url =
            data.apiUrl ||
            data.formsApiUrl ||
            data.studioApiUrl ||
            data.workflowApiUrl ||
            data.notificationApiUrl ||
            null;
        snapshot.services[component] = {
            url: url || null,
            isEnabled: data.isEnabled ?? null,
            raw: data,
        };
    }

    // Print summary
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  VV Version Snapshot — ${config.instance}`);
    console.log(`  ${new Date().toISOString()}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Platform version:    ${snapshot.platform.progVersion || '(unknown)'}`);
    console.log(`  DB version:          ${snapshot.platform.dbVersion || '(unknown)'}`);
    console.log(`  FormViewer build:    ${snapshot.formViewer.buildNumber || '(unknown)'}`);
    console.log(`  Server:              ${snapshot.server.server || '(unknown)'}`);
    console.log(`  ASP.NET:             ${snapshot.server['x-aspnet-version'] || '(unknown)'}`);
    console.log();
    console.log('  Services:');
    for (const [name, svc] of Object.entries(snapshot.services)) {
        const status = svc.isEnabled === true ? 'enabled' : svc.isEnabled === false ? 'disabled' : 'n/a';
        console.log(`    ${name.padEnd(18)} ${(svc.url || '(not configured)').padEnd(50)} [${status}]`);
    }
    if (snapshot.formViewer.scriptFiles.length > 0) {
        console.log();
        console.log('  FormViewer scripts (content hashes):');
        for (const file of snapshot.formViewer.scriptFiles) {
            console.log(`    ${file}`);
        }
    }
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Captured in ${elapsed}s`);
    console.log();

    // Save snapshot
    if (!printOnly) {
        const outputDir = customOutput || path.join(__dirname, 'snapshots');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const dateStr = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').substring(0, 15);
        const filename = `version-${ENV_NAME}-${dateStr}.json`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
        console.log(`  Snapshot saved: ${filepath}`);

        // Also save as "latest" for easy diff comparison
        const latestPath = path.join(outputDir, `version-${ENV_NAME}-latest.json`);
        fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2));
        console.log(`  Latest saved:   ${latestPath}`);
        console.log();
    }
}

main().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
});
