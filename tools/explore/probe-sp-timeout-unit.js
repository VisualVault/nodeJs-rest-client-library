#!/usr/bin/env node

/**
 * Timeout Unit Discovery — is the Timeout field in seconds or minutes?
 *
 * Tests:
 *   T1: Timeout=10, delay=15s  →  if timeout, unit is seconds
 *   T2: Timeout=10, delay=5s   →  should succeed if seconds (confirms)
 *   T3: (if T1 succeeds) Timeout=1, delay=90s  →  tests if unit is minutes
 *
 * Usage:
 *   node tools/explore/probe-sp-timeout-unit.js [--headed]
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const vvAdmin = require('../helpers/vv-admin');

const HEADED = process.argv.includes('--headed');
const SCRIPT_NAME = 'ScheduledProcessTestHarness';
const SCHEDULE_NAME = 'SPTestHarness';

function loadConfig() {
    const envPath = path.resolve(__dirname, '..', '..', '.env.json');
    const raw = JSON.parse(fs.readFileSync(envPath, 'utf8'));
    const server = raw.servers['vvdemo'];
    const customer = server.customers['EmanuelJofre'];
    return {
        clientId: customer.clientId,
        clientSecret: customer.clientSecret,
        customerAlias: customer.customerAlias,
        databaseAlias: customer.databaseAlias,
    };
}

function buildDelayScript(config, delaySec) {
    return `
module.exports.getCredentials = function () {
    return { customerAlias: '${config.customerAlias}', databaseAlias: '${config.databaseAlias}', clientId: '${config.clientId}', clientSecret: '${config.clientSecret}', userId: '${config.clientId}', password: '${config.clientSecret}' };
};
module.exports.main = async function (vvClient, response, token) {
    console.log('Timeout unit test: waiting ${delaySec}s...');
    await new Promise(function(r) { setTimeout(r, ${delaySec * 1000}); });
    response.json(200, 'OK after ${delaySec}s');
    if (token) { try { await vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'done'); } catch(e) {} }
};
`;
}

async function findAndOpenOP(page, opUrl, name) {
    await page.goto(opUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
    let pn = 0;
    while (pn < 20) {
        pn++;
        const target = await page.evaluate((n) => {
            for (const a of document.querySelectorAll('a[id*="lnkDetails"]')) {
                if (a.textContent.trim() === n) {
                    const m = (a.getAttribute('href') || '').match(/__doPostBack\('([^']+)'/);
                    return m ? m[1] : null;
                }
            }
            return null;
        }, name);
        if (target) {
            await vvAdmin.triggerPostback(page, target, 'outsideprocessadmin', 30000);
            await page.waitForTimeout(1000);
            return true;
        }
        if (!(await vvAdmin.goToNextGridPage(page, pn, 'outsideprocessadmin'))) break;
    }
    return false;
}

async function configureAndSave(page, timeoutValue, scriptCode) {
    await page.evaluate(
        ({ to, code }) => {
            const toEl = document.querySelector('#ctl00_ContentBody_dockDetail_C_txtServiceTimeout');
            if (toEl) toEl.value = String(to);
            const ta = document.querySelector('#ctl00_ContentBody_dockDetail_C_txtScriptCode');
            if (ta) ta.value = code;
        },
        { to: timeoutValue, code: scriptCode }
    );

    const resp = page
        .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('outsideprocessadmin'), {
            timeout: 30000,
        })
        .catch(() => null);
    await page.evaluate(() => {
        const b = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnSave_input');
        if (b) b.click();
    });
    await resp;
    await page.waitForTimeout(1000);
    await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
}

async function triggerTest(page, schedUrl, waitTimeout) {
    await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    let row = null,
        pn = 0;
    while (pn < 10 && !row) {
        pn++;
        row = await page.evaluate((n) => {
            for (const r of document.querySelectorAll(
                '.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow'
            )) {
                const cells = r.querySelectorAll('td');
                const link = cells[1] && cells[1].querySelector('a[id*="lnkDetails"]');
                if (link && link.textContent.trim() === n) {
                    const m = (link.getAttribute('href') || '').match(/__doPostBack\('([^']+)'/);
                    return { target: m ? m[1] : null };
                }
            }
            return null;
        }, SCHEDULE_NAME);
        if (!row && !(await vvAdmin.goToNextGridPage(page, pn, 'scheduleradmin'))) break;
    }
    if (!row) return { error: 'not found' };

    await vvAdmin.triggerPostback(page, row.target, 'scheduleradmin', 30000);
    await page.waitForTimeout(1000);

    const start = Date.now();
    const testResp = page
        .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('scheduleradmin'), {
            timeout: waitTimeout,
        })
        .catch(() => null);
    await page.evaluate(() => {
        const b = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnTest_input');
        if (b) b.click();
    });

    let timedOut = false;
    await Promise.race([
        testResp,
        new Promise((r) =>
            setTimeout(() => {
                timedOut = true;
                r();
            }, waitTimeout)
        ),
    ]);
    await page.waitForTimeout(3000);
    const elapsed = Date.now() - start;

    const dialog = await page.evaluate(() => {
        const el = document.querySelector('[id*="DockMessageWindow"]');
        return el
            ? el.textContent
                  .trim()
                  .replace(/Response from OutsideProcess/gi, '')
                  .replace(/\s+/g, ' ')
                  .replace(/OK$/, '')
                  .trim()
            : null;
    });

    await page.evaluate(() => {
        const ok = document.querySelector('#ctl00_mpMessageWin_DockMessageWindow_C_Button1a_input');
        if (ok) ok.click();
        const c = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnCancel_input');
        if (c) c.click();
    });
    await page.waitForTimeout(500);

    const isTimeout =
        dialog && (dialog.toLowerCase().includes('taskcancel') || dialog.toLowerCase().includes('could not complete'));
    const isSuccess = dialog && dialog.includes('OK after');
    return { elapsed, dialog, isTimeout, isSuccess, timedOut };
}

async function main() {
    const config = loadConfig();
    const adminConfig = vvAdmin.loadEnvConfig('vvdemo', 'EmanuelJofre');
    const opUrl = vvAdmin.adminUrl(adminConfig, 'outsideprocessadmin');
    const schedUrl = vvAdmin.adminUrl(adminConfig, 'scheduleradmin');

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  Timeout Unit Discovery                                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const browser = await chromium.launch({ headless: !HEADED });
    const page = await browser.newPage();
    await vvAdmin.login(page, adminConfig);
    console.log('Logged in.\n');

    // Save original timeout
    await findAndOpenOP(page, opUrl, SCRIPT_NAME);
    const origTimeout = await page.evaluate(() => {
        const el = document.querySelector('#ctl00_ContentBody_dockDetail_C_txtServiceTimeout');
        return el ? el.value : '0';
    });
    const origScript = await page.evaluate(() => {
        const ta = document.querySelector('#ctl00_ContentBody_dockDetail_C_txtScriptCode');
        return ta ? ta.value : null;
    });
    await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
    console.log(`Original timeout: ${origTimeout}\n`);

    const tests = [
        { id: 'T1', timeout: 10, delay: 15, description: 'Timeout=10, delay=15s → timeout if unit=seconds' },
        { id: 'T2', timeout: 10, delay: 5, description: 'Timeout=10, delay=5s → success if unit=seconds' },
    ];

    const results = [];

    try {
        for (const t of tests) {
            console.log(`━━━ ${t.id}: ${t.description} ━━━`);

            await findAndOpenOP(page, opUrl, SCRIPT_NAME);
            await configureAndSave(page, t.timeout, buildDelayScript(config, t.delay));
            console.log(`  Set timeout=${t.timeout}, script delay=${t.delay}s`);

            console.log('  Triggering Test Microservice...');
            const waitMs = (t.delay + 60) * 1000;
            const r = await triggerTest(page, schedUrl, waitMs);

            console.log(`  Elapsed: ${Math.round(r.elapsed / 1000)}s`);
            console.log(`  Dialog: ${r.dialog ? r.dialog.substring(0, 80) : '(none)'}`);
            console.log(`  Result: ${r.isSuccess ? 'SUCCESS' : r.isTimeout ? 'TIMEOUT' : 'UNKNOWN'}\n`);
            results.push({
                ...t,
                elapsed: r.elapsed,
                dialog: r.dialog,
                isSuccess: r.isSuccess,
                isTimeout: r.isTimeout,
            });
        }

        // If T1 succeeded (unit is NOT seconds), test if it's minutes
        if (results[0] && results[0].isSuccess) {
            const t3 = {
                id: 'T3',
                timeout: 1,
                delay: 90,
                description: 'Timeout=1, delay=90s → timeout if unit=minutes',
            };
            console.log(`━━━ ${t3.id}: ${t3.description} ━━━`);
            await findAndOpenOP(page, opUrl, SCRIPT_NAME);
            await configureAndSave(page, t3.timeout, buildDelayScript(config, t3.delay));
            console.log(`  Set timeout=${t3.timeout}, script delay=${t3.delay}s`);
            console.log('  Triggering Test Microservice...');
            const r = await triggerTest(page, schedUrl, 180000);
            console.log(`  Elapsed: ${Math.round(r.elapsed / 1000)}s`);
            console.log(`  Dialog: ${r.dialog ? r.dialog.substring(0, 80) : '(none)'}`);
            console.log(`  Result: ${r.isSuccess ? 'SUCCESS' : r.isTimeout ? 'TIMEOUT' : 'UNKNOWN'}\n`);
            results.push({
                ...t3,
                elapsed: r.elapsed,
                dialog: r.dialog,
                isSuccess: r.isSuccess,
                isTimeout: r.isTimeout,
            });
        }
    } finally {
        console.log('Restoring original timeout and script...');
        try {
            await findAndOpenOP(page, opUrl, SCRIPT_NAME);
            await configureAndSave(page, origTimeout, origScript || '');
            console.log('Restored.\n');
        } catch (e) {
            console.error('Restore failed:', e.message);
        }
        await browser.close();
    }

    // Summary
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  RESULTS                                                   ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log('| Test | Timeout | Delay | Elapsed | Result |');
    console.log('|------|---------|-------|---------|--------|');
    for (const r of results) {
        console.log(
            `| ${r.id} | ${r.timeout} | ${r.delay}s | ${Math.round(r.elapsed / 1000)}s | ${r.isSuccess ? 'SUCCESS' : r.isTimeout ? 'TIMEOUT' : 'UNKNOWN'} |`
        );
    }

    // Conclusion
    console.log();
    const t1 = results[0];
    const t2 = results[1];
    if (t1 && t1.isTimeout && t2 && t2.isSuccess) {
        console.log('CONCLUSION: Timeout unit is SECONDS. Timeout=10 blocked a 15s delay but allowed a 5s delay.');
    } else if (t1 && t1.isSuccess) {
        const t3 = results[2];
        if (t3 && t3.isTimeout) {
            console.log('CONCLUSION: Timeout unit is MINUTES. Timeout=10 allowed 15s, Timeout=1 blocked 90s.');
        } else if (t3 && t3.isSuccess) {
            console.log('CONCLUSION: Timeout unit is neither seconds nor minutes, or the field is not being applied.');
        }
    } else {
        console.log('INCONCLUSIVE: Could not determine unit from results.');
    }
}

main().catch((err) => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
