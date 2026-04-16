/**
 * FormViewer JS Source Discovery
 *
 * Downloads the FormViewer Angular SPA's JavaScript bundles and searches
 * for relate/unrelate URL parameter handling to understand what the platform
 * supports at the source level.
 *
 * Run:
 *   npx playwright test tools/explore/specs/formviewer-js-discovery.spec.js --config tools/explore/playwright.explore.config.js
 */
const { test } = require('@playwright/test');
const { loadConfig } = require('../../../testing/fixtures/env-config');
const fs = require('fs');
const path = require('path');

const config = loadConfig();
const BASE_URL = config.baseUrl;
const TEMPLATE_ID = '6be0265c-152a-f111-ba23-0afff212cc87';
const FORM_URL_BASE =
    '/FormViewer/app?hidemenu=true' +
    `&formid=${TEMPLATE_ID}` +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'research', 'unrelate-forms', 'analysis');

test.describe.configure({ mode: 'serial' });

test.describe('FormViewer JS Source Discovery', () => {
    test('Capture and search FormViewer JS bundles for relate/unrelate handling', async ({ page }, testInfo) => {
        // Collect all JS files loaded by the FormViewer
        const jsFiles = [];

        page.on('response', async (response) => {
            const url = response.url();
            if (url.endsWith('.js') || url.includes('.js?')) {
                const contentType = response.headers()['content-type'] || '';
                if (contentType.includes('javascript') || url.endsWith('.js')) {
                    try {
                        const body = await response.text();
                        jsFiles.push({ url, size: body.length, body });
                    } catch (e) {
                        jsFiles.push({ url, size: 0, error: e.message });
                    }
                }
            }
        });

        // Load a form to trigger all JS bundle downloads
        await page.goto(FORM_URL_BASE, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV, { timeout: 30000 });

        console.log(`\nCaptured ${jsFiles.length} JS files\n`);

        // Search all JS source for relate-related keywords
        const searchTerms = [
            'IsRelate',
            'RelateForm',
            'UnRelate',
            'unrelate',
            'UnrelateForm',
            'relateForm',
            'relateToId',
            'IsUnrelate',
            'form_details',
        ];

        const findings = [];

        for (const file of jsFiles) {
            if (!file.body) continue;

            for (const term of searchTerms) {
                // Find all occurrences with surrounding context
                let idx = 0;
                while (true) {
                    idx = file.body.indexOf(term, idx);
                    if (idx === -1) break;

                    // Extract ~150 chars of context around the match
                    const start = Math.max(0, idx - 80);
                    const end = Math.min(file.body.length, idx + term.length + 80);
                    const context = file.body.substring(start, end).replace(/\s+/g, ' ');

                    findings.push({
                        file: file.url.split('/').pop().split('?')[0],
                        term,
                        position: idx,
                        context,
                    });

                    idx += term.length;
                }
            }
        }

        // Deduplicate by context
        const seen = new Set();
        const uniqueFindings = findings.filter((f) => {
            const key = f.context;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        console.log(`Found ${uniqueFindings.length} unique matches across all JS files:\n`);

        // Group by file
        const byFile = {};
        for (const f of uniqueFindings) {
            if (!byFile[f.file]) byFile[f.file] = [];
            byFile[f.file].push(f);
        }

        for (const [file, matches] of Object.entries(byFile)) {
            console.log(`\n=== ${file} (${matches.length} matches) ===`);
            for (const m of matches) {
                console.log(`  [${m.term}] @${m.position}: ...${m.context}...`);
            }
        }

        // Save the larger JS files that contain relate logic for deeper analysis
        const relateFiles = jsFiles.filter(
            (f) =>
                f.body &&
                (f.body.includes('IsRelate') || f.body.includes('RelateForm') || f.body.includes('relateForm'))
        );

        console.log(`\n\n=== JS files containing relate logic: ${relateFiles.length} ===`);
        for (const f of relateFiles) {
            const name = f.url.split('/').pop().split('?')[0];
            console.log(`  ${name} (${(f.size / 1024).toFixed(1)} KB)`);

            // Save to analysis folder for manual inspection
            const outPath = path.join(OUTPUT_DIR, `js-source-${name}`);
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
            fs.writeFileSync(outPath, f.body, 'utf8');
            console.log(`  → saved to ${outPath}`);
        }

        testInfo.attach('js-relate-findings', {
            body: JSON.stringify({ uniqueFindings, relateFileNames: relateFiles.map((f) => f.url) }, null, 2),
            contentType: 'application/json',
        });
    });
});
