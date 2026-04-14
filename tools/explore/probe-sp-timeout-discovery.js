#!/usr/bin/env node

/**
 * Timeout Discovery — empirically find VV's platform default HTTP timeout
 * for scheduled process execution.
 *
 * Tests increasing delay values before response.json() is called.
 * When VV times out, we've found the boundary.
 *
 * Prerequisites:
 *   - ngrok tunneling to localhost:3000
 *   - Local Node server running (node lib/VVRestApi/VVRestApiNodeJs/app.js)
 *   - .env.json pointing to vvdemo/EmanuelJofre
 *
 * Usage:
 *   node tools/explore/probe-sp-timeout-discovery.js
 *   node tools/explore/probe-sp-timeout-discovery.js --headed
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const vvAdmin = require('../helpers/vv-admin');

const args = process.argv.slice(2);
const HEADED = args.includes('--headed');

// Delays to test (in seconds) — ascending order, stop at first failure
const DELAYS = [10, 30, 60, 90, 120, 180, 300];

function loadEmanuelJofreConfig() {
    const envPath = path.resolve(__dirname, '..', '..', '.env.json');
    const raw = JSON.parse(fs.readFileSync(envPath, 'utf8'));
    const server = raw.servers && raw.servers['vvdemo'];
    const customer = server && server.customers && server.customers['EmanuelJofre'];
    if (!server || !customer) throw new Error('EmanuelJofre config not found in .env.json');
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
    return {
        customerAlias: '${config.customerAlias}',
        databaseAlias: '${config.databaseAlias}',
        clientId: '${config.clientId}',
        clientSecret: '${config.clientSecret}',
        userId: '${config.clientId}',
        password: '${config.clientSecret}',
    };
};

module.exports.main = async function (vvClient, response, token) {
    var delayMs = ${delaySec * 1000};
    var delaySec = ${delaySec};
    console.log('Timeout test: waiting ' + delaySec + 's before response.json()...');
    await new Promise(function(r) { setTimeout(r, delayMs); });
    console.log('Timeout test: sending response.json() after ' + delaySec + 's delay');
    response.json(200, 'Timeout test: responded after ' + delaySec + 's delay');
    if (token) {
        try {
            await vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'Timeout test ' + delaySec + 's completed');
        } catch(e) {
            console.log('postCompletion failed: ' + e.message);
        }
    }
};
`;
}

async function editScript(page, opUrl, scriptName, newCode) {
    await page.goto(opUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    let pageNum = 0;
    while (pageNum < 20) {
        pageNum++;
        const linkData = await page.evaluate((name) => {
            const links = document.querySelectorAll('a[id*="lnkDetails"]');
            for (const a of links) {
                if (a.textContent.trim() === name) {
                    const href = a.getAttribute('href') || '';
                    const m = href.match(/__doPostBack\('([^']+)'/);
                    return { target: m ? m[1] : null };
                }
            }
            return null;
        }, scriptName);

        if (linkData && linkData.target) {
            await vvAdmin.triggerPostback(page, linkData.target, 'outsideprocessadmin', 30000);
            await page.waitForTimeout(1000);

            await page.waitForSelector('#ctl00_ContentBody_dockDetail_C_txtScriptCode', { timeout: 10000 });
            await page.evaluate(
                ({ code }) => {
                    const ta = document.querySelector('#ctl00_ContentBody_dockDetail_C_txtScriptCode');
                    if (ta) ta.value = code;
                },
                { code: newCode }
            );

            const saveResp = page
                .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('outsideprocessadmin'), {
                    timeout: 30000,
                })
                .catch(() => null);

            await page.evaluate(() => {
                const btn = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnSave_input');
                if (btn) btn.click();
            });
            await saveResp;
            await page.waitForTimeout(1000);
            await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
            return true;
        }

        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
        if (!advanced) break;
    }
    return false;
}

async function readOriginalScript(page, opUrl, scriptName) {
    await page.goto(opUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    let pageNum = 0;
    while (pageNum < 20) {
        pageNum++;
        const linkId = await page.evaluate((name) => {
            const links = document.querySelectorAll('a[id*="lnkDetails"]');
            for (const a of links) {
                if (a.textContent.trim() === name) return a.id;
            }
            return null;
        }, scriptName);

        if (linkId) {
            const detail = await vvAdmin.extractDockPanelDetail(
                page,
                linkId,
                'ctl00_ContentBody_dockDetail_C_txtScriptCode',
                'outsideprocessadmin'
            );
            await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
            return detail ? detail.source : null;
        }

        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
        if (!advanced) break;
    }
    return null;
}

async function triggerTest(page, scheduleName, schedUrl, waitTimeout) {
    await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    // Find schedule and open dock panel
    let pageNum = 0;
    let row = null;
    while (pageNum < 10 && !row) {
        pageNum++;
        row = await page.evaluate((name) => {
            const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
            for (const r of rows) {
                const cells = r.querySelectorAll('td');
                const link = cells[1] && cells[1].querySelector('a[id*="lnkDetails"]');
                if (link && link.textContent.trim() === name) {
                    const href = link.getAttribute('href') || '';
                    const m = href.match(/__doPostBack\('([^']+)'/);
                    return { target: m ? m[1] : null };
                }
            }
            return null;
        }, scheduleName);
        if (!row) {
            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
            if (!advanced) break;
        }
    }

    if (!row || !row.target) return { error: 'Schedule not found' };

    await vvAdmin.triggerPostback(page, row.target, 'scheduleradmin', 30000);
    await page.waitForTimeout(1000);

    // Click Test Microservice via JS
    const startTime = Date.now();
    const testResp = page
        .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('scheduleradmin'), {
            timeout: waitTimeout,
        })
        .catch(() => null);

    await page.evaluate(() => {
        const btn = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnTest_input');
        if (btn) btn.click();
    });

    let timedOut = false;
    await Promise.race([
        testResp,
        new Promise((resolve) =>
            setTimeout(() => {
                timedOut = true;
                resolve(null);
            }, waitTimeout)
        ),
    ]);

    // Wait a bit for the dialog to render
    await page.waitForTimeout(3000);
    const elapsed = Date.now() - startTime;

    // Read dialog
    const dialogMessage = await page.evaluate(() => {
        const el = document.querySelector('[id*="DockMessageWindow"]');
        if (el)
            return el.textContent
                .trim()
                .replace(/Response from OutsideProcess/gi, '')
                .replace(/\s+/g, ' ')
                .replace(/OK$/, '')
                .trim();
        const rw = document.querySelector('.rwWindowContent');
        return rw ? rw.textContent.trim() : null;
    });

    // Dismiss dialog
    await page.evaluate(() => {
        const okBtn = document.querySelector('#ctl00_mpMessageWin_DockMessageWindow_C_Button1a_input');
        if (okBtn) okBtn.click();
        const cancelBtn = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnCancel_input');
        if (cancelBtn) cancelBtn.click();
    });
    await page.waitForTimeout(500);

    return { dialogMessage, timedOut, elapsed };
}

async function main() {
    const config = loadEmanuelJofreConfig();
    const adminConfig = vvAdmin.loadEnvConfig('vvdemo', 'EmanuelJofre');

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  VV Platform Timeout Discovery                             ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log(`Target: ${adminConfig.baseUrl} (${adminConfig.customerAlias})`);
    console.log(`Delays to test: ${DELAYS.join(', ')} seconds\n`);

    // Verify ngrok + server are working
    console.log('Verifying connectivity...');
    try {
        const resp = await fetch('http://localhost:3000/');
        if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
        console.log('  Local server: OK');
    } catch (err) {
        console.error(`  Local server FAILED: ${err.message}`);
        console.error('  Start the server: node lib/VVRestApi/VVRestApiNodeJs/app.js');
        process.exit(1);
    }

    try {
        const ngrokResp = await fetch('http://localhost:4040/api/tunnels');
        const ngrokData = await ngrokResp.json();
        const tunnel = ngrokData.tunnels.find((t) => t.config.addr.includes('3000'));
        if (tunnel) {
            console.log(`  ngrok tunnel: ${tunnel.public_url} → localhost:3000`);
        } else {
            console.log('  WARNING: No ngrok tunnel found for port 3000');
        }
    } catch {
        console.log('  WARNING: Could not check ngrok status');
    }
    console.log();

    const browser = await chromium.launch({ headless: !HEADED });
    const page = await browser.newPage();

    const opUrl = vvAdmin.adminUrl(adminConfig, 'outsideprocessadmin');
    const schedUrl = vvAdmin.adminUrl(adminConfig, 'scheduleradmin');

    console.log('Logging in...');
    await vvAdmin.login(page, adminConfig);
    console.log('Logged in.\n');

    // Save original script
    console.log('Saving original ScheduledProcessTestHarness script...');
    const originalScript = await readOriginalScript(page, opUrl, 'ScheduledProcessTestHarness');
    if (originalScript) {
        console.log(`  Saved (${originalScript.length} chars).\n`);
    } else {
        console.error('  FATAL: Could not read original script.');
        await browser.close();
        process.exit(1);
    }

    const results = [];
    let foundTimeout = false;

    try {
        for (const delaySec of DELAYS) {
            console.log(`━━━ Testing ${delaySec}s delay ━━━`);

            // Edit script with this delay
            console.log('  Uploading test script...');
            const code = buildDelayScript(config, delaySec);
            await editScript(page, opUrl, 'ScheduledProcessTestHarness', code);
            console.log('  Script uploaded.');

            // Trigger test (wait = delay + 90s buffer for auth + network)
            const waitTimeout = (delaySec + 90) * 1000;
            console.log(`  Triggering Test Microservice (timeout: ${delaySec + 90}s)...`);
            const result = await triggerTest(page, 'SPTestHarness', schedUrl, waitTimeout);

            const success = result.dialogMessage && result.dialogMessage.includes(`responded after ${delaySec}s`);
            const isTimeout =
                result.dialogMessage &&
                (result.dialogMessage.toLowerCase().includes('timeout') ||
                    result.dialogMessage.toLowerCase().includes('timed out') ||
                    result.dialogMessage.toLowerCase().includes('error'));
            const isNgrokError = result.dialogMessage && result.dialogMessage.toLowerCase().includes('ngrok');

            console.log(`  Elapsed: ${Math.round(result.elapsed / 1000)}s`);
            console.log(`  Dialog: ${result.dialogMessage || '(none)'}`);
            console.log(
                `  Result: ${success ? 'SUCCESS' : isNgrokError ? 'NGROK ERROR' : isTimeout ? 'TIMEOUT' : 'UNKNOWN'}`
            );
            console.log();

            results.push({
                delaySec,
                elapsed: result.elapsed,
                dialogMessage: result.dialogMessage,
                success,
                isTimeout,
                isNgrokError,
            });

            if (isNgrokError) {
                console.log('  ⚠ ngrok error — server may not be running. Stopping.\n');
                foundTimeout = false;
                break;
            }

            if (isTimeout || result.timedOut) {
                console.log(`  ⚠ VV timed out at ${delaySec}s delay!\n`);
                foundTimeout = true;
                break;
            }

            // Brief pause between tests
            await page.waitForTimeout(2000);
        }
    } finally {
        // Restore original script
        console.log('Restoring original script...');
        try {
            await editScript(page, opUrl, 'ScheduledProcessTestHarness', originalScript);
            console.log('Original script restored.\n');
        } catch (err) {
            console.error(`Failed to restore: ${err.message}\n`);
        }
        await browser.close();
    }

    // Summary
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  RESULTS                                                   ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('| Delay | Elapsed | Result | Dialog |');
    console.log('|-------|---------|--------|--------|');
    for (const r of results) {
        const status = r.success ? 'OK' : r.isNgrokError ? 'NGROK ERR' : r.isTimeout ? 'TIMEOUT' : '???';
        const dialog = (r.dialogMessage || '').substring(0, 50);
        console.log(`| ${r.delaySec}s | ${Math.round(r.elapsed / 1000)}s | ${status} | ${dialog} |`);
    }
    console.log();

    if (foundTimeout) {
        const lastSuccess = results.filter((r) => r.success).pop();
        const firstFail = results.find((r) => r.isTimeout);
        console.log(
            `Platform default timeout is between ${lastSuccess ? lastSuccess.delaySec : 0}s and ${firstFail.delaySec}s`
        );
    } else if (results.every((r) => r.success)) {
        console.log(
            `All delays succeeded (up to ${results[results.length - 1].delaySec}s). Timeout is > ${results[results.length - 1].delaySec}s.`
        );
    } else if (results.some((r) => r.isNgrokError)) {
        console.log('Test aborted due to ngrok connectivity issue.');
    }

    // Save
    const outputPath = path.resolve(__dirname, '..', '..', 'projects', 'emanueljofre', 'sp-timeout-discovery.json');
    fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);
}

main().catch((err) => {
    console.error('Fatal:', err.message || err);
    process.exit(1);
});
