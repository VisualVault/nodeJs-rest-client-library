/**
 * VV Platform Version/Build Discovery
 *
 * Systematically probes the VV platform to find where version, build,
 * and deployment information is exposed. 8 probes covering:
 *   1. HTTP response headers during page load
 *   2. Configuration API full responses (5 components)
 *   3. JavaScript globals enumeration (VV object tree)
 *   4. DOM scan (meta tags, asset URLs, text patterns)
 *   5. FormViewer build number capture
 *   6. Admin pages inspection
 *   7. Speculative API endpoints
 *   8. Per-service direct probing
 *
 * Run:
 *   npm run explore:headed    # watch probes execute
 *   npm run explore           # headless
 *   npm run explore:report    # view HTML report with JSON artifacts
 */
const { test, expect } = require('@playwright/test');
const { loadConfig } = require('../../../testing/fixtures/env-config');
const {
    createResponseCollector,
    enumerateJSGlobals,
    scanDOM,
    probeEndpoints,
    formatReport,
} = require('../../helpers/vv-explore');

// --- Configuration ---

const config = loadConfig();
const BASE_URL = config.baseUrl;
const CUSTOMER = config.customerAlias;
const DATABASE = config.databaseAlias;
const API_BASE = `/api/v1/${CUSTOMER}/${DATABASE}`;

// Admin page URL helper
const adminUrl = (section) => `/app/${CUSTOMER}/${DATABASE}/${section}`;

// FormViewer URL — uses DateTest form on vvdemo. Change GUIDs for other environments.
const FORMVIEWER_URL =
    '/FormViewer/app?hidemenu=true' +
    '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

/**
 * Navigate to FormViewer and wait for VV.Form (same pattern as testing/helpers/vv-form.js).
 * Returns true if form loaded successfully, false otherwise.
 */
async function gotoFormViewer(page, timeout = 60000) {
    try {
        await page.goto(FORMVIEWER_URL, { waitUntil: 'networkidle', timeout });
        await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form, { timeout: 30000 });
        return true;
    } catch {
        // Form may fail to load — VV.Form might not exist but VV might
        const hasVV = await page.evaluate(() => typeof VV !== 'undefined').catch(() => false);
        if (hasVV) return true; // partial load — still useful for exploration
        return false;
    }
}

// Patterns to search for in text/values
const BUILD_PATTERN = /\d{8}\.\d+/; // Azure DevOps build format: 20260408.1
const SEMVER_PATTERN = /\bv?\d+\.\d+\.\d+/; // Semver: 1.2.3, v4.5.6
const VERSION_PATTERNS = [BUILD_PATTERN, SEMVER_PATTERN];

// --- Shared state ---

let apiToken = null;
let configApiResponses = null; // shared between Probe 2 and Probe 8

// --- OAuth helper (inline, avoids dependency on ws-config.js) ---

async function getApiToken(request) {
    if (apiToken) return apiToken;

    const resp = await request.post(`${BASE_URL}/OAuth/Token`, {
        form: {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            username: config.username,
            password: config.password,
            grant_type: 'password',
        },
    });

    if (!resp.ok()) {
        throw new Error(`OAuth failed: ${resp.status()} ${resp.statusText()}`);
    }

    const data = await resp.json();
    apiToken = data.access_token;
    return apiToken;
}

// --- Probes ---

test.describe.configure({ mode: 'serial' });

test.describe('VV Platform Version/Build Discovery', () => {
    test('Probe 1: HTTP response headers during page load', async ({ page }, testInfo) => {
        const collector = createResponseCollector(page);
        collector.start();

        // Navigate to admin landing — triggers main app + API calls
        await page.goto(adminUrl('FormDataAdmin'));
        await page.waitForLoadState('networkidle');

        collector.stop();
        const results = collector.getResults();

        // Find version-related headers
        const versionHeaders = collector.findHeaders(
            /server|version|build|powered|aspnet|api-version|source|request-context/i
        );

        // All unique headers across all responses
        const uniqueHeaders = collector.getUniqueHeaderNames();

        // All unique base URLs contacted
        const uniqueDomains = [...new Set(results.map((r) => new URL(r.url).origin))].sort();

        const findings = [
            `Total responses captured: ${results.length}`,
            `Unique domains contacted: ${uniqueDomains.length}`,
            ...uniqueDomains.map((d) => `  - ${d}`),
            '',
            `All unique header names (${uniqueHeaders.length}):`,
            ...uniqueHeaders.map((h) => `  ${h}`),
            '',
            `Version-related headers (${versionHeaders.length}):`,
            ...versionHeaders.map((h) => `  ${h.headerName}: ${h.headerValue}  [${h.url.substring(0, 80)}]`),
        ];

        const report = formatReport('PROBE 1: HTTP Response Headers', [{ name: 'Header Analysis', findings }]);
        console.log(report);

        await testInfo.attach('probe-1-headers', {
            body: JSON.stringify(
                { uniqueHeaders, versionHeaders, uniqueDomains, responseCount: results.length },
                null,
                2
            ),
            contentType: 'application/json',
        });
    });

    test('Probe 2: Configuration API full responses', async ({ request }, testInfo) => {
        const token = await getApiToken(request);

        const components = ['docapi', 'formsapi', 'objectsapi', 'studioapi', 'notificationapi'];
        const endpoints = components.map((c) => `${BASE_URL}${API_BASE}/configuration/${c}`);

        const results = await probeEndpoints(request, endpoints, { token, maxBodySize: 10000 });

        // Store for Probe 8
        configApiResponses = results;

        const findings = [];
        for (const r of results) {
            const component = r.url.split('/configuration/')[1] || r.url;
            findings.push(`[${component}] Status: ${r.status}`);
            if (r.headers) {
                // Check for version headers on config endpoints specifically
                for (const [name, value] of Object.entries(r.headers)) {
                    if (/version|build|server|powered/i.test(name)) {
                        findings.push(`  Header: ${name}: ${value}`);
                    }
                }
            }
            if (r.body) {
                findings.push(`  Body: ${r.body.substring(0, 500)}`);

                // Scan body for version patterns
                for (const pattern of VERSION_PATTERNS) {
                    const matches = r.body.match(new RegExp(pattern.source, 'g'));
                    if (matches) {
                        findings.push(`  Pattern matches (${pattern.source}): ${matches.join(', ')}`);
                    }
                }
            }
            findings.push('');
        }

        const report = formatReport('PROBE 2: Configuration API Responses', [{ name: 'Endpoint Results', findings }]);
        console.log(report);

        await testInfo.attach('probe-2-config-api', {
            body: JSON.stringify(results, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 3: JavaScript globals enumeration', async ({ page }, testInfo) => {
        // Load FormViewer to get VV.Form and related objects
        const loaded = await gotoFormViewer(page);
        if (!loaded) {
            console.log('PROBE 3: FormViewer failed to load. Skipping JS globals enumeration.');
            await testInfo.attach('probe-3-js-globals', {
                body: JSON.stringify({ skipped: true, reason: 'FormViewer failed to load' }),
                contentType: 'application/json',
            });
            return;
        }

        // Enumerate VV object tree
        const vvTree = await enumerateJSGlobals(page, 'VV', {
            maxDepth: 3,
            valuePatterns: VERSION_PATTERNS,
        });

        // Check additional global objects
        const additionalChecks = await page.evaluate(() => {
            const checks = {};
            const paths = [
                'window.__BUILD__',
                'window.__VERSION__',
                'window.__COMMIT__',
                'window.appConfig',
                'window.buildInfo',
                'window.APP_VERSION',
            ];
            for (const p of paths) {
                try {
                    const val = p.split('.').reduce((o, k) => o?.[k], window);
                    if (val !== undefined) checks[p] = String(val).substring(0, 200);
                } catch {
                    // skip
                }
            }

            // Check angular version if present
            try {
                if (window.angular) checks['angular.version.full'] = window.angular.version.full;
            } catch {
                // skip
            }

            return checks;
        });

        // Filter to interesting findings
        const matched = vvTree.filter((e) => e.matched);
        const stringProps = vvTree.filter((e) => (e.type === 'string' || e.type === 'number') && !e.matched);

        const findings = [
            `Total VV properties enumerated: ${vvTree.length}`,
            `Properties matching version patterns: ${matched.length}`,
            '',
            'Matched properties:',
            ...(matched.length > 0 ? matched.map((e) => `  ${e.path} = ${e.value}`) : ['  (none)']),
            '',
            'Additional global checks:',
            ...(Object.keys(additionalChecks).length > 0
                ? Object.entries(additionalChecks).map(([k, v]) => `  ${k} = ${v}`)
                : ['  (none found)']),
            '',
            `String/number properties (first 30):`,
            ...stringProps.slice(0, 30).map((e) => `  ${e.path} [${e.type}] = ${e.value.substring(0, 80)}`),
        ];

        const report = formatReport('PROBE 3: JavaScript Globals', [{ name: 'VV Object Tree', findings }]);
        console.log(report);

        await testInfo.attach('probe-3-js-globals', {
            body: JSON.stringify(
                { matched, additionalChecks, totalProperties: vvTree.length, allProperties: vvTree },
                null,
                2
            ),
            contentType: 'application/json',
        });
    });

    test('Probe 4: DOM scan (meta tags + asset URLs)', async ({ page }, testInfo) => {
        // Navigate to FormViewer
        await gotoFormViewer(page);

        const domData = await scanDOM(page, { textPatterns: VERSION_PATTERNS });

        // Scan script URLs for version params
        const versionedScripts = domData.scripts.filter(
            (s) => /[?&](v|version|build|hash)=/.test(s) || /\.\w{6,}\.js/.test(s)
        );

        const findings = [
            `Page title: ${domData.title}`,
            '',
            `Meta tags (${domData.meta.length}):`,
            ...domData.meta.map((m) => `  ${m.name}: ${m.content}`),
            '',
            `Script sources (${domData.scripts.length} total, ${versionedScripts.length} with version params):`,
            ...versionedScripts.map((s) => `  ${s}`),
            ...(versionedScripts.length === 0 ? domData.scripts.slice(0, 10).map((s) => `  ${s}`) : []),
            '',
            `Data attributes on html/body:`,
            ...(Object.keys(domData.dataAttrs).length > 0
                ? Object.entries(domData.dataAttrs).map(([k, v]) => `  ${k} = ${v}`)
                : ['  (none)']),
            '',
            `Text pattern matches (${domData.textMatches.length}):`,
            ...domData.textMatches.map((m) => `  "${m.text}" in ${m.selector} (pattern: ${m.pattern})`),
        ];

        const report = formatReport('PROBE 4: DOM Scan', [{ name: 'Page Analysis', findings }]);
        console.log(report);

        await testInfo.attach('probe-4-dom-scan', {
            body: JSON.stringify(domData, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 5: FormViewer build number capture', async ({ page }, testInfo) => {
        await gotoFormViewer(page);

        // Search for build number pattern in all visible text
        const buildInfo = await page.evaluate(() => {
            const pattern = /\d{8}\.\d+/;
            const matches = [];

            // Method 1: Walk all text nodes
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
                const text = walker.currentNode.textContent.trim();
                const match = text.match(pattern);
                if (match) {
                    const parent = walker.currentNode.parentElement;
                    const rect = parent?.getBoundingClientRect();
                    matches.push({
                        text: match[0],
                        fullText: text.substring(0, 100),
                        tag: parent?.tagName,
                        id: parent?.id || null,
                        className: parent?.className || null,
                        position: rect ? { top: rect.top, right: rect.right, left: rect.left } : null,
                    });
                }
            }

            // Method 2: Check common version element selectors
            const selectors = [
                '.build-number',
                '#buildNumber',
                '[class*="build"]',
                '[class*="version"]',
                '[id*="build"]',
                '[id*="version"]',
                '.app-version',
                'footer',
                '.footer',
                '.navbar-text',
            ];

            const selectorMatches = [];
            for (const sel of selectors) {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    selectorMatches.push({
                        selector: sel,
                        text: el.textContent.trim().substring(0, 100),
                        tag: el.tagName,
                        id: el.id || null,
                    });
                }
            }

            return { textMatches: matches, selectorMatches };
        });

        // Take screenshot of the top area where build number is known to appear
        const screenshot = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 80 } });

        const findings = [
            `Build number text matches: ${buildInfo.textMatches.length}`,
            ...buildInfo.textMatches.map(
                (m) =>
                    `  "${m.text}" in <${m.tag}> id="${m.id}" class="${m.className}" pos=(top:${m.position?.top}, left:${m.position?.left})`
            ),
            '',
            `Selector matches: ${buildInfo.selectorMatches.length}`,
            ...buildInfo.selectorMatches.map((m) => `  ${m.selector} → <${m.tag}> id="${m.id}" text="${m.text}"`),
        ];

        const report = formatReport('PROBE 5: FormViewer Build Number', [{ name: 'Build Number Search', findings }]);
        console.log(report);

        await testInfo.attach('probe-5-build-number', {
            body: JSON.stringify(buildInfo, null, 2),
            contentType: 'application/json',
        });
        await testInfo.attach('probe-5-header-screenshot', {
            body: screenshot,
            contentType: 'image/png',
        });
    });

    test('Probe 6: Admin pages inspection', async ({ page }, testInfo) => {
        const pages = [
            { name: 'FormDataAdmin', path: adminUrl('FormDataAdmin') },
            { name: 'FormTemplateAdmin', path: adminUrl('FormTemplateAdmin') },
            { name: 'OutsideProcessAdmin', path: adminUrl('outsideprocessadmin') },
            { name: 'SchedulerAdmin', path: adminUrl('scheduleradmin') },
        ];

        const allFindings = [];

        for (const adminPage of pages) {
            try {
                await page.goto(adminPage.path, { timeout: 30000 });
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

                const domData = await scanDOM(page, { textPatterns: VERSION_PATTERNS });

                const pageFindings = [];
                if (domData.textMatches.length > 0) {
                    pageFindings.push(...domData.textMatches.map((m) => `  Text: "${m.text}" in ${m.selector}`));
                }
                if (domData.dataAttrs && Object.keys(domData.dataAttrs).length > 0) {
                    pageFindings.push(...Object.entries(domData.dataAttrs).map(([k, v]) => `  Data attr: ${k}=${v}`));
                }

                // Check for About/Help links
                const aboutLinks = await page.evaluate(() => {
                    const links = [...document.querySelectorAll('a, button')];
                    return links
                        .filter((el) => /about|help|info|version/i.test(el.textContent + el.getAttribute('href')))
                        .map((el) => ({
                            text: el.textContent.trim().substring(0, 50),
                            href: el.getAttribute('href'),
                            tag: el.tagName,
                        }));
                });

                if (aboutLinks.length > 0) {
                    pageFindings.push(...aboutLinks.map((l) => `  Link: "${l.text}" → ${l.href}`));
                }

                allFindings.push({
                    name: adminPage.name,
                    findings: pageFindings.length > 0 ? pageFindings : ['  (no version/build info found)'],
                });
            } catch (e) {
                allFindings.push({
                    name: `${adminPage.name} (error)`,
                    findings: [`  ${e.message}`],
                });
            }
        }

        const report = formatReport('PROBE 6: Admin Pages', allFindings);
        console.log(report);

        await testInfo.attach('probe-6-admin-pages', {
            body: JSON.stringify(allFindings, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 7: Speculative API endpoints', async ({ request }, testInfo) => {
        const token = await getApiToken(request);

        const endpoints = [
            `${BASE_URL}/api`,
            `${BASE_URL}/api/v1`,
            `${BASE_URL}/api/health`,
            `${BASE_URL}/api/version`,
            `${BASE_URL}/api/info`,
            `${BASE_URL}/api/v1/health`,
            `${BASE_URL}/api/v1/version`,
            `${BASE_URL}/api/v1/${CUSTOMER}/${DATABASE}`,
            `${BASE_URL}/api/v1/${CUSTOMER}/${DATABASE}/version`,
            `${BASE_URL}/swagger`,
            `${BASE_URL}/swagger/index.html`,
            `${BASE_URL}/swagger/v1/swagger.json`,
            `${BASE_URL}/_framework/blazor.boot.json`,
            `${BASE_URL}/health`,
            `${BASE_URL}/version`,
            `${BASE_URL}/info`,
        ];

        const results = await probeEndpoints(request, endpoints, { token, maxBodySize: 3000 });

        const findings = [];
        for (const r of results) {
            const shortUrl = r.url.replace(BASE_URL, '');
            if (r.status === 'error') {
                findings.push(`[${shortUrl}] ERROR: ${r.error}`);
            } else {
                const marker = r.status >= 200 && r.status < 300 ? '✓' : '✗';
                findings.push(`${marker} [${shortUrl}] ${r.status} (${r.contentType})`);
                if (r.status >= 200 && r.status < 300 && r.body) {
                    // Show body preview for successful responses
                    findings.push(`  Body: ${r.body.substring(0, 200)}`);

                    // Scan for version patterns
                    for (const pattern of VERSION_PATTERNS) {
                        const matches = r.body.match(new RegExp(pattern.source, 'g'));
                        if (matches) {
                            findings.push(`  Version matches: ${matches.join(', ')}`);
                        }
                    }
                }
            }
        }

        const report = formatReport('PROBE 7: Speculative API Endpoints', [{ name: 'Endpoint Discovery', findings }]);
        console.log(report);

        await testInfo.attach('probe-7-speculative-endpoints', {
            body: JSON.stringify(results, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 8: Per-service direct probing', async ({ request }, testInfo) => {
        const token = await getApiToken(request);

        // Extract service base URLs from Probe 2 config responses
        const serviceUrls = {};

        if (configApiResponses) {
            for (const r of configApiResponses) {
                if (r.status !== 200 || !r.body) continue;
                try {
                    const data = JSON.parse(r.body);
                    // Config endpoints return { data: { apiUrl: '...' } } or { data: { formsApiUrl: '...' } }
                    const payload = data.data || data;
                    for (const [key, value] of Object.entries(payload)) {
                        if (typeof value === 'string' && value.startsWith('http')) {
                            const component = r.url.split('/configuration/')[1] || key;
                            serviceUrls[component] = value;
                        }
                    }
                } catch {
                    // not JSON
                }
            }
        }

        if (Object.keys(serviceUrls).length === 0) {
            console.log('PROBE 8: No service URLs extracted from Probe 2. Skipping.');
            await testInfo.attach('probe-8-per-service', {
                body: JSON.stringify({ skipped: true, reason: 'No service URLs from Probe 2' }),
                contentType: 'application/json',
            });
            return;
        }

        const allResults = {};
        const findings = [`Discovered ${Object.keys(serviceUrls).length} service URLs:`];

        for (const [component, baseUrl] of Object.entries(serviceUrls)) {
            findings.push(`  ${component}: ${baseUrl}`);

            // Probe each service's root + common info endpoints
            const probePaths = [baseUrl, `${baseUrl}/version`, `${baseUrl}/health`, `${baseUrl}/info`];

            const results = await probeEndpoints(request, probePaths, { token, timeout: 10000, maxBodySize: 3000 });
            allResults[component] = results;

            findings.push('');
            for (const r of results) {
                const shortUrl = r.url.replace(baseUrl, '') || '/';
                if (r.status === 'error') {
                    findings.push(`  [${component}${shortUrl}] ERROR: ${r.error}`);
                } else {
                    findings.push(`  [${component}${shortUrl}] ${r.status}`);
                    // Show version headers
                    if (r.headers) {
                        for (const [name, value] of Object.entries(r.headers)) {
                            if (/version|build|server|powered/i.test(name)) {
                                findings.push(`    ${name}: ${value}`);
                            }
                        }
                    }
                    if (r.status >= 200 && r.status < 300 && r.body) {
                        findings.push(`    Body: ${r.body.substring(0, 150)}`);
                    }
                }
            }
        }

        const report = formatReport('PROBE 8: Per-Service Direct Probing', [{ name: 'Service Results', findings }]);
        console.log(report);

        await testInfo.attach('probe-8-per-service', {
            body: JSON.stringify({ serviceUrls, results: allResults }, null, 2),
            contentType: 'application/json',
        });
    });
});
