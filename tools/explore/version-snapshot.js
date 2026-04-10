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
const {
    getToken,
    captureApiVersion,
    captureConfigEndpoints,
    captureServerHeaders,
    captureFormViewerBuild,
    captureFormViewerConfig,
    captureFormsApiInfo,
    captureApiMeta,
} = require('../helpers/vv-probes');

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

// --- Main ---

async function main() {
    const startTime = Date.now();
    console.log(`\nCapturing version snapshot for ${config.instance}...`);
    console.log(`Environment: ${BASE_URL}\n`);

    // All probes run via HTTP — no browser needed
    const token = await getToken(config);

    console.log('  [1/6] API version endpoint...');
    console.log('  [2/6] Configuration endpoints...');
    console.log('  [3/6] Server headers...');
    console.log('  [4/6] FormViewer build.json + config.json...');
    console.log('  [5/6] FormsAPI probe (JWT + Stackify)...');
    console.log('  [6/6] API meta endpoint...');

    // Capture FormViewer config first — needed by both snapshot assembly and FormsAPI probe
    const fvConfig = await captureFormViewerConfig(BASE_URL);

    const [apiVersion, configEndpoints, serverHeaders, fvBuild, formsApiInfo, apiMeta] = await Promise.all([
        captureApiVersion(BASE_URL, CUSTOMER, DATABASE, token),
        captureConfigEndpoints(BASE_URL, CUSTOMER, DATABASE, token),
        captureServerHeaders(BASE_URL, CUSTOMER, DATABASE, token),
        captureFormViewerBuild(BASE_URL),
        captureFormsApiInfo(BASE_URL, CUSTOMER, DATABASE, token, fvConfig),
        captureApiMeta(BASE_URL, CUSTOMER, DATABASE, token),
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
