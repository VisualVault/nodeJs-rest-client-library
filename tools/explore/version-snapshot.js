#!/usr/bin/env node
/**
 * VV Platform Version Snapshot
 *
 * Captures all discoverable version/build information from a VV environment
 * and saves a timestamped JSON snapshot. Run before/after deploy notifications
 * to track what changed.
 *
 * Data sources (all HTTP — no browser needed):
 *   1. /api/v1/{customer}/{db}/version  — core platform version, DB version
 *   2. /configuration/* endpoints       — service URLs for FormsAPI, DocAPI, etc.
 *   3. /FormViewer/assets/build.json    — FormViewer build number + code version (static file)
 *   4. /FormViewer/assets/config.json   — service URL map, env mode, sockets config
 *   5. FormsAPI /FormSettings via JWT   — Stackify APM IDs (deployment markers)
 *   6. /api/v1/{customer}/{db}/meta     — data type count (schema change detection)
 *   7. HTTP response headers            — IIS, ASP.NET versions
 *
 * Usage:
 *   node tools/explore/version-snapshot.js              # save snapshot
 *   node tools/explore/version-snapshot.js --print      # print to stdout only
 *   node tools/explore/version-snapshot.js --output dir # custom output dir
 *
 * Output: tools/explore/snapshots/version-{env}-{YYYYMMDD-HHmmss}.json
 */
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

// --- FormViewer static files (no browser needed!) ---

async function captureFormViewerBuild() {
    try {
        const buildResp = await fetch(`${BASE_URL}/FormViewer/assets/build.json`);
        if (!buildResp.ok) return { error: `build.json: ${buildResp.status}` };
        return await buildResp.json();
    } catch (e) {
        return { error: e.message };
    }
}

async function captureFormViewerConfig() {
    try {
        const configResp = await fetch(`${BASE_URL}/FormViewer/assets/config.json`);
        if (!configResp.ok) return { error: `config.json: ${configResp.status}` };
        return await configResp.json();
    } catch (e) {
        return { error: e.message };
    }
}

// --- FormsAPI probe (requires JWT) ---

async function captureFormsApiInfo(token) {
    try {
        // Get JWT for FormsAPI auth
        const jwtResp = await fetch(`${BASE_URL}/api/v1/${CUSTOMER}/${DATABASE}/users/getjwt`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!jwtResp.ok) return { error: `getjwt: ${jwtResp.status}` };
        const jwt = (await jwtResp.json()).data.token;

        // Hit FormsAPI to capture Stackify ID and other headers
        const fvConfig = await captureFormViewerConfig();
        const formsApiUrl = fvConfig.formsApiUrl || 'https://preformsapi.visualvault.com/api/v1';
        const resp = await fetch(`${formsApiUrl}/FormSettings`, {
            headers: { Authorization: 'Bearer ' + jwt },
        });

        const headers = {};
        for (const [name, value] of resp.headers) {
            headers[name] = value;
        }

        return {
            stackifyId: headers['x-stackifyid'] || null,
            headers,
            formSettings: resp.ok ? await resp.json() : null,
        };
    } catch (e) {
        return { error: e.message };
    }
}

// --- /meta endpoint ---

async function captureApiMeta(token) {
    try {
        const resp = await fetch(`${BASE_URL}/api/v1/${CUSTOMER}/${DATABASE}/meta`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return { error: `${resp.status}` };
        const json = await resp.json();
        const dataTypes = json.data?.dataTypes || [];
        return { dataTypeCount: dataTypes.length, dataTypes };
    } catch (e) {
        return { error: e.message };
    }
}

// --- Main ---

async function main() {
    const startTime = Date.now();
    console.log(`\nCapturing version snapshot for ${config.instance}...`);
    console.log(`Environment: ${BASE_URL}\n`);

    // All probes run via HTTP — no browser needed
    const token = await getToken();

    console.log('  [1/6] API version endpoint...');
    console.log('  [2/6] Configuration endpoints...');
    console.log('  [3/6] Server headers...');
    console.log('  [4/6] FormViewer build.json + config.json...');
    console.log('  [5/6] FormsAPI probe (JWT + Stackify)...');
    console.log('  [6/6] API meta endpoint...');

    const [apiVersion, configEndpoints, serverHeaders, fvBuild, fvConfig, formsApiInfo, apiMeta] = await Promise.all([
        captureApiVersion(token),
        captureConfigEndpoints(token),
        captureServerHeaders(token),
        captureFormViewerBuild(),
        captureFormViewerConfig(),
        captureFormsApiInfo(token),
        captureApiMeta(token),
    ]);

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
            dataTypeCount: apiMeta.dataTypeCount || null,
            raw: apiVersion,
        },
        formViewer: {
            buildNumber: fvBuild.build ? String(fvBuild.build) : null,
            codeVersion: fvBuild.code || null,
            raw: fvBuild,
        },
        formViewerConfig: {
            production: fvConfig.production ?? null,
            enableSockets: fvConfig.enableSockets ?? null,
            socketsUrl: fvConfig.socketsUrl || null,
            audience: fvConfig.audience || null,
        },
        formsApi: {
            stackifyId: formsApiInfo.stackifyId || null,
            formSettings: formsApiInfo.formSettings?.data || null,
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
    console.log(`  FormViewer code:     ${snapshot.formViewer.codeVersion || '(unknown)'}`);
    console.log(`  Server:              ${snapshot.server.server || '(unknown)'}`);
    console.log(`  ASP.NET:             ${snapshot.server['x-aspnet-version'] || '(unknown)'}`);
    console.log(`  FormsAPI Stackify:   ${snapshot.formsApi.stackifyId || '(unknown)'}`);
    console.log(`  API data types:      ${snapshot.platform.dataTypeCount || '(unknown)'}`);
    console.log(`  Environment mode:    ${snapshot.formViewerConfig.production ? 'production' : 'non-production'}`);
    console.log();
    console.log('  Services:');
    for (const [name, svc] of Object.entries(snapshot.services)) {
        const status = svc.isEnabled === true ? 'enabled' : svc.isEnabled === false ? 'disabled' : 'n/a';
        console.log(`    ${name.padEnd(18)} ${(svc.url || '(not configured)').padEnd(50)} [${status}]`);
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
