/**
 * Investigation phase 9: intercept FormViewer API calls.
 *
 * FormViewer successfully renders templates that ExportForm can't export.
 * It must be loading template data from a different API. Capture all
 * network requests when FormViewer loads a form from a failing template
 * to find that alternative data source.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const vvAdmin = require('../helpers/vv-admin');
const vvTemplates = require('../helpers/vv-templates');

const match = vvAdmin.findCustomer('wadnr');
const config = vvAdmin.loadEnvConfig(match.server, match.customer);
const baseApi = `${config.baseUrl}/api/v1/${config.customerAlias}/${config.databaseAlias}`;

const outputDir = path.join(__dirname, '..', '..', 'projects', 'wadnr', 'analysis');
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
    const allTemplates = await vvTemplates.getTemplates(config, { excludePrefix: null });
    const templateMap = new Map(allTemplates.map((t) => [t.name, t]));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Logging in...');
    await vvAdmin.login(page, config);
    console.log('Logged in.\n');

    async function apiFetch(url) {
        return page.evaluate(async (u) => {
            try {
                const r = await fetch(u, { credentials: 'include' });
                if (!r.ok) return { _error: `${r.status} ${r.statusText}` };
                const text = await r.text();
                try {
                    return JSON.parse(text);
                } catch {
                    return { _raw: text.substring(0, 2000) };
                }
            } catch (e) {
                return { _error: e.message };
            }
        }, url);
    }

    // ── Get a form instance for "Note" (failing template) ──
    const noteTmpl = templateMap.get('Note');
    const formsResp = await apiFetch(`${baseApi}/formtemplates/${noteTmpl.id}/forms?limit=1`);
    const noteFormId = formsResp?.data?.[0]?.revisionId || formsResp?.data?.[0]?.id;

    console.log(`Note template: id=${noteTmpl.id}, revisionId=${noteTmpl.revisionId}`);
    console.log(`Note form instance: ${noteFormId}\n`);

    // ── Test 1: Intercept ALL FormViewer API calls ──
    console.log('='.repeat(70));
    console.log('TEST 1: FormViewer network requests for "Note" form instance');
    console.log('='.repeat(70));

    const viewerPage = await context.newPage();
    const apiCalls = [];

    viewerPage.on('response', async (response) => {
        const url = response.url();
        const status = response.status();
        const contentType = response.headers()['content-type'] || '';

        // Only track API-like calls, not static assets
        if (
            url.includes('/api/') ||
            url.includes('formdesigner') ||
            url.includes('FormViewer') ||
            url.includes('/forms/') ||
            url.includes('template') ||
            url.includes('formdata') ||
            contentType.includes('json') ||
            contentType.includes('xml')
        ) {
            let bodyPreview;
            try {
                const body = await response.text();
                bodyPreview = body.substring(0, 300);
            } catch {
                bodyPreview = '(could not read body)';
            }

            apiCalls.push({
                url: url.substring(0, 200),
                status,
                contentType,
                bodyPreview,
                size: bodyPreview.length,
            });
        }
    });

    const viewUrl = `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/FormViewer?FormID=${noteFormId}`;
    console.log(`\nOpening FormViewer: ${viewUrl}`);

    await viewerPage.goto(viewUrl, { waitUntil: 'networkidle', timeout: 60000 });
    console.log(`Final URL: ${viewerPage.url()}`);
    console.log(`Title: ${await viewerPage.title()}`);

    // Wait a bit more for lazy-loaded resources
    await viewerPage.waitForTimeout(5000);

    console.log(`\nCaptured ${apiCalls.length} API/data calls:`);
    for (let i = 0; i < apiCalls.length; i++) {
        const call = apiCalls[i];
        console.log(`\n  [${i}] HTTP ${call.status} | ${call.contentType}`);
        console.log(`       ${call.url}`);

        // Show body preview for interesting calls
        if (call.bodyPreview && !call.url.includes('.js') && !call.url.includes('.css')) {
            const preview = call.bodyPreview.replace(/\s+/g, ' ').substring(0, 200);
            console.log(`       Body: ${preview}`);
        }
    }

    // ── Test 2: Look for specific FormViewer API patterns ──
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('TEST 2: Filter for form data / template definition API calls');
    console.log('='.repeat(70));

    const dataCalls = apiCalls.filter(
        (c) =>
            c.bodyPreview.length > 100 &&
            !c.url.includes('.js') &&
            !c.url.includes('.css') &&
            !c.url.includes('.png') &&
            !c.url.includes('bundles')
    );

    console.log(`\n${dataCalls.length} data calls (body > 100 chars):`);
    for (const call of dataCalls) {
        console.log(`\n  HTTP ${call.status} | ${call.contentType} | ${call.bodyPreview.length} chars`);
        console.log(`  ${call.url}`);

        // Check if body contains XML or template-like data
        const body = call.bodyPreview;
        if (body.includes('<?xml') || body.includes('<Form') || body.includes('<form')) {
            console.log(`  >>> CONTAINS XML DATA`);
        }
        if (body.includes('formField') || body.includes('fieldList') || body.includes('templateId')) {
            console.log(`  >>> CONTAINS TEMPLATE/FIELD DATA`);
        }

        // Save large responses to files for inspection
        if (body.length > 200) {
            console.log(`  Body preview: ${body.replace(/\s+/g, ' ').substring(0, 300)}`);
        }
    }

    await viewerPage.close();

    // ── Test 3: Try the FormViewer API endpoints directly ──
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('TEST 3: Direct API calls to FormViewer data endpoints');
    console.log('='.repeat(70));

    // Extract API patterns from the captured calls
    const apiPatterns = apiCalls
        .filter((c) => c.url.includes('/api/'))
        .map((c) => {
            // Generalize the URL by replacing GUIDs with placeholders
            return c.url
                .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{guid}')
                .replace(/xcid=[^&]+/, 'xcid={guid}')
                .replace(/xcdid=[^&]+/, 'xcdid={guid}');
        });

    console.log('\nAPI URL patterns discovered:');
    const uniquePatterns = [...new Set(apiPatterns)];
    for (const p of uniquePatterns) {
        console.log(`  ${p}`);
    }

    // ── Test 4: Try to fetch form data JSON directly ──
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('TEST 4: FormViewer form data API — direct access');
    console.log('='.repeat(70));

    // The FormViewer SPA likely uses a specific API to get form data
    // Try common patterns
    const formDataEndpoints = [
        `${baseApi}/forms/${noteFormId}`,
        `${baseApi}/forms/${noteFormId}?expand=fields`,
        `${baseApi}/formtemplates/${noteTmpl.id}/forms/${noteFormId}`,
    ];

    for (const ep of formDataEndpoints) {
        const resp = await apiFetch(ep);
        if (resp._error) {
            console.log(`  ${ep.split(baseApi)[1]}: ${resp._error}`);
        } else if (resp._raw) {
            console.log(`  ${ep.split(baseApi)[1]}: ${resp._raw.substring(0, 200)}`);
        } else {
            const data = resp.data || resp;
            if (Array.isArray(data)) {
                console.log(`  ${ep.split(baseApi)[1]}: [${data.length} items]`);
                if (data.length > 0) {
                    console.log(`    Keys: ${Object.keys(data[0]).join(', ')}`);
                }
            } else if (typeof data === 'object') {
                console.log(`  ${ep.split(baseApi)[1]}: ${JSON.stringify(data).substring(0, 200)}`);
            }
        }
    }

    // ── Test 5: Check if there's an API v2 or FormViewer API ──
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('TEST 5: Alternative API versions');
    console.log('='.repeat(70));

    // FormViewer might use a different API version
    const altApis = [
        `${config.baseUrl}/FormViewer/api/formtemplates/${noteTmpl.id}`,
        `${config.baseUrl}/FormViewer/api/forms/${noteFormId}`,
        `${config.baseUrl}/api/v2/${config.customerAlias}/${config.databaseAlias}/formtemplates/${noteTmpl.id}`,
        `${config.baseUrl}/FormViewerApi/forms/${noteFormId}`,
    ];

    for (const ep of altApis) {
        const resp = await apiFetch(ep);
        const result =
            resp._error || (resp._raw ? resp._raw.substring(0, 100) : JSON.stringify(resp).substring(0, 200));
        console.log(`  ${ep.replace(config.baseUrl, '')}: ${result}`);
    }

    await browser.close();
    console.log('\nDone.');
})();
