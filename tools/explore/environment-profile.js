#!/usr/bin/env node
/**
 * VV Customer Environment Profile Generator
 *
 * Consolidates all discoverable environment metadata into a single JSON profile
 * per customer. Captures platform version, service configuration, and optionally
 * front-end library versions from both the Admin app and FormViewer SPA.
 *
 * Data sources:
 *   HTTP (always, ~3s):
 *     - /api/v1/{customer}/{db}/version — core platform version, DB version, utcOffset
 *     - /configuration/* endpoints     — service URLs, enablement, behavioral config
 *     - /FormViewer/assets/build.json  — FormViewer build number + code version
 *     - /FormViewer/assets/config.json — production mode, sockets, audience
 *     - FormsAPI /FormSettings via JWT — Stackify ID, row limits, lock settings
 *     - /api/v1/{customer}/{db}/meta   — data type count (schema complexity)
 *     - HTTP response headers          — IIS, ASP.NET versions
 *
 *   Browser (--with-browser, ~10-12s):
 *     - Admin app (FormDataAdmin): jQuery, Kendo, Telerik, Angular versions;
 *       Telerik controls, Kendo widgets, CSS frameworks, ASP.NET indicators
 *     - FormViewer SPA: Angular, Kendo version + variant (v1/v2),
 *       SignalR/Moment.js presence, VV.Form properties
 *
 * Usage:
 *   node tools/explore/environment-profile.js --project wadnr
 *   node tools/explore/environment-profile.js --project emanueljofre --with-browser
 *   node tools/explore/environment-profile.js --print
 *   node tools/explore/environment-profile.js --output /custom/path
 *
 * Output: projects/{customer}/environment.json
 */
const fs = require('fs');
const path = require('path');
const { findCustomer, listCustomers, getActiveCustomer, loadEnvConfig } = require('../helpers/vv-admin');
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

const cliArgs = process.argv.slice(2);
const WITH_BROWSER = cliArgs.includes('--with-browser');
const PRINT_ONLY = cliArgs.includes('--print');
const HEADED = cliArgs.includes('--headed');

function getArg(flag) {
    const i = cliArgs.indexOf(flag);
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : null;
}

const PROJECT_NAME = getArg('--project');
const PROJECTS_DIR = path.resolve(__dirname, '..', '..', 'projects');

// --- FormViewer URL resolution ---

// Known FormViewer template paths per customer (for browser probes).
// These must contain at least one calendar field for Kendo variant detection.
const FORMVIEWER_PATHS = {
    EmanuelJofre:
        '/FormViewer/app?hidemenu=true' +
        '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
        '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
        '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    WADNR:
        '/FormViewer/app?hidemenu=true' +
        '&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d' +
        '&xcid=WADNR' +
        '&xcdid=fpOnline',
};

// --- Project resolution ---

function resolveProject() {
    if (PROJECT_NAME) {
        const match = findCustomer(PROJECT_NAME);
        if (!match) {
            console.error(`No customer "${PROJECT_NAME}" found in .env.json`);
            console.error(`Available: ${listCustomers().join(', ')}`);
            process.exit(1);
        }
        return {
            output: getArg('--output') || path.join(PROJECTS_DIR, PROJECT_NAME.toLowerCase(), 'environment.json'),
            server: match.server,
            customer: match.customer,
        };
    }
    const active = getActiveCustomer();
    const outputPath = getArg('--output') || path.join(PROJECTS_DIR, active.customer.toLowerCase(), 'environment.json');
    return {
        output: outputPath,
        server: active.server,
        customer: active.customer,
    };
}

// --- Derived field computation ---

/**
 * Derive environment type from the base URL.
 * @param {string} baseUrl
 * @returns {string} 'demo' | 'dev' | 'staging' | 'production'
 */
function deriveEnvironmentType(baseUrl) {
    const host = new URL(baseUrl).hostname.toLowerCase();
    if (host.includes('demo')) return 'demo';
    if (host.includes('dev')) return 'dev';
    if (host.includes('stg') || host.includes('staging')) return 'staging';
    return 'production';
}

/**
 * Compute days between two ISO date strings.
 */
function daysBetween(isoDate, now) {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Parse build date from FormViewer build number (YYYYMMDD.N format).
 */
function parseBuildDate(buildNumber) {
    if (!buildNumber) return null;
    const match = String(buildNumber).match(/^(\d{4})(\d{2})(\d{2})\./);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Extract the primary service URL from a config endpoint response.
 */
function extractServiceUrl(data) {
    return (
        data.apiUrl || data.formsApiUrl || data.studioApiUrl || data.workflowApiUrl || data.notificationApiUrl || null
    );
}

// --- Main ---

async function main() {
    const startTime = Date.now();
    const project = resolveProject();
    const config = loadEnvConfig(project.server, project.customer);
    const now = new Date();

    console.log(`\nGenerating environment profile for ${project.server}/${project.customer}...`);
    console.log(`Environment: ${config.baseUrl}`);
    if (WITH_BROWSER) console.log('Browser probes: enabled');
    console.log();

    const errors = [];

    // --- Phase 1: HTTP probes (~3s) ---

    console.log('  [HTTP] Authenticating...');
    const token = await getToken(config);

    console.log('  [HTTP] Running probes...');
    const fvConfig = await captureFormViewerConfig(config.baseUrl);

    const [apiVersion, configEndpoints, serverHeaders, fvBuild, formsApiInfo, apiMeta] = await Promise.all([
        captureApiVersion(config.baseUrl, config.customerAlias, config.databaseAlias, token),
        captureConfigEndpoints(config.baseUrl, config.customerAlias, config.databaseAlias, token),
        captureServerHeaders(config.baseUrl, config.customerAlias, config.databaseAlias, token),
        captureFormViewerBuild(config.baseUrl),
        captureFormsApiInfo(config.baseUrl, config.customerAlias, config.databaseAlias, token, fvConfig),
        captureApiMeta(config.baseUrl, config.customerAlias, config.databaseAlias, token),
    ]);

    // Collect errors from probes that returned error objects
    if (apiVersion.error) errors.push(`apiVersion: ${apiVersion.error}`);
    if (fvBuild.error) errors.push(`formViewerBuild: ${fvBuild.error}`);
    if (fvConfig.error) errors.push(`formViewerConfig: ${fvConfig.error}`);
    if (formsApiInfo.error) errors.push(`formsApiInfo: ${formsApiInfo.error}`);
    if (apiMeta.error) errors.push(`apiMeta: ${apiMeta.error}`);

    // --- Phase 2: Browser probes (optional) ---

    let adminApp = { captured: false };
    let formViewerApp = { captured: false };

    if (WITH_BROWSER) {
        console.log('  [Browser] Launching Playwright...');
        const { runBrowserProbes } = require('../helpers/vv-browser-probes');
        const fvPath = FORMVIEWER_PATHS[project.customer] || null;
        const browserResult = await runBrowserProbes(config, {
            formViewerPath: fvPath,
            headed: HEADED,
        });
        adminApp = browserResult.adminApp;
        formViewerApp = browserResult.formViewerApp;
        errors.push(...browserResult.errors);
    }

    // --- Phase 3: Compute derived fields ---

    const buildNumber = fvBuild.build ? String(fvBuild.build) : null;
    const docapiRaw = configEndpoints.docapi || {};
    const studioRaw = configEndpoints.studioapi || {};
    const formSettings = formsApiInfo.formSettings?.data || null;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // --- Phase 4: Assemble profile ---

    const profile = {
        $schema: 'environment-profile-v1',
        generatedAt: now.toISOString(),
        capturedIn: `${elapsed}s`,

        environment: {
            server: project.server,
            customer: project.customer,
            database: config.databaseAlias,
            baseUrl: config.baseUrl,
            instance: `${project.server}/${project.customer}`,
            environmentType: deriveEnvironmentType(config.baseUrl),
        },

        platform: {
            progVersion: apiVersion.progVersion || null,
            dbVersion: apiVersion.dbVersion || null,
            utcOffset: apiVersion.utcOffset ?? null,
            dataTypeCount: apiMeta.dataTypeCount || null,
            dbCreateDate: apiVersion.dbCreateDate || null,
            dbModifiedDate: apiVersion.dbModifiedDate || null,
            progCreateDate: apiVersion.progCreateDate || null,
            progModifiedDate: apiVersion.progModifiedDate || null,
            deploymentAgeDays: daysBetween(apiVersion.progModifiedDate, now),
        },

        formViewer: {
            buildNumber,
            codeVersion: fvBuild.code || null,
            buildDate: parseBuildDate(buildNumber),
            production: fvConfig.production ?? null,
            enableSockets: fvConfig.enableSockets ?? null,
            socketsUrl: fvConfig.socketsUrl || null,
            audience: fvConfig.audience || null,
        },

        infrastructure: {
            serverHeader: serverHeaders.server || null,
            aspNetVersion: serverHeaders['x-aspnet-version'] || null,
        },

        services: {
            formsapi: {
                url: extractServiceUrl(configEndpoints.formsapi || {}),
                enabled: configEndpoints.formsapi?.isEnabled ?? null,
                stackifyId: formsApiInfo.stackifyId || null,
                rowsPerPage: formSettings?.rowsPerPage ?? null,
                maxRows: formSettings?.maxRows ?? null,
                lockLimitMinutes: formSettings?.lockLimitMinutes ?? null,
            },
            docapi: {
                url: extractServiceUrl(docapiRaw),
                enabled: docapiRaw.isEnabled ?? null,
                roleSecurity: docapiRaw.roleSecurity ?? null,
                defaultForDocList: docapiRaw.docApiDefaultForDocList ?? null,
            },
            studioapi: {
                url: extractServiceUrl(studioRaw),
                enabled: studioRaw.isEnabled ?? null,
                maxRowCount: studioRaw.maxRowCount ?? null,
            },
            workflowapi: {
                url: studioRaw.workflowApiUrl || null,
            },
            objectsapi: {
                url: extractServiceUrl(configEndpoints.objectsapi || {}),
                enabled: configEndpoints.objectsapi?.isEnabled ?? null,
            },
            notificationapi: {
                url: extractServiceUrl(configEndpoints.notificationapi || {}),
                enabled: configEndpoints.notificationapi?.isEnabled ?? null,
            },
        },

        adminApp,
        formViewerApp,

        errors: errors.filter(Boolean),
    };

    // --- Phase 5: Output ---

    const json = JSON.stringify(profile, null, 2);

    // Print summary
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  VV Environment Profile — ${profile.environment.instance}`);
    console.log(`  ${now.toISOString()}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Type:                ${profile.environment.environmentType}`);
    console.log(`  Platform version:    ${profile.platform.progVersion || '(unknown)'}`);
    console.log(`  DB version:          ${profile.platform.dbVersion || '(unknown)'}`);
    console.log(`  UTC offset:          ${profile.platform.utcOffset ?? '(unknown)'}`);
    console.log(`  FormViewer build:    ${profile.formViewer.buildNumber || '(unknown)'}`);
    console.log(`  FormViewer code:     ${profile.formViewer.codeVersion || '(unknown)'}`);
    console.log(`  Build date:          ${profile.formViewer.buildDate || '(unknown)'}`);
    console.log(`  Production mode:     ${profile.formViewer.production ?? '(unknown)'}`);
    console.log(`  Server:              ${profile.infrastructure.serverHeader || '(unknown)'}`);
    console.log(`  ASP.NET:             ${profile.infrastructure.aspNetVersion || '(unknown)'}`);
    console.log(`  Deployment age:      ${profile.platform.deploymentAgeDays ?? '(unknown)'} days`);
    console.log();
    console.log('  Services:');
    for (const [name, svc] of Object.entries(profile.services)) {
        const status = svc.enabled === true ? 'enabled' : svc.enabled === false ? 'disabled' : 'n/a';
        const url = svc.url || '(not configured)';
        console.log(`    ${name.padEnd(18)} ${url.substring(0, 50).padEnd(50)} [${status}]`);
    }
    if (WITH_BROWSER) {
        console.log();
        console.log('  Admin App:');
        console.log(`    jQuery:            ${adminApp.jquery || '(not detected)'}`);
        console.log(`    Kendo:             ${adminApp.kendo || '(not detected)'}`);
        console.log(`    Telerik:           ${adminApp.telerik || '(not detected)'}`);
        console.log(`    ViewState:         ${adminApp.viewState ?? '(unknown)'}`);
        console.log(
            `    Controls:          ${(adminApp.telerikControls || []).length} Telerik, ${(adminApp.kendoWidgets || []).length} Kendo`
        );
        console.log();
        console.log('  FormViewer App:');
        console.log(`    Angular:           ${formViewerApp.angular || '(not detected)'}`);
        console.log(`    Kendo:             ${formViewerApp.kendo || '(not detected)'}`);
        console.log(`    Kendo variant:     ${formViewerApp.kendoVariant || '(not detected)'}`);
        console.log(`    SignalR:           ${formViewerApp.signalR ?? '(unknown)'}`);
        console.log(`    Moment.js:         ${formViewerApp.momentJs ?? '(unknown)'}`);
    } else {
        console.log();
        console.log('  Browser probes:      skipped (use --with-browser to enable)');
    }
    if (errors.length > 0) {
        console.log();
        console.log(`  Errors (${errors.length}):`);
        for (const e of errors) console.log(`    - ${e}`);
    }
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Captured in ${elapsed}s`);
    console.log();

    if (PRINT_ONLY) {
        console.log(json);
    } else {
        const outputPath = project.output;
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(outputPath, json);
        console.log(`  Profile saved: ${outputPath}`);
        console.log();
    }
}

main().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
});
