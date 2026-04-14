#!/usr/bin/env node

/**
 * Completion Callback Behavior Test — what happens when callback is enabled
 * and postCompletion() is not called?
 *
 * 3 scenarios:
 *   S1: Callback Disabled + postCompletion called (control)
 *   S2: Callback Enabled  + postCompletion called
 *   S3: Callback Enabled  + postCompletion NOT called
 *
 * Prerequisites:
 *   - ngrok tunneling to localhost:3000
 *   - Local Node server running
 *   - .env.json pointing to vvdemo/EmanuelJofre
 *
 * Usage:
 *   node tools/explore/probe-sp-callback.js [--headed]
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const vvAdmin = require('../helpers/vv-admin');

const HEADED = process.argv.includes('--headed');
const SCRIPT_NAME = 'ScheduledProcessTestHarness';
const SCHEDULE_NAME = 'SPTestHarness';
const CALLBACK_TIMEOUT_MINUTES = 1;

// Element IDs in outsideprocessadmin dock panel
const EL = {
    scriptCode: '#ctl00_ContentBody_dockDetail_C_txtScriptCode',
    save: '#ctl00_ContentBody_dockDetail_C_btnSave_input',
    callbackCheckbox: '#ctl00_ContentBody_dockDetail_C_chkCompletionCallback',
    callbackTimeout: '#ctl00_ContentBody_dockDetail_C_txtCompletionCallbackTimeout',
    callbackUnit: '#ctl00_ContentBody_dockDetail_C_cboCompletionCallbackUnitType',
};

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

function buildScript(config, callPostCompletion) {
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
    var callPC = ${callPostCompletion};
    console.log('Callback test: callPostCompletion=' + callPC);
    response.json(200, 'Callback test: postCompletion=' + callPC);
    try { await vvClient.sites.getSites({ q: "name eq 'home'" }); } catch(e) {}
    ${
        callPostCompletion
            ? `
    if (token) {
        try {
            await vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'Callback test completed');
            console.log('postCompletion sent successfully');
        } catch(e) {
            console.log('postCompletion error: ' + e.message);
        }
    }`
            : `
    console.log('postCompletion intentionally skipped');
    // NO postCompletion() call`
    }
};
`;
}

// ── Outsideprocessadmin helpers ──────────────────────────────────────────────

async function findScriptInGrid(page, opUrl, scriptName) {
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
                    return { id: a.id, target: m ? m[1] : null };
                }
            }
            return null;
        }, scriptName);

        if (linkData && linkData.target) return linkData;

        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
        if (!advanced) break;
    }
    return null;
}

async function openScriptDockPanel(page, opUrl, scriptName) {
    const linkData = await findScriptInGrid(page, opUrl, scriptName);
    if (!linkData) throw new Error(`Script "${scriptName}" not found in outsideprocessadmin`);
    await vvAdmin.triggerPostback(page, linkData.target, 'outsideprocessadmin', 30000);
    await page.waitForTimeout(1000);
    return linkData;
}

async function readOriginalScript(page, opUrl, scriptName) {
    const linkData = await findScriptInGrid(page, opUrl, scriptName);
    if (!linkData) return null;
    const detail = await vvAdmin.extractDockPanelDetail(
        page,
        linkData.id,
        'ctl00_ContentBody_dockDetail_C_txtScriptCode',
        'outsideprocessadmin'
    );
    await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
    return detail ? detail.source : null;
}

async function readCallbackSettings(page) {
    return page.evaluate((el) => {
        const cb = document.querySelector(el.callbackCheckbox);
        const timeout = document.querySelector(el.callbackTimeout);
        const unit = document.querySelector(el.callbackUnit);
        return {
            enabled: cb ? cb.checked : null,
            timeout: timeout ? timeout.value : null,
            unit: unit ? (unit.options[unit.selectedIndex] ? unit.options[unit.selectedIndex].text : unit.value) : null,
        };
    }, EL);
}

async function setCallbackSettings(page, enabled, timeoutVal, unitIndex) {
    await page.evaluate(
        ({ el, enabled, timeoutVal, unitIndex }) => {
            const cb = document.querySelector(el.callbackCheckbox);
            if (cb && cb.checked !== enabled) cb.checked = enabled;
            const to = document.querySelector(el.callbackTimeout);
            if (to) to.value = String(timeoutVal);
            const unit = document.querySelector(el.callbackUnit);
            if (unit) unit.selectedIndex = unitIndex;
        },
        { el: EL, enabled, timeoutVal, unitIndex }
    );
}

async function setScriptCode(page, code) {
    await page.evaluate(
        ({ sel, code }) => {
            const ta = document.querySelector(sel);
            if (ta) ta.value = code;
        },
        { sel: EL.scriptCode, code }
    );
}

async function saveDockPanel(page, urlMatch) {
    const saveResp = page
        .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(urlMatch), { timeout: 30000 })
        .catch(() => null);
    await page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (btn) btn.click();
    }, EL.save);
    await saveResp;
    await page.waitForTimeout(1000);
}

// ── Scheduleradmin helpers ──────────────────────────────────────────────────

async function triggerTest(page, scheduleName, schedUrl, waitTimeout) {
    await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    let row = null;
    let pageNum = 0;
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

    await testResp;
    await page.waitForTimeout(3000);
    const elapsed = Date.now() - startTime;

    const dialogMessage = await page.evaluate(() => {
        const el = document.querySelector('[id*="DockMessageWindow"]');
        if (el)
            return el.textContent
                .trim()
                .replace(/Response from OutsideProcess/gi, '')
                .replace(/\s+/g, ' ')
                .replace(/OK$/, '')
                .trim();
        return null;
    });

    // Dismiss
    await page.evaluate(() => {
        const ok = document.querySelector('#ctl00_mpMessageWin_DockMessageWindow_C_Button1a_input');
        if (ok) ok.click();
        const cancel = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnCancel_input');
        if (cancel) cancel.click();
    });
    await page.waitForTimeout(500);

    return { dialogMessage, elapsed };
}

async function readScheduleLog(page, scheduleName, schedUrl, maxEntries) {
    await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    let viewTarget = null;
    let pageNum = 0;
    while (pageNum < 10 && !viewTarget) {
        pageNum++;
        viewTarget = await page.evaluate((name) => {
            const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
            for (const row of rows) {
                const cells = Array.from(row.querySelectorAll('td'));
                const nameLink = cells[1] ? cells[1].querySelector('a') : null;
                if (nameLink && nameLink.textContent.trim() === name) {
                    const viewLink = cells[2] ? cells[2].querySelector('a') : null;
                    if (viewLink) {
                        const href = viewLink.getAttribute('href') || '';
                        const m = href.match(/__doPostBack\('([^']+)'/);
                        return m ? m[1] : null;
                    }
                }
            }
            return null;
        }, scheduleName);
        if (!viewTarget) {
            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
            if (!advanced) break;
        }
    }
    if (!viewTarget) return [];

    let logHtml = null;
    const responsePromise = page
        .waitForResponse(
            async (resp) => {
                if (resp.request().method() === 'POST' && resp.url().includes('scheduleradmin')) {
                    logHtml = await resp.text();
                    return true;
                }
                return false;
            },
            { timeout: 30000 }
        )
        .catch(() => null);

    await page.addScriptTag({ content: `__doPostBack('${viewTarget.replace(/'/g, "\\'")}', '');` });
    await responsePromise;
    await page.waitForTimeout(1000);

    const entries = [];
    if (logHtml) {
        const rowRegex = /<tr[^>]*class="(?:rgRow|rgAltRow)"[^>]*>([\s\S]*?)<\/tr>/gi;
        let match;
        while ((match = rowRegex.exec(logHtml)) && entries.length < maxEntries) {
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells = [];
            let cellMatch;
            while ((cellMatch = cellRegex.exec(match[1]))) {
                cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
            }
            if (cells.length >= 5 && cells.length <= 7) {
                entries.push({
                    row: cells[0],
                    scheduledDate: cells[1],
                    actualDate: cells[2],
                    completionDate: cells[3],
                    result: cells[4],
                    message: cells[5] || '',
                });
            }
        }
    }

    // Close panels
    await page.evaluate(() => {
        document.querySelectorAll('.rwCloseButton, [title="Close"]').forEach((b) => b.click());
        document.querySelectorAll('[id*="dock"], .RadDock, .RadWindow').forEach((d) => (d.style.display = 'none'));
    });
    await page.waitForTimeout(300);

    return entries;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
    const config = loadConfig();
    const adminConfig = vvAdmin.loadEnvConfig('vvdemo', 'EmanuelJofre');
    const opUrl = vvAdmin.adminUrl(adminConfig, 'outsideprocessadmin');
    const schedUrl = vvAdmin.adminUrl(adminConfig, 'scheduleradmin');

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  Completion Callback Behavior Test                         ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const browser = await chromium.launch({ headless: !HEADED });
    const page = await browser.newPage();

    console.log('Logging in...');
    await vvAdmin.login(page, adminConfig);
    console.log('Logged in.\n');

    // Save original state
    console.log('Saving original script...');
    const originalScript = await readOriginalScript(page, opUrl, SCRIPT_NAME);
    console.log(`  Script saved (${originalScript ? originalScript.length : 0} chars).`);

    // Read original callback settings
    await openScriptDockPanel(page, opUrl, SCRIPT_NAME);
    const originalCallback = await readCallbackSettings(page);
    console.log(
        `  Original callback: enabled=${originalCallback.enabled}, timeout=${originalCallback.timeout}, unit=${originalCallback.unit}`
    );
    await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
    console.log();

    const scenarios = [
        {
            id: 'S1',
            name: 'Callback Disabled + postCompletion called (control)',
            callbackEnabled: false,
            callPostCompletion: true,
            waitAfterTest: 5000,
        },
        {
            id: 'S2',
            name: 'Callback Enabled + postCompletion called',
            callbackEnabled: true,
            callPostCompletion: true,
            waitAfterTest: 5000,
        },
        {
            id: 'S3',
            name: 'Callback Enabled + postCompletion NOT called',
            callbackEnabled: true,
            callPostCompletion: false,
            waitAfterTest: 90000, // Wait for callback timeout (1 min) + buffer
        },
    ];

    const results = [];

    try {
        for (const scenario of scenarios) {
            console.log(`━━━ ${scenario.id}: ${scenario.name} ━━━`);

            // Step 1: Set callback settings on the Microservice
            console.log('  Setting callback and script...');
            await openScriptDockPanel(page, opUrl, SCRIPT_NAME);
            await setCallbackSettings(page, scenario.callbackEnabled, CALLBACK_TIMEOUT_MINUTES, 0);
            await setScriptCode(page, buildScript(config, scenario.callPostCompletion));
            await saveDockPanel(page, 'outsideprocessadmin');
            await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');

            // Verify settings
            await openScriptDockPanel(page, opUrl, SCRIPT_NAME);
            const settings = await readCallbackSettings(page);
            console.log(`  Callback: enabled=${settings.enabled}, timeout=${settings.timeout}, unit=${settings.unit}`);
            await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');

            // Step 2: Trigger test
            console.log('  Triggering Test Microservice...');
            const testResult = await triggerTest(page, SCHEDULE_NAME, schedUrl, 60000);
            console.log(`  Dialog: ${testResult.dialogMessage || '(none)'}`);
            console.log(`  Test elapsed: ${Math.round(testResult.elapsed / 1000)}s`);

            // Step 3: Wait (for S3, wait for the callback timeout to expire)
            if (scenario.waitAfterTest > 10000) {
                const waitSec = Math.round(scenario.waitAfterTest / 1000);
                console.log(`  Waiting ${waitSec}s for callback timeout to expire...`);
                await page.waitForTimeout(scenario.waitAfterTest);
            }

            // Step 4: Read schedule log
            console.log('  Reading schedule log...');
            const logEntries = await readScheduleLog(page, SCHEDULE_NAME, schedUrl, 3);
            console.log(`  Latest ${logEntries.length} log entries:`);
            for (const e of logEntries) {
                console.log(
                    `    [Result=${e.result}] Scheduled=${e.scheduledDate} | Actual=${e.actualDate} | Completion=${e.completionDate} | Msg=${e.message.substring(0, 60)}`
                );
            }
            console.log();

            results.push({
                id: scenario.id,
                name: scenario.name,
                callbackEnabled: scenario.callbackEnabled,
                callPostCompletion: scenario.callPostCompletion,
                dialogMessage: testResult.dialogMessage,
                testElapsed: testResult.elapsed,
                latestLogEntry: logEntries[0] || null,
            });

            // Brief pause between scenarios
            await page.waitForTimeout(3000);
        }
    } finally {
        // Restore original script and callback settings
        console.log('Restoring original state...');
        try {
            await openScriptDockPanel(page, opUrl, SCRIPT_NAME);
            await setCallbackSettings(
                page,
                originalCallback.enabled,
                originalCallback.timeout || '0',
                originalCallback.unit === 'Minutes' ? 0 : 0
            );
            if (originalScript) await setScriptCode(page, originalScript);
            await saveDockPanel(page, 'outsideprocessadmin');
            await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
            console.log('Original state restored.\n');
        } catch (err) {
            console.error(`Failed to restore: ${err.message}\n`);
        }
        await browser.close();
    }

    // Summary
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  RESULTS                                                   ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('| Scenario | Callback | postCompletion | Test Time | Log Result | Log Message |');
    console.log('|----------|----------|----------------|-----------|------------|-------------|');
    for (const r of results) {
        const cb = r.callbackEnabled ? 'Enabled' : 'Disabled';
        const pc = r.callPostCompletion ? 'Called' : 'SKIPPED';
        const time = Math.round(r.testElapsed / 1000) + 's';
        const result = r.latestLogEntry ? r.latestLogEntry.result : 'n/a';
        const msg = r.latestLogEntry ? r.latestLogEntry.message.substring(0, 40) : 'n/a';
        console.log(`| ${r.id} | ${cb} | ${pc} | ${time} | ${result} | ${msg} |`);
    }
    console.log();

    // Comparison
    if (results.length === 3) {
        const [s1, s2, s3] = results;
        console.log('Key observations:');
        if (s1.latestLogEntry && s2.latestLogEntry) {
            console.log(`  S1 vs S2 Result: ${s1.latestLogEntry.result} vs ${s2.latestLogEntry.result}`);
            console.log(
                `  S1 vs S2 Completion: ${s1.latestLogEntry.completionDate} vs ${s2.latestLogEntry.completionDate}`
            );
        }
        if (s2.latestLogEntry && s3.latestLogEntry) {
            console.log(`  S2 vs S3 Result: ${s2.latestLogEntry.result} vs ${s3.latestLogEntry.result}`);
            console.log(
                `  S2 vs S3 Completion: ${s2.latestLogEntry.completionDate} vs ${s3.latestLogEntry.completionDate}`
            );
        }
    }

    // Save
    const outputPath = path.resolve(__dirname, '..', '..', 'projects', 'emanueljofre', 'sp-callback-results.json');
    fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);
}

main().catch((err) => {
    console.error('Fatal:', err.message || err);
    process.exit(1);
});
