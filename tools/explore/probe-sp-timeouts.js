#!/usr/bin/env node

/**
 * Read-only probe: Read the Timeout and Callback Timeout settings
 * from every outside process (microservice) in the active environment.
 *
 * Scrapes outsideprocessadmin grid columns including Timeout (col 5)
 * and Callback (col 6), plus opens each dock panel to read the
 * Callback Timeout and Unit fields.
 *
 * Usage:
 *   node tools/explore/probe-sp-timeouts.js [--project wadnr|emanueljofre] [--headed]
 */

const { chromium } = require('playwright');
const vvAdmin = require('../helpers/vv-admin');

const args = process.argv.slice(2);
const HEADED = args.includes('--headed');
const projectIdx = args.indexOf('--project');
const PROJECT = projectIdx >= 0 ? args[projectIdx + 1] : null;

// Grid columns for outsideprocessadmin
const GRID_COLUMNS = [
    { name: 'name', index: 1, type: 'link' },
    { name: 'description', index: 2, type: 'text' },
    { name: 'category', index: 3, type: 'text' },
    { name: 'serviceType', index: 4, type: 'text' },
    { name: 'timeout', index: 5, type: 'text' },
    { name: 'callback', index: 6, type: 'text' },
    { name: 'modifiedDate', index: 7, type: 'text' },
    { name: 'modifiedBy', index: 8, type: 'text' },
];

async function main() {
    let serverName, customerName;
    if (PROJECT) {
        const match = vvAdmin.findCustomer(PROJECT);
        if (!match) {
            console.error(`Customer "${PROJECT}" not found`);
            process.exit(1);
        }
        serverName = match.server;
        customerName = match.customer;
    } else {
        const active = vvAdmin.getActiveCustomer();
        serverName = active.server;
        customerName = active.customer;
    }

    const config = vvAdmin.loadEnvConfig(serverName, customerName);
    console.log(`Target: ${config.baseUrl} (${config.customerAlias}/${config.databaseAlias})`);
    console.log(`Mode: ${HEADED ? 'headed' : 'headless'}\n`);

    const browser = await chromium.launch({ headless: !HEADED });
    const page = await browser.newPage();

    console.log('Logging in...');
    await vvAdmin.login(page, config);
    console.log('Logged in.\n');

    const url = vvAdmin.adminUrl(config, 'outsideprocessadmin');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    const info = await vvAdmin.getGridInfo(page);
    console.log(`Grid: ${info || '(no info)'}\n`);

    // Collect all rows across pages — filter to Scheduled only
    const allItems = [];
    const seen = new Set();
    let pageNum = 0;

    while (pageNum < 30) {
        pageNum++;
        const rows = await vvAdmin.readGridRows(page, GRID_COLUMNS);
        let newCount = 0;
        for (const r of rows) {
            const key = r.name;
            if (!seen.has(key)) {
                seen.add(key);
                allItems.push(r);
                newCount++;
            }
        }
        console.log(`  Page ${pageNum}: ${rows.length} rows, ${newCount} new`);
        if (newCount === 0 && pageNum > 1) break;
        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
        if (!advanced) break;
    }

    // Filter to scheduled services
    const scheduled = allItems.filter((r) => r.category && r.category.toLowerCase().includes('scheduled'));

    console.log(`\nTotal outside processes: ${allItems.length}`);
    console.log(`Scheduled services: ${scheduled.length}\n`);

    // For each scheduled service, open the dock panel and read callback timeout fields
    const results = [];
    for (const item of scheduled) {
        // Navigate back to page 1
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        // Find and click the detail link
        const detail = await findAndOpenDetail(page, item.name, url);
        if (detail) {
            results.push({
                name: item.name,
                category: item.category,
                gridTimeout: item.timeout,
                gridCallback: item.callback,
                callbackEnabled: detail.callbackEnabled,
                callbackTimeout: detail.callbackTimeout,
                callbackUnit: detail.callbackUnit,
                serviceTimeout: detail.serviceTimeout,
            });

            // Close dock panel
            await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
        } else {
            results.push({
                name: item.name,
                category: item.category,
                gridTimeout: item.timeout,
                gridCallback: item.callback,
                error: 'Could not open detail panel',
            });
        }
    }

    await browser.close();

    // Report
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  Scheduled Process Timeout Configuration                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    console.log('| Service Name | Timeout (grid) | Callback Enabled | Callback Timeout | Callback Unit |');
    console.log('|---|---|---|---|---|');
    for (const r of results) {
        const cbEnabled = r.callbackEnabled !== undefined ? (r.callbackEnabled ? 'Yes' : 'No') : '?';
        const cbTimeout = r.callbackTimeout || r.gridTimeout || '?';
        const cbUnit = r.callbackUnit || '?';
        const svcTimeout = r.serviceTimeout || r.gridTimeout || '?';
        console.log(`| ${r.name} | ${svcTimeout} | ${cbEnabled} | ${cbTimeout} | ${cbUnit} |`);
    }
    console.log();

    // Save
    const outputPath = require('path').resolve(
        __dirname,
        '..',
        '..',
        'projects',
        PROJECT || customerName.toLowerCase(),
        'sp-timeout-config.json'
    );
    require('fs').writeFileSync(
        outputPath,
        JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
    );
    console.log(`Results saved to: ${outputPath}`);
}

async function findAndOpenDetail(page, serviceName, baseUrl) {
    let pageNum = 0;
    while (pageNum < 30) {
        pageNum++;
        const linkData = await page.evaluate((name) => {
            const links = document.querySelectorAll('a[id*="lnkDetails"]');
            for (const a of links) {
                if (a.textContent.trim() === name) {
                    const href = a.getAttribute('href') || '';
                    const m = href.match(/__doPostBack\('([^']+)'/);
                    return { id: a.id, target: m ? m[1] : null };
                }
            }
            return null;
        }, serviceName);

        if (linkData && linkData.target) {
            // Open dock panel
            await vvAdmin.triggerPostback(page, linkData.target, 'outsideprocessadmin', 30000);
            await page.waitForTimeout(1000);

            // Read the fields from the dock panel
            const fields = await page.evaluate(() => {
                const get = (id) => {
                    const el = document.querySelector(`#ctl00_ContentBody_dockDetail_C_${id}`);
                    if (!el) return null;
                    if (el.type === 'checkbox') return el.checked;
                    if (el.tagName === 'SELECT') {
                        const opt = el.options[el.selectedIndex];
                        return opt ? opt.text || opt.value : el.value;
                    }
                    return el.value || el.textContent.trim();
                };

                return {
                    serviceTimeout: get('txtServiceTimeout'),
                    callbackEnabled: get('chkCompletionCallback'),
                    callbackTimeout: get('txtCompletionCallbackTimeout'),
                    callbackUnit: get('cboCompletionCallbackUnitType'),
                };
            });

            return fields;
        }

        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
        if (!advanced) break;
    }
    return null;
}

main().catch((err) => {
    console.error('Fatal:', err.message || err);
    process.exit(1);
});
