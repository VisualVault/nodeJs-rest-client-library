/**
 * Extract WADNR global functions (VV.Form.Global.*) via Playwright.
 *
 * Opens an existing WADNR form record in FormViewer to load the Angular SPA,
 * then extracts every VV.Form.Global function's source via .toString() and
 * saves each as an individual .js file.
 *
 * Usage:
 *   node tools/extract/extract-globals.js [--dry-run] [--headless]
 *   node tools/extract/extract-globals.js --xcid <guid> --xcdid <guid>
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// --- Config ---

const ENV_JSON_PATH = path.resolve(__dirname, '..', '..', '.env.json');
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'projects', 'wadnr', 'extracts', 'global-functions');

function loadWadnrConfig() {
    const raw = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    const server = raw.servers && raw.servers['vv5dev'];
    if (!server) throw new Error('No "vv5dev" server in .env.json');
    const wadnr = server.customers && server.customers['WADNR'];
    if (!wadnr) throw new Error('No "WADNR" customer under vv5dev in .env.json');
    return {
        baseUrl: server.baseUrl,
        username: wadnr.username,
        password: wadnr.loginPassword,
        customerAlias: wadnr.customerAlias,
        databaseAlias: wadnr.databaseAlias,
    };
}

// --- CLI args ---

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const HEADLESS = args.includes('--headless');

function getArgValue(flag) {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const CLI_XCID = getArgValue('--xcid');
const CLI_XCDID = getArgValue('--xcdid');

// --- Helpers ---

async function login(page, config) {
    console.log('Logging in to vv5dev...');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    if (page.url().includes('/app/') || page.url().includes('/VVPortalUI/')) {
        console.log('Already logged in.');
        return;
    }

    await page.getByRole('textbox', { name: 'User Name' }).fill(config.username);
    await page.getByRole('textbox', { name: 'Password' }).fill(config.password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForFunction(
        () => document.location.pathname !== '/' && !document.location.pathname.includes('login'),
        { timeout: 15000 }
    );
    console.log('Login OK:', page.url());
}

/**
 * Navigate to the dashboard list, click the first dashboard, and extract
 * a DataID + xcid/xcdid from the grid.
 *
 * The /formdata page is itself a Telerik RadGrid listing all form dashboards.
 * Each row has the dashboard name as a clickable link. Clicking navigates to
 * the dashboard detail view (FormDataDetails?Mode=ReadOnly&ReportID=...).
 */
async function discoverFormRecord(page, config) {
    const dashUrl = `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/formdata`;
    console.log(`Navigating to dashboard list: ${dashUrl}`);
    await page.goto(dashUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for the dashboard list grid to load
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    // Collect dashboard links from the page — could be in the grid rows,
    // nav menu, or as rmLink elements. Also check for direct links anywhere.
    const dashboardLinks = await page.evaluate(() => {
        // Strategy 1: Find all FormDataDetails links anywhere on the page
        const allLinks = document.querySelectorAll('a[href*="FormDataDetails"]');
        const results = [];
        const seen = new Set();
        for (const a of allLinks) {
            const href = a.getAttribute('href') || '';
            if (seen.has(href)) continue;
            seen.add(href);
            results.push({
                text: a.textContent.trim(),
                href,
                className: a.className,
            });
        }

        // Strategy 2: Grid rows — check first row structure for debug
        const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
        const debugRows = [];
        for (let i = 0; i < Math.min(3, rows.length); i++) {
            const cells = Array.from(rows[i].querySelectorAll('td'));
            debugRows.push({
                cellCount: cells.length,
                firstCellHTML: cells[0] ? cells[0].innerHTML.substring(0, 200) : '',
                firstCellText: cells[0] ? cells[0].textContent.trim() : '',
                hasLinks: cells.map((c) => c.querySelectorAll('a').length),
            });
        }

        return { links: results, debugRows, totalGridRows: rows.length };
    });

    console.log(`Grid rows: ${dashboardLinks.totalGridRows}`);
    console.log(`FormDataDetails links found: ${dashboardLinks.links.length}`);
    if (dashboardLinks.debugRows.length > 0) {
        console.log('First row debug:', JSON.stringify(dashboardLinks.debugRows[0], null, 2));
    }

    if (dashboardLinks.links.length === 0) {
        throw new Error('No FormDataDetails links found on /formdata page');
    }

    // Filter to unique ReportIDs and prefer content links over nav menu links
    const contentLinks = dashboardLinks.links.filter((l) => !l.className.includes('rmLink'));
    const linksToTry = contentLinks.length > 0 ? contentLinks : dashboardLinks.links;

    console.log(`Trying ${linksToTry.length} dashboards...`);

    for (const dash of linksToTry) {
        console.log(`  Trying dashboard: "${dash.text}" (${dash.className})`);
        const fullUrl = new URL(dash.href, config.baseUrl).href;
        await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 60000 });

        // Wait for the RadGrid
        const hasGrid = await page.waitForSelector('.rgMasterTable', { timeout: 15000 }).catch(() => null);
        if (!hasGrid) {
            console.log('    No grid found, skipping...');
            continue;
        }

        // Try to extract a DataID from the first record
        const record = await page.evaluate(() => {
            const checkbox = document.querySelector('.rgMasterTable tbody input[type="checkbox"][dhid]');
            if (!checkbox) return null;
            return {
                dataId: checkbox.getAttribute('dhid'),
                docId: checkbox.getAttribute('dhdocid') || '',
            };
        });

        if (!record || !record.dataId) {
            console.log('    No records with dhid, skipping...');
            continue;
        }

        console.log(`  Found record: ${record.docId} (DataID: ${record.dataId})`);
        return record;
    }

    throw new Error('No dashboard had records with a DataID');
}

/**
 * Discover xcid/xcdid GUIDs from the dashboard page.
 * These internal customer/database GUIDs are needed for FormViewer URLs.
 */
async function discoverGuids(page) {
    // Strategy 1: Look for VV.OpenWindow() calls or FormViewer/FormDetails links
    // that contain xcid/xcdid parameters
    const guids = await page.evaluate(() => {
        // Check all links and onclick handlers on the page
        const allElements = document.querySelectorAll('a[href], [onclick]');
        for (const el of allElements) {
            const text = (el.getAttribute('href') || '') + (el.getAttribute('onclick') || '');
            const xcidMatch = text.match(/xcid=([a-f0-9-]+)/i);
            const xcdidMatch = text.match(/xcdid=([a-f0-9-]+)/i);
            if (xcidMatch && xcdidMatch) {
                return { xcid: xcidMatch[1], xcdid: xcdidMatch[1] };
            }
        }

        // Check inline scripts
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const src = script.textContent || '';
            const xcidMatch = src.match(
                /xcid['":\s]*=?\s*['"]?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
            );
            const xcdidMatch = src.match(
                /xcdid['":\s]*=?\s*['"]?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
            );
            if (xcidMatch && xcdidMatch) {
                return { xcid: xcidMatch[1], xcdid: xcdidMatch[1] };
            }
        }

        // Check hidden form fields
        const inputs = document.querySelectorAll('input[type="hidden"]');
        let xcid = null;
        let xcdid = null;
        for (const input of inputs) {
            const name = (input.name || '').toLowerCase();
            const val = input.value || '';
            if (name.includes('customerid') || name.includes('xcid')) xcid = val;
            if (name.includes('databaseid') || name.includes('xcdid')) xcdid = val;
        }
        if (xcid && xcdid) return { xcid, xcdid };

        return null;
    });

    if (guids) return guids;

    // Strategy 2: Click a record row and capture the popup URL
    console.log('  Trying record-click popup interception...');
    const popupPromise = page
        .context()
        .waitForEvent('page', { timeout: 10000 })
        .catch(() => null);

    // Click the first data row
    const clicked = await page.evaluate(() => {
        const row = document.querySelector('.rgMasterTable tbody tr.rgRow td');
        if (row) {
            row.click();
            return true;
        }
        return false;
    });

    if (clicked) {
        const popup = await popupPromise;
        if (popup) {
            const popupUrl = popup.url();
            console.log(`  Popup URL: ${popupUrl}`);
            const xcidMatch = popupUrl.match(/xcid=([a-f0-9-]+)/i);
            const xcdidMatch = popupUrl.match(/xcdid=([a-f0-9-]+)/i);
            await popup.close().catch(() => {});
            if (xcidMatch && xcdidMatch) {
                return { xcid: xcidMatch[1], xcdid: xcdidMatch[1] };
            }
        }
    }

    return null;
}

/**
 * Open a form record in FormViewer and wait for VV.Form.Global to load.
 */
async function openFormViewer(page, config, dataId, xcid, xcdid) {
    const url =
        `${config.baseUrl}/FormViewer/app` +
        `?DataID=${dataId}` +
        `&hidemenu=true` +
        `&rOpener=1` +
        `&xcid=${xcid}` +
        `&xcdid=${xcdid}`;

    console.log(`Opening FormViewer: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for VV.Form.Global to be populated
    console.log('Waiting for VV.Form.Global to load...');
    await page.waitForFunction(
        () => {
            try {
                return typeof VV !== 'undefined' && VV.Form && VV.Form.Global && Object.keys(VV.Form.Global).length > 0;
            } catch {
                return false;
            }
        },
        { timeout: 90000 }
    );

    const keyCount = await page.evaluate(() => Object.keys(VV.Form.Global).length);
    console.log(`VV.Form.Global loaded: ${keyCount} keys`);
}

/**
 * Extract all VV.Form.Global members — functions get .toString(), others get JSON.
 */
async function extractGlobalFunctions(page) {
    return page.evaluate(() => {
        const globals = VV.Form.Global;
        const result = {};

        for (const key of Object.keys(globals)) {
            const value = globals[key];
            if (typeof value === 'function') {
                result[key] = {
                    type: 'function',
                    source: value.toString(),
                    params: value.length,
                };
            } else {
                result[key] = {
                    type: typeof value,
                    value: JSON.stringify(value),
                };
            }
        }

        return {
            totalKeys: Object.keys(globals).length,
            entries: result,
        };
    });
}

/**
 * Save each function as an individual .js file with a metadata header.
 */
function saveGlobalFunctions(data) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    let saved = 0;
    let skipped = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const [name, info] of Object.entries(data.entries)) {
        if (info.type === 'function') {
            const filename = `${name}.js`;
            const filePath = path.join(OUTPUT_DIR, filename);
            const header = [
                '/**',
                ` * VV.Form.Global.${name}`,
                ` * Parameters: ${info.params}`,
                ` * Extracted from WADNR (vv5dev/fpOnline) on ${today}`,
                ' */',
                '',
            ].join('\n');

            fs.writeFileSync(filePath, header + info.source + '\n', 'utf8');
            const sizeKB = ((header.length + info.source.length) / 1024).toFixed(1);
            console.log(`  Saved: ${filename} (${sizeKB} KB)`);
            saved++;
        } else {
            console.log(`  Skip: ${name} (${info.type}: ${info.value})`);
            skipped++;
        }
    }

    return { saved, skipped };
}

/**
 * Generate a README.md index of all exported functions.
 */
function generateIndex(data) {
    const today = new Date().toISOString().split('T')[0];
    const functions = Object.entries(data.entries)
        .filter(([, info]) => info.type === 'function')
        .sort(([a], [b]) => a.localeCompare(b));

    const lines = [
        '# WADNR Global Functions',
        '',
        `Extracted from \`VV.Form.Global\` on vv5dev (WADNR/fpOnline).`,
        `Generated: ${today}`,
        '',
        '| # | Function | Params | Size |',
        '| --: | :------- | :----: | ---: |',
    ];

    functions.forEach(([name, info], i) => {
        const sizeKB = (info.source.length / 1024).toFixed(1);
        lines.push(`| ${i + 1} | [${name}](./${name}.js) | ${info.params} | ${sizeKB} KB |`);
    });

    lines.push('', `**Total**: ${functions.length} functions`, '');

    // Non-function entries
    const nonFunctions = Object.entries(data.entries).filter(([, info]) => info.type !== 'function');
    if (nonFunctions.length > 0) {
        lines.push('## Non-Function Properties', '');
        lines.push('| Name | Type | Value |');
        lines.push('| :--- | :--- | :---- |');
        for (const [name, info] of nonFunctions) {
            const val = (info.value || '').substring(0, 80);
            lines.push(`| ${name} | ${info.type} | \`${val}\` |`);
        }
        lines.push('');
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), lines.join('\n'), 'utf8');
}

// --- Main ---

async function main() {
    const config = loadWadnrConfig();
    console.log(`Target: ${config.baseUrl} (${config.customerAlias}/${config.databaseAlias})`);
    console.log(`Output: ${OUTPUT_DIR}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXPORT'} | Headless: ${HEADLESS}\n`);

    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Login
        await login(page, config);

        // 2. Find a record on a dashboard
        console.log('\n--- Discovering a form record ---');
        const record = await discoverFormRecord(page, config);

        // 3. Get xcid/xcdid
        let xcid = CLI_XCID;
        let xcdid = CLI_XCDID;

        if (!xcid || !xcdid) {
            console.log('\n--- Discovering xcid/xcdid ---');
            const guids = await discoverGuids(page);
            if (guids) {
                xcid = xcid || guids.xcid;
                xcdid = xcdid || guids.xcdid;
                console.log(`  xcid:  ${xcid}`);
                console.log(`  xcdid: ${xcdid}`);
            } else {
                throw new Error(
                    'Could not discover xcid/xcdid GUIDs. ' +
                        'Re-run with --xcid <guid> --xcdid <guid> (find them in a FormViewer URL in browser DevTools).'
                );
            }
        }

        // 4. Open form in FormViewer
        console.log('\n--- Opening FormViewer ---');
        await openFormViewer(page, config, record.dataId, xcid, xcdid);

        // 5. Extract
        console.log('\n--- Extracting VV.Form.Global ---');
        const data = await extractGlobalFunctions(page);
        const functionCount = Object.values(data.entries).filter((e) => e.type === 'function').length;
        console.log(`Total keys: ${data.totalKeys} | Functions: ${functionCount}`);

        if (DRY_RUN) {
            console.log('\n--- Function list ---');
            const sorted = Object.entries(data.entries).sort(([a], [b]) => a.localeCompare(b));
            for (const [name, info] of sorted) {
                if (info.type === 'function') {
                    console.log(`  ${name}(${info.params} params, ${info.source.length} chars)`);
                } else {
                    console.log(`  ${name} [${info.type}]: ${(info.value || '').substring(0, 60)}`);
                }
            }
            console.log('\n--- DRY RUN COMPLETE ---');
        } else {
            // 6. Save
            console.log('\n--- Saving ---');
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
            const { saved, skipped } = saveGlobalFunctions(data);
            generateIndex(data);
            console.log(`\nDone: ${saved} functions saved, ${skipped} non-functions skipped`);
            console.log(`Output: ${OUTPUT_DIR}`);
        }
    } catch (err) {
        console.error('\nFatal:', err.message);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        const screenshotPath = path.join(OUTPUT_DIR, '_error-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        console.error(`Screenshot saved: ${screenshotPath}`);
        throw err;
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
