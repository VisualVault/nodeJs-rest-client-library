#!/usr/bin/env node

/**
 * Completion Callback Behavior Test — via actual scheduler execution.
 *
 * Uses real scheduled runs (not Test button) to observe log entries.
 * Sets recurrence to "Every 2 Minutes" and waits for the scheduler to trigger.
 *
 * 3 scenarios:
 *   S1: Callback Disabled + postCompletion called (control)
 *   S2: Callback Enabled  + postCompletion called
 *   S3: Callback Enabled  + postCompletion NOT called
 *
 * Usage:
 *   node tools/explore/probe-sp-callback-scheduled.js [--headed]
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const vvAdmin = require('../helpers/vv-admin');

const HEADED = process.argv.includes('--headed');
const SCRIPT_NAME = 'ScheduledProcessTestHarness';
const SCHEDULE_NAME = 'SPTestHarness';

const EL = {
    scriptCode: '#ctl00_ContentBody_dockDetail_C_txtScriptCode',
    save: '#ctl00_ContentBody_dockDetail_C_btnSave_input',
    callbackCheckbox: '#ctl00_ContentBody_dockDetail_C_chkCompletionCallback',
    callbackTimeout: '#ctl00_ContentBody_dockDetail_C_txtCompletionCallbackTimeout',
    callbackUnit: '#ctl00_ContentBody_dockDetail_C_cboCompletionCallbackUnitType',
    // Schedule dock panel fields
    schedEnabled: '#ctl00_ContentBody_dockDetail_C_chkEnabled',
    schedRecurrenceInterval: '#ctl00_ContentBody_dockDetail_C_txtRecurrenceInterval',
    schedRecurrenceUnit: '#ctl00_ContentBody_dockDetail_C_cboRecurrenceUnitType',
    schedRecurring: '#ctl00_ContentBody_dockDetail_C_chkRecurring',
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

function buildScript(config, callPostCompletion, scenarioId) {
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
    console.log('${scenarioId}: callPostCompletion=${callPostCompletion}');
    response.json(200, '${scenarioId}: postCompletion=${callPostCompletion}');
    try { await vvClient.sites.getSites({ q: "name eq 'home'" }); } catch(e) {}
    ${
        callPostCompletion
            ? `
    if (token) {
        try {
            await vvClient.scheduledProcess.postCompletion(token, 'complete', true, '${scenarioId} completed');
            console.log('postCompletion sent');
        } catch(e) { console.log('postCompletion error: ' + e.message); }
    }`
            : `
    console.log('postCompletion intentionally skipped');`
    }
};
`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function findAndOpenOP(page, opUrl, name) {
    await page.goto(opUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
    let pageNum = 0;
    while (pageNum < 20) {
        pageNum++;
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
        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
        if (!advanced) break;
    }
    return false;
}

async function findAndOpenSchedule(page, schedUrl, name) {
    await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
    let pageNum = 0;
    while (pageNum < 10) {
        pageNum++;
        const target = await page.evaluate((n) => {
            const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
            for (const r of rows) {
                const cells = r.querySelectorAll('td');
                const link = cells[1] && cells[1].querySelector('a[id*="lnkDetails"]');
                if (link && link.textContent.trim() === n) {
                    const m = (link.getAttribute('href') || '').match(/__doPostBack\('([^']+)'/);
                    return m ? m[1] : null;
                }
            }
            return null;
        }, name);
        if (target) {
            await vvAdmin.triggerPostback(page, target, 'scheduleradmin', 30000);
            await page.waitForTimeout(1000);
            return true;
        }
        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
        if (!advanced) break;
    }
    return false;
}

async function jsSet(page, selector, value) {
    await page.evaluate(
        ({ sel, val }) => {
            const el = document.querySelector(sel);
            if (!el) return;
            if (el.type === 'checkbox') el.checked = val;
            else if (el.tagName === 'SELECT') el.selectedIndex = val;
            else el.value = String(val);
        },
        { sel: selector, val: value }
    );
}

async function jsClick(page, selector) {
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.click();
    }, selector);
}

async function saveAndClose(page, urlMatch) {
    const resp = page
        .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(urlMatch), { timeout: 30000 })
        .catch(() => null);
    await jsClick(page, EL.save);
    await resp;
    await page.waitForTimeout(1000);
    await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
}

async function readScheduleGrid(page, schedUrl, name) {
    await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
    return page.evaluate((n) => {
        const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
        for (const r of rows) {
            const cells = Array.from(r.querySelectorAll('td'));
            const link = cells[1] && cells[1].querySelector('a');
            if (link && link.textContent.trim() === n) {
                return {
                    enabled: (cells[3] && cells[3].textContent.trim()) || '',
                    runState: (cells[4] && cells[4].textContent.trim()) || '',
                    lastRunDate: (cells[6] && cells[6].textContent.trim()) || '',
                    nextRunDate: (cells[8] && cells[8].textContent.trim()) || '',
                };
            }
        }
        return null;
    }, name);
}

async function readLog(page, schedUrl, name, max) {
    await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
    let viewTarget = null;
    let pageNum = 0;
    while (pageNum < 10 && !viewTarget) {
        pageNum++;
        viewTarget = await page.evaluate((n) => {
            const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
            for (const row of rows) {
                const cells = Array.from(row.querySelectorAll('td'));
                const nameLink = cells[1] && cells[1].querySelector('a');
                if (nameLink && nameLink.textContent.trim() === n) {
                    const viewLink = cells[2] && cells[2].querySelector('a');
                    if (viewLink) {
                        const m = (viewLink.getAttribute('href') || '').match(/__doPostBack\('([^']+)'/);
                        return m ? m[1] : null;
                    }
                }
            }
            return null;
        }, name);
        if (!viewTarget) {
            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
            if (!advanced) break;
        }
    }
    if (!viewTarget) return [];

    let logHtml = null;
    const rp = page
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
    await rp;
    await page.waitForTimeout(1000);

    const entries = [];
    if (logHtml) {
        const rowRe = /<tr[^>]*class="(?:rgRow|rgAltRow)"[^>]*>([\s\S]*?)<\/tr>/gi;
        let m;
        while ((m = rowRe.exec(logHtml)) && entries.length < max) {
            const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells = [];
            let cm;
            while ((cm = cellRe.exec(m[1]))) cells.push(cm[1].replace(/<[^>]+>/g, '').trim());
            if (cells.length >= 5 && cells.length <= 7) {
                entries.push({
                    scheduledDate: cells[1],
                    actualDate: cells[2],
                    completionDate: cells[3],
                    result: cells[4],
                    message: cells[5] || '',
                });
            }
        }
    }
    await page.evaluate(() => {
        document.querySelectorAll('.rwCloseButton, [title="Close"]').forEach((b) => b.click());
        document.querySelectorAll('[id*="dock"], .RadDock, .RadWindow').forEach((d) => (d.style.display = 'none'));
    });
    return entries;
}

async function waitForNewRun(page, schedUrl, name, beforeLastRun, maxWaitMs) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        const info = await readScheduleGrid(page, schedUrl, name);
        if (info && info.lastRunDate !== beforeLastRun && info.lastRunDate !== 'Not Run Yet') {
            return info;
        }
        console.log(
            `    Polling... lastRunDate=${info ? info.lastRunDate : '?'} (waiting for change from "${beforeLastRun}")`
        );
        await page.waitForTimeout(15000);
    }
    return null;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
    const config = loadConfig();
    const adminConfig = vvAdmin.loadEnvConfig('vvdemo', 'EmanuelJofre');
    const opUrl = vvAdmin.adminUrl(adminConfig, 'outsideprocessadmin');
    const schedUrl = vvAdmin.adminUrl(adminConfig, 'scheduleradmin');

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  Callback Behavior Test (via scheduler)                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const browser = await chromium.launch({ headless: !HEADED });
    const page = await browser.newPage();

    console.log('Logging in...');
    await vvAdmin.login(page, adminConfig);
    console.log('Logged in.\n');

    // Save original script
    console.log('Reading original script...');
    await findAndOpenOP(page, opUrl, SCRIPT_NAME);
    const origCallback = await page.evaluate((el) => {
        const cb = document.querySelector(el.callbackCheckbox);
        const to = document.querySelector(el.callbackTimeout);
        const u = document.querySelector(el.callbackUnit);
        return {
            enabled: cb ? cb.checked : false,
            timeout: to ? to.value : '0',
            unitIndex: u ? u.selectedIndex : 0,
        };
    }, EL);
    const origScript = await page.evaluate(() => {
        const ta = document.querySelector('#ctl00_ContentBody_dockDetail_C_txtScriptCode');
        return ta ? ta.value : null;
    });
    await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
    console.log(`  Original callback: enabled=${origCallback.enabled}, timeout=${origCallback.timeout}`);
    console.log(`  Original script: ${origScript ? origScript.length + ' chars' : 'NOT FOUND'}\n`);

    // Set schedule to Every 2 Minutes for fast iteration
    console.log('Configuring schedule for 2-minute recurrence...');
    await findAndOpenSchedule(page, schedUrl, SCHEDULE_NAME);
    await jsSet(page, EL.schedEnabled, true);
    await jsSet(page, EL.schedRecurring, true);
    await jsSet(page, EL.schedRecurrenceInterval, '2');
    await jsSet(page, EL.schedRecurrenceUnit, 0); // Minutes
    await saveAndClose(page, 'scheduleradmin');
    console.log('  Schedule set to Every 2 Minutes.\n');

    const scenarios = [
        { id: 'S1', name: 'Callback Disabled + postCompletion called', callbackEnabled: false, callPC: true },
        { id: 'S2', name: 'Callback Enabled + postCompletion called', callbackEnabled: true, callPC: true },
        { id: 'S3', name: 'Callback Enabled + postCompletion NOT called', callbackEnabled: true, callPC: false },
    ];

    const results = [];

    try {
        for (const sc of scenarios) {
            console.log(`━━━ ${sc.id}: ${sc.name} ━━━`);

            // Step 1: Configure microservice
            console.log('  Configuring microservice...');
            await findAndOpenOP(page, opUrl, SCRIPT_NAME);
            await jsSet(page, EL.callbackCheckbox, sc.callbackEnabled);
            await jsSet(page, EL.callbackTimeout, '1');
            await jsSet(page, EL.callbackUnit, 0);
            await page.evaluate(
                ({ sel, code }) => {
                    const ta = document.querySelector(sel);
                    if (ta) ta.value = code;
                },
                { sel: EL.scriptCode, code: buildScript(config, sc.callPC, sc.id) }
            );
            await saveAndClose(page, 'outsideprocessadmin');
            console.log(`  Callback=${sc.callbackEnabled}, postCompletion=${sc.callPC}`);

            // Step 2: Get current lastRunDate, then wait for a new run
            const before = await readScheduleGrid(page, schedUrl, SCHEDULE_NAME);
            const beforeLRD = before ? before.lastRunDate : 'Not Run Yet';
            console.log(`  Current lastRunDate: ${beforeLRD}`);
            console.log('  Waiting for scheduler to trigger (up to 4 min)...');

            const after = await waitForNewRun(page, schedUrl, SCHEDULE_NAME, beforeLRD, 240000);
            if (!after) {
                console.log('  TIMEOUT: scheduler did not trigger within 4 minutes.\n');
                results.push({ ...sc, error: 'Scheduler did not trigger', logEntry: null });
                continue;
            }
            console.log(`  New lastRunDate: ${after.lastRunDate}`);

            // For S3, wait extra time for the callback timeout to expire
            if (!sc.callPC && sc.callbackEnabled) {
                console.log('  Waiting 90s for callback timeout to expire...');
                await page.waitForTimeout(90000);
            }

            // Step 3: Read log
            console.log('  Reading log...');
            const log = await readLog(page, schedUrl, SCHEDULE_NAME, 3);
            for (const e of log) {
                console.log(
                    `    [${e.result}] Sched=${e.scheduledDate} | Actual=${e.actualDate} | Completion=${e.completionDate} | Msg=${e.message.substring(0, 60)}`
                );
            }
            console.log();

            results.push({
                id: sc.id,
                name: sc.name,
                callbackEnabled: sc.callbackEnabled,
                callPC: sc.callPC,
                lastRunDate: after.lastRunDate,
                logEntry: log[0] || null,
            });
        }
    } finally {
        // Restore
        console.log('Restoring original state...');
        try {
            await findAndOpenOP(page, opUrl, SCRIPT_NAME);
            await jsSet(page, EL.callbackCheckbox, origCallback.enabled);
            await jsSet(page, EL.callbackTimeout, origCallback.timeout);
            await jsSet(page, EL.callbackUnit, origCallback.unitIndex);
            if (origScript) {
                await page.evaluate(
                    ({ sel, code }) => {
                        const ta = document.querySelector(sel);
                        if (ta) ta.value = code;
                    },
                    { sel: EL.scriptCode, code: origScript }
                );
            }
            await saveAndClose(page, 'outsideprocessadmin');
            console.log('  Microservice restored.');
        } catch (e) {
            console.error('  Restore microservice failed:', e.message);
        }

        // Disable the schedule to stop frequent triggers
        try {
            await findAndOpenSchedule(page, schedUrl, SCHEDULE_NAME);
            await jsSet(page, EL.schedEnabled, false);
            await saveAndClose(page, 'scheduleradmin');
            console.log('  Schedule disabled.');
        } catch (e) {
            console.error('  Disable schedule failed:', e.message);
        }

        await browser.close();
    }

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  RESULTS                                                   ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('| Scenario | Callback | postCompletion | Result | Completion Date | Message |');
    console.log('|----------|----------|----------------|--------|-----------------|---------|');
    for (const r of results) {
        const cb = r.callbackEnabled ? 'Enabled' : 'Disabled';
        const pc = r.callPC ? 'Called' : 'SKIPPED';
        const result = r.logEntry ? r.logEntry.result : r.error || 'n/a';
        const comp = r.logEntry ? r.logEntry.completionDate : 'n/a';
        const msg = r.logEntry ? r.logEntry.message.substring(0, 40) : 'n/a';
        console.log(`| ${r.id} | ${cb} | ${pc} | ${result} | ${comp} | ${msg} |`);
    }

    if (results.length === 3 && results.every((r) => r.logEntry)) {
        console.log('\nKey comparison:');
        console.log(
            `  S1 Result=${results[0].logEntry.result} | S2 Result=${results[1].logEntry.result} | S3 Result=${results[2].logEntry.result}`
        );
        console.log(
            `  S1 Completion=${results[0].logEntry.completionDate} | S2 Completion=${results[1].logEntry.completionDate} | S3 Completion=${results[2].logEntry.completionDate}`
        );
    }

    const out = path.resolve(__dirname, '..', '..', 'projects', 'emanueljofre', 'sp-callback-scheduled-results.json');
    fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    console.log(`\nResults saved to: ${out}`);
}

main().catch((err) => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
