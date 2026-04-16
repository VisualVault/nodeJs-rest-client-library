/**
 * Unrelate Mechanism Discovery
 *
 * Investigates whether the VV platform supports URL-based form unrelating,
 * similar to how FillinAndRelateForm uses:
 *   form_details?formid={id}&RelateForm={parentId}&IsRelate=true
 *
 * Probes:
 *   1. Enumerate VV.Form and VV.Form.Global for any unrelate methods
 *   2. Create two forms, relate them via API
 *   3. Try URL parameter variations to trigger a platform-level unrelate
 *   4. Verify relationship state after each attempt
 *
 * Run:
 *   npx playwright test tools/explore/specs/unrelate-discovery.spec.js --config tools/explore/playwright.explore.config.js
 *   npx playwright test tools/explore/specs/unrelate-discovery.spec.js --config tools/explore/playwright.explore.config.js --headed
 */
const { test, expect } = require('@playwright/test');
const { loadConfig } = require('../../../testing/fixtures/env-config');

const config = loadConfig();
const BASE_URL = config.baseUrl;
const CUSTOMER = config.customerAlias;
const DATABASE = config.databaseAlias;
const API_BASE = `${BASE_URL}/api/v1/${CUSTOMER}/${DATABASE}`;

// DateTest template on EmanuelJofre
const TEMPLATE_ID = '6be0265c-152a-f111-ba23-0afff212cc87';
const FORM_URL_BASE =
    '/FormViewer/app?hidemenu=true' +
    `&formid=${TEMPLATE_ID}` +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

let apiToken = null;

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
    if (!resp.ok()) throw new Error(`OAuth failed: ${resp.status()}`);
    const data = await resp.json();
    apiToken = data.access_token;
    return apiToken;
}

async function apiGet(request, path) {
    const token = await getApiToken(request);
    const resp = await request.get(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return resp.json();
}

async function apiPut(request, path) {
    const token = await getApiToken(request);
    const resp = await request.put(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return resp.json();
}

async function apiPost(request, path, data) {
    const token = await getApiToken(request);
    const resp = await request.post(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data,
    });
    return resp.json();
}

async function getRelatedForms(request, formId) {
    const json = await apiGet(request, `/forminstance/${formId}/forms`);
    return json.data || [];
}

test.describe.configure({ mode: 'serial' });

test.describe('Unrelate Mechanism Discovery', () => {
    let formAId, formBId;

    test('Probe 1: Enumerate VV.Form namespace for unrelate methods', async ({ page }, testInfo) => {
        // Load any form to get the VV namespace
        await page.goto(FORM_URL_BASE, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV, { timeout: 30000 });

        const discovery = await page.evaluate(() => {
            const results = {
                vvFormMethods: [],
                vvFormGlobalMethods: [],
                vvFormPropsWithUnrelate: [],
                vvFormGlobalPropsWithRelate: [],
                vvFormAllProps: [],
                vvNamespaceSearch: [],
            };

            // All VV.Form methods/properties
            if (typeof VV !== 'undefined' && VV.Form) {
                for (const key in VV.Form) {
                    const type = typeof VV.Form[key];
                    results.vvFormAllProps.push({ key, type });
                    if (type === 'function') {
                        results.vvFormMethods.push(key);
                    }
                    // Look for anything with "relate" or "unrelate" in the name
                    if (key.toLowerCase().includes('relat') || key.toLowerCase().includes('unrelat')) {
                        results.vvFormPropsWithUnrelate.push({
                            key,
                            type,
                            value: type === 'function' ? '[function]' : String(VV.Form[key]).substring(0, 200),
                        });
                    }
                }
            }

            // All VV.Form.Global methods
            if (VV.Form.Global) {
                for (const key in VV.Form.Global) {
                    const type = typeof VV.Form.Global[key];
                    if (type === 'function') {
                        results.vvFormGlobalMethods.push(key);
                    }
                    if (key.toLowerCase().includes('relat')) {
                        results.vvFormGlobalPropsWithRelate.push({ key, type });
                    }
                }
            }

            // Deep search: look for "unrelate" anywhere in VV namespace
            function searchObj(obj, path, depth) {
                if (depth > 3 || !obj) return;
                try {
                    for (const key in obj) {
                        if (key.toLowerCase().includes('unrelat') || key.toLowerCase().includes('unrelate')) {
                            results.vvNamespaceSearch.push({ path: path + '.' + key, type: typeof obj[key] });
                        }
                        if (depth < 2 && typeof obj[key] === 'object' && obj[key] !== null && obj[key] !== obj) {
                            searchObj(obj[key], path + '.' + key, depth + 1);
                        }
                    }
                } catch (e) {
                    /* skip inaccessible */
                }
                return undefined;
            }
            searchObj(VV, 'VV', 0);

            return results;
        });

        console.log('\n=== VV.Form Methods ===');
        console.log(discovery.vvFormMethods.sort().join('\n'));

        console.log('\n=== VV.Form.Global Methods ===');
        console.log(discovery.vvFormGlobalMethods.sort().join('\n'));

        console.log('\n=== Properties containing "relat" in VV.Form ===');
        console.log(JSON.stringify(discovery.vvFormPropsWithUnrelate, null, 2));

        console.log('\n=== Properties containing "relat" in VV.Form.Global ===');
        console.log(JSON.stringify(discovery.vvFormGlobalPropsWithRelate, null, 2));

        console.log('\n=== Deep search for "unrelat" in VV namespace ===');
        console.log(JSON.stringify(discovery.vvNamespaceSearch, null, 2));

        testInfo.attach('vv-namespace-discovery', {
            body: JSON.stringify(discovery, null, 2),
            contentType: 'application/json',
        });
    });

    test('Setup: Create two forms and relate them via API', async ({ request }, testInfo) => {
        // Create Form A
        const resA = await apiPost(request, `/formtemplates/${TEMPLATE_ID}/forms`, {});
        formAId = resA.data?.revisionId;
        expect(formAId).toBeTruthy();
        console.log(`Form A: ${resA.data?.instanceName} (${formAId})`);

        // Create Form B
        const resB = await apiPost(request, `/formtemplates/${TEMPLATE_ID}/forms`, {});
        formBId = resB.data?.revisionId;
        expect(formBId).toBeTruthy();
        console.log(`Form B: ${resB.data?.instanceName} (${formBId})`);

        // Relate A → B
        const relateRes = await apiPut(request, `/forminstance/${formAId}/relateForm?relateToId=${formBId}`);
        expect(relateRes.meta?.status).toBe(200);
        console.log('Related A → B');

        // Verify
        const related = await getRelatedForms(request, formAId);
        expect(related.length).toBeGreaterThan(0);
        console.log(`Form A has ${related.length} related form(s)`);

        testInfo.attach('test-forms', {
            body: JSON.stringify({ formAId, formBId, related }, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 2: URL variations — navigate child form with unrelate params', async ({ page, request }, testInfo) => {
        expect(formAId).toBeTruthy();
        expect(formBId).toBeTruthy();

        // Build URL variations to test — modeled after the relate pattern:
        //   form_details?formid={templateId}&RelateForm={parentId}&IsRelate=true
        const formBUrl =
            `/FormViewer/app?DataID=${formBId}&hidemenu=true` +
            '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
            '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

        const urlVariations = [
            {
                name: 'IsRelate=false',
                url: `${formBUrl}&RelateForm=${formAId}&IsRelate=false`,
            },
            {
                name: 'IsUnrelate=true',
                url: `${formBUrl}&UnRelateForm=${formAId}&IsUnrelate=true`,
            },
            {
                name: 'UnRelateForm param only',
                url: `${formBUrl}&UnRelateForm=${formAId}`,
            },
            {
                name: 'IsRelate=false on form_details',
                url:
                    `/form_details?DataID=${formBId}&RelateForm=${formAId}&IsRelate=false&hidemenu=true` +
                    `&xcid=${CUSTOMER}&xcdid=${DATABASE}`,
            },
            {
                name: 'UnRelateForm on form_details',
                url:
                    `/form_details?DataID=${formBId}&UnRelateForm=${formAId}&IsUnrelate=true&hidemenu=true` +
                    `&xcid=${CUSTOMER}&xcdid=${DATABASE}`,
            },
        ];

        const results = [];

        for (const variation of urlVariations) {
            console.log(`\n--- Testing: ${variation.name} ---`);
            console.log(`URL: ${variation.url}`);

            // Re-relate before each test to ensure consistent state
            await apiPut(request, `/forminstance/${formAId}/relateForm?relateToId=${formBId}`);
            const beforeRelated = await getRelatedForms(request, formAId);
            const beforeCount = beforeRelated.length;

            // Navigate
            let pageError = null;
            let pageTitle = null;
            let pageUrl = null;
            let networkResponses = [];

            page.on('response', (resp) => {
                if (resp.url().toLowerCase().includes('unrelate') || resp.url().toLowerCase().includes('relateform')) {
                    networkResponses.push({
                        url: resp.url(),
                        status: resp.status(),
                        method: resp.request().method(),
                    });
                }
            });

            try {
                await page.goto(variation.url, { waitUntil: 'networkidle', timeout: 30000 });
                pageTitle = await page.title();
                pageUrl = page.url();
            } catch (err) {
                pageError = err.message;
            }

            // Check if relationship still exists
            const afterRelated = await getRelatedForms(request, formAId);
            const afterCount = afterRelated.length;
            const unrelateHappened = afterCount < beforeCount;

            const result = {
                name: variation.name,
                url: variation.url,
                beforeCount,
                afterCount,
                unrelateHappened,
                pageTitle,
                pageUrl,
                pageError,
                networkResponses,
            };
            results.push(result);

            console.log(`Before: ${beforeCount} related | After: ${afterCount} related`);
            console.log(`Unrelate happened: ${unrelateHappened ? 'YES' : 'NO'}`);
            if (networkResponses.length > 0) {
                console.log('Relate/Unrelate network calls:', JSON.stringify(networkResponses, null, 2));
            }
            if (pageError) {
                console.log(`Page error: ${pageError}`);
            }
        }

        console.log('\n\n=== SUMMARY ===');
        for (const r of results) {
            const icon = r.unrelateHappened ? '\u2705' : '\u274C';
            console.log(
                `${icon} ${r.name}: ${r.unrelateHappened ? 'UNRELATED' : 'no effect'} (${r.beforeCount} → ${r.afterCount})`
            );
        }

        testInfo.attach('url-variation-results', {
            body: JSON.stringify(results, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 3: Check form_details endpoint URL params via network', async ({ page, request }, testInfo) => {
        expect(formAId).toBeTruthy();
        expect(formBId).toBeTruthy();

        // Ensure related
        await apiPut(request, `/forminstance/${formAId}/relateForm?relateToId=${formBId}`);

        // Navigate to form_details (the endpoint FillinAndRelateForm uses) with relate params
        // and capture ALL network requests to understand what the platform does internally
        const allRequests = [];
        page.on('request', (req) => {
            const url = req.url().toLowerCase();
            if (url.includes('relate') || url.includes('forminstance')) {
                allRequests.push({
                    method: req.method(),
                    url: req.url(),
                });
            }
        });

        // First: observe what happens with the RELATE flow (known working)
        const relateUrl =
            `/form_details?formid=${TEMPLATE_ID}&RelateForm=${formAId}&IsRelate=true&hidemenu=true` +
            `&xcid=${CUSTOMER}&xcdid=${DATABASE}`;

        console.log('\n--- Observing standard relate flow ---');
        console.log(`URL: ${relateUrl}`);

        try {
            await page.goto(relateUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(3000); // Extra time for async calls
        } catch (err) {
            console.log(`Navigation error: ${err.message}`);
        }

        console.log(`\nNetwork requests involving "relate" or "forminstance":`);
        for (const req of allRequests) {
            console.log(`  ${req.method} ${req.url}`);
        }

        // Check if the page exposes relate-related state
        const pageState = await page
            .evaluate(() => {
                const state = {};
                try {
                    if (typeof VV !== 'undefined') {
                        // Check URL params the form sees
                        state.urlParams = Object.fromEntries(new URLSearchParams(window.location.search));
                        // Check if there's a relate state
                        if (VV.Form) {
                            state.DataID = VV.Form.DataID;
                            state.IsRelate = VV.Form.IsRelate;
                            state.RelateForm = VV.Form.RelateForm;
                            // Search for any relate-related properties
                            state.relateProps = {};
                            for (const key in VV.Form) {
                                if (key.toLowerCase().includes('relat')) {
                                    const val = VV.Form[key];
                                    state.relateProps[key] = typeof val === 'function' ? '[function]' : val;
                                }
                            }
                            if (VV.Form.VV) {
                                for (const key in VV.Form.VV) {
                                    if (key.toLowerCase().includes('relat')) {
                                        const val = VV.Form.VV[key];
                                        state.relateProps['VV.' + key] = typeof val === 'function' ? '[function]' : val;
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    state.error = e.message;
                }
                return state;
            })
            .catch(() => ({ error: 'evaluate failed' }));

        console.log('\nPage state:', JSON.stringify(pageState, null, 2));

        testInfo.attach('relate-flow-network', {
            body: JSON.stringify({ relateUrl, requests: allRequests, pageState }, null, 2),
            contentType: 'application/json',
        });
    });

    test('Cleanup: Unrelate test forms via API', async ({ request }) => {
        if (formAId && formBId) {
            await apiPut(request, `/forminstance/${formAId}/unrelateForm?relateToId=${formBId}`);
            console.log('Cleaned up: unrelated A ↔ B');
        }
    });
});
