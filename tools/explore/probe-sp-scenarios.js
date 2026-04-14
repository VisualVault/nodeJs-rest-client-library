#!/usr/bin/env node

/**
 * Scheduled Process Behavior Test — 4 scenarios testing response.json() vs postCompletion().
 *
 * Phase 1: Local behavior test (what happens at the HTTP/API level)
 *   - Authenticates to EmanuelJofre
 *   - Runs 4 scenario functions with a mock Express response object
 *   - Calls the real VV postCompletion API with a placeholder GUID
 *   - Reports timing, behavior, and API responses
 *
 * Phase 2: VV platform test via Playwright (what VV actually records)
 *   - Edits the ScheduledProcessTestHarness script for each scenario
 *   - Triggers via the Test Microservice button in scheduleradmin
 *   - Reads the schedule log after each test
 *
 * Usage:
 *   node tools/explore/probe-sp-scenarios.js                # Phase 1 only (fast, no browser)
 *   node tools/explore/probe-sp-scenarios.js --phase2       # Phase 1 + Phase 2 (Playwright)
 *   node tools/explore/probe-sp-scenarios.js --phase2 --headed
 */

const path = require('path');
const fs = require('fs');

const PLACEHOLDER_TOKEN = '00000000-0000-0000-0000-000000000000';
const args = process.argv.slice(2);
const RUN_PHASE2 = args.includes('--phase2');
const HEADED = args.includes('--headed');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadEmanuelJofreConfig() {
    const envPath = path.resolve(__dirname, '..', '..', '.env.json');
    const raw = JSON.parse(fs.readFileSync(envPath, 'utf8'));
    const server = raw.servers && raw.servers['vvdemo'];
    if (!server) throw new Error('No "vvdemo" server in .env.json');
    const customer = server.customers && server.customers['EmanuelJofre'];
    if (!customer) throw new Error('No "EmanuelJofre" customer under vvdemo');
    return {
        baseUrl: server.baseUrl,
        customerAlias: customer.customerAlias,
        databaseAlias: customer.databaseAlias,
        clientId: customer.clientId,
        clientSecret: customer.clientSecret,
        username: customer.username,
        password: customer.loginPassword,
    };
}

function createMockResponse() {
    return {
        _called: false,
        _calledAt: null,
        _status: null,
        _body: null,
        _startedAt: Date.now(),
        json(status, body) {
            if (this._called) {
                console.log('    [WARN] response.json() called more than once!');
                return;
            }
            this._called = true;
            this._calledAt = Date.now();
            this._status = status;
            this._body = body;
        },
        get elapsed() {
            return this._calledAt ? this._calledAt - this._startedAt : null;
        },
        report() {
            if (!this._called) return '  response.json(): NEVER CALLED';
            return `  response.json(): called after ${this.elapsed}ms — status=${this._status}, body="${this._body}"`;
        },
    };
}

async function authenticate(config) {
    const clientLibrary = require(path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi'));
    const vvAuthorize = new clientLibrary.authorize();
    return vvAuthorize.getVaultApi(
        config.clientId,
        config.clientSecret,
        config.username,
        config.password,
        null,
        config.baseUrl,
        config.customerAlias,
        config.databaseAlias
    );
}

// ─── Scenario Definitions ─────────────────────────────────────────────────────

const scenarios = [
    {
        id: 'S1',
        name: 'Control (both calls)',
        description: 'response.json() immediately + postCompletion() at end',
        async run(vvClient, response, token) {
            response.json(200, 'S1: Control — both calls');
            await vvClient.sites.getSites({ q: "name eq 'home'" });
            if (token) {
                return vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'S1: completed');
            }
        },
    },
    {
        id: 'S2',
        name: 'No response.json()',
        description: 'Skip response.json(), only call postCompletion()',
        async run(vvClient, response, token) {
            // NO response.json() — connection stays open
            await vvClient.sites.getSites({ q: "name eq 'home'" });
            if (token) {
                return vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'S2: no response.json');
            }
        },
    },
    {
        id: 'S3',
        name: 'No postCompletion()',
        description: 'Call response.json() but skip postCompletion()',
        async run(vvClient, response, token) {
            response.json(200, 'S3: No postCompletion');
            await vvClient.sites.getSites({ q: "name eq 'home'" });
            // NO postCompletion() — VV never learns the job finished
        },
    },
    {
        id: 'S4',
        name: 'Late response.json() (10s delay)',
        description: 'Delay 10s before response.json(), then postCompletion()',
        async run(vvClient, response, token) {
            await vvClient.sites.getSites({ q: "name eq 'home'" });
            await new Promise((r) => setTimeout(r, 10000));
            response.json(200, 'S4: Late response after ~10s');
            if (token) {
                return vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'S4: late response completed');
            }
        },
    },
];

// ─── Phase 1: Local Behavior Test ─────────────────────────────────────────────

async function runPhase1() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 1: Local Behavior Test — response.json vs postCompletion  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const config = loadEmanuelJofreConfig();
    console.log(`Target: ${config.baseUrl} (${config.customerAlias}/${config.databaseAlias})\n`);

    console.log('Authenticating...');
    const vvClient = await authenticate(config);
    console.log('Authenticated.\n');

    // First: test what postCompletion returns with an invalid GUID
    console.log('━━━ Pre-test: postCompletion with placeholder GUID ━━━');
    try {
        const result = await vvClient.scheduledProcess.postCompletion(
            PLACEHOLDER_TOKEN,
            'complete',
            true,
            'test message'
        );
        const parsed = typeof result === 'string' ? JSON.parse(result) : result;
        console.log(`  API response: ${JSON.stringify(parsed, null, 2)}`);
    } catch (err) {
        console.log(`  API error: ${err.message}`);
    }
    console.log();

    // Run each scenario
    const results = [];

    for (const scenario of scenarios) {
        console.log(`━━━ ${scenario.id}: ${scenario.name} ━━━`);
        console.log(`  ${scenario.description}\n`);

        const mockRes = createMockResponse();
        const startTime = Date.now();
        let postCompletionResult = null;
        let postCompletionError = null;

        try {
            const result = await scenario.run(vvClient, mockRes, PLACEHOLDER_TOKEN);
            if (result !== undefined) {
                try {
                    postCompletionResult = typeof result === 'string' ? JSON.parse(result) : result;
                } catch {
                    postCompletionResult = result;
                }
            }
        } catch (err) {
            postCompletionError = err.message;
        }

        const totalTime = Date.now() - startTime;

        console.log(mockRes.report());
        console.log(`  Total execution time: ${totalTime}ms`);

        if (postCompletionResult) {
            const meta = postCompletionResult.meta || {};
            console.log(`  postCompletion API response: status=${meta.status}, code=${meta.code || 'n/a'}`);
            if (meta.errors && meta.errors.length > 0) {
                console.log(`  postCompletion errors: ${JSON.stringify(meta.errors)}`);
            }
        } else if (postCompletionError) {
            console.log(`  postCompletion ERROR: ${postCompletionError}`);
        } else if (scenario.id === 'S3') {
            console.log('  postCompletion: NOT CALLED (by design)');
        }

        console.log();

        results.push({
            id: scenario.id,
            name: scenario.name,
            responseJsonCalled: mockRes._called,
            responseJsonElapsed: mockRes.elapsed,
            responseBody: mockRes._body,
            totalTime,
            postCompletionResult: postCompletionResult ? postCompletionResult.meta : null,
            postCompletionError,
        });
    }

    // Summary table
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 1 SUMMARY                                                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('| Scenario | response.json | Time to respond | postCompletion | Total time |');
    console.log('|----------|--------------|-----------------|----------------|------------|');
    for (const r of results) {
        const rjCalled = r.responseJsonCalled ? 'Called' : 'NEVER';
        const rjTime = r.responseJsonElapsed !== null ? `${r.responseJsonElapsed}ms` : 'N/A';
        const pc = r.postCompletionResult
            ? `status ${r.postCompletionResult.status}`
            : r.postCompletionError
              ? 'ERROR'
              : 'skipped';
        console.log(`| ${r.id} | ${rjCalled} | ${rjTime} | ${pc} | ${r.totalTime}ms |`);
    }
    console.log();

    return results;
}

// ─── Phase 2: VV Platform Test via Playwright ─────────────────────────────────

async function runPhase2(config) {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 2: VV Platform Test — What does VV actually record?       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const { chromium } = require('playwright');
    const vvAdmin = require('../helpers/vv-admin');

    const adminConfig = vvAdmin.loadEnvConfig('vvdemo', 'EmanuelJofre');
    const browser = await chromium.launch({ headless: !HEADED });
    const page = await browser.newPage();

    console.log('Logging into EmanuelJofre...');
    await vvAdmin.login(page, adminConfig);
    console.log('Logged in.\n');

    // Build the scenario scripts with embedded credentials for VV's cloud server
    const scenarioScripts = buildVVScripts(config);

    // Read original script content from outsideprocessadmin
    const opUrl = vvAdmin.adminUrl(adminConfig, 'outsideprocessadmin');
    const schedUrl = vvAdmin.adminUrl(adminConfig, 'scheduleradmin');

    let originalScript = null;
    const results = [];

    try {
        // Save original script
        console.log('Saving original ScheduledProcessTestHarness script...');
        originalScript = await readOutsideProcessScript(page, opUrl, 'ScheduledProcessTestHarness');
        if (originalScript) {
            console.log(`  Original script saved (${originalScript.length} chars).\n`);
        } else {
            console.log('  WARNING: Could not read original script. Will not restore.\n');
        }

        for (const [idx, scenario] of scenarioScripts.entries()) {
            console.log(`━━━ ${scenario.id}: ${scenario.name} ━━━`);

            // Step 1: Edit the script in outsideprocessadmin
            console.log('  Editing script in outsideprocessadmin...');
            await editOutsideProcessScript(page, opUrl, 'ScheduledProcessTestHarness', scenario.code);
            console.log('  Script updated and saved.');

            // Step 2: Navigate to scheduleradmin and test
            console.log('  Triggering Test Microservice...');
            await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

            const testResult = await triggerTestMicroservice(
                page,
                'SPTestHarness',
                schedUrl,
                scenario.timeout || 60000
            );
            console.log(`  Dialog result: ${testResult.dialogMessage || 'NO DIALOG'}`);
            console.log(`  Response time: ${testResult.elapsed}ms`);
            if (testResult.timedOut) console.log('  ⚠ Test Microservice TIMED OUT');

            // Step 3: Read the schedule log
            console.log('  Reading schedule log...');
            await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
            const logEntries = await readScheduleLog(page, 'SPTestHarness', schedUrl, 3);
            console.log(`  Log entries (latest ${logEntries.length}):`);
            for (const e of logEntries) {
                console.log(`    [${e.result}] ${e.scheduledDate} | ${e.completionDate} | ${e.message}`);
            }

            results.push({
                id: scenario.id,
                name: scenario.name,
                dialogMessage: testResult.dialogMessage,
                timedOut: testResult.timedOut,
                elapsed: testResult.elapsed,
                logEntries,
            });

            console.log();

            // Brief pause between scenarios
            if (idx < scenarioScripts.length - 1) {
                await page.waitForTimeout(3000);
            }
        }
    } finally {
        // Restore original script
        if (originalScript) {
            console.log('Restoring original ScheduledProcessTestHarness script...');
            try {
                await editOutsideProcessScript(page, opUrl, 'ScheduledProcessTestHarness', originalScript);
                console.log('Original script restored.\n');
            } catch (err) {
                console.error(`Failed to restore original script: ${err.message}`);
            }
        }
        await browser.close();
    }

    // Phase 2 Summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 2 SUMMARY                                                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('| Scenario | Dialog | Timed Out | Response Time | Latest Log Result | Latest Log Message |');
    console.log('|----------|--------|-----------|---------------|-------------------|-------------------|');
    for (const r of results) {
        const dialog = r.dialogMessage ? r.dialogMessage.substring(0, 40) : '(none)';
        const timedOut = r.timedOut ? 'YES' : 'no';
        const logResult = r.logEntries[0] ? r.logEntries[0].result : 'n/a';
        const logMsg = r.logEntries[0] ? r.logEntries[0].message.substring(0, 40) : 'n/a';
        console.log(`| ${r.id} | ${dialog} | ${timedOut} | ${r.elapsed}ms | ${logResult} | ${logMsg} |`);
    }

    return results;
}

// ─── Phase 2 Helpers ──────────────────────────────────────────────────────────

function buildVVScripts(config) {
    const creds = `
module.exports.getCredentials = function () {
    return {
        customerAlias: '${config.customerAlias}',
        databaseAlias: '${config.databaseAlias}',
        clientId: '${config.clientId}',
        clientSecret: '${config.clientSecret}',
        userId: '${config.clientId}',
        password: '${config.clientSecret}',
    };
};`;

    return [
        {
            id: 'S1',
            name: 'Control (both calls)',
            code: `${creds}
module.exports.main = async function (vvClient, response, token) {
    response.json(200, 'S1: Control — both calls');
    try { await vvClient.sites.getSites({ q: "name eq 'home'" }); } catch(e) {}
    if (token) {
        await vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'S1 completed');
    }
};`,
        },
        {
            id: 'S2',
            name: 'No response.json()',
            timeout: 90000,
            code: `${creds}
module.exports.main = async function (vvClient, response, token) {
    // NO response.json() — HTTP connection stays open
    try { await vvClient.sites.getSites({ q: "name eq 'home'" }); } catch(e) {}
    if (token) {
        await vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'S2 no response.json');
    }
    // Script ends, but Express res.json() never called — connection open until VV timeout
};`,
        },
        {
            id: 'S3',
            name: 'No postCompletion()',
            code: `${creds}
module.exports.main = async function (vvClient, response, token) {
    response.json(200, 'S3: No postCompletion');
    try { await vvClient.sites.getSites({ q: "name eq 'home'" }); } catch(e) {}
    // NO postCompletion() — VV never learns the job finished
};`,
        },
        {
            id: 'S4',
            name: 'Late response.json() (10s delay)',
            timeout: 90000,
            code: `${creds}
module.exports.main = async function (vvClient, response, token) {
    try { await vvClient.sites.getSites({ q: "name eq 'home'" }); } catch(e) {}
    await new Promise(function(r) { setTimeout(r, 10000); });
    response.json(200, 'S4: Late response after ~10s delay');
    if (token) {
        await vvClient.scheduledProcess.postCompletion(token, 'complete', true, 'S4 late response completed');
    }
};`,
        },
    ];
}

async function readOutsideProcessScript(page, opUrl, scriptName) {
    await page.goto(opUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    // Find the script across pages
    let pageNum = 0;
    const vvAdmin = require('../helpers/vv-admin');

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
            // Open dock panel and capture script content
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

async function editOutsideProcessScript(page, opUrl, scriptName, newCode) {
    const vvAdmin = require('../helpers/vv-admin');

    await page.goto(opUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    // Find the script across pages
    let pageNum = 0;

    while (pageNum < 20) {
        pageNum++;
        const linkData = await page.evaluate((name) => {
            const links = document.querySelectorAll('a[id*="lnkDetails"]');
            for (const a of links) {
                if (a.textContent.trim() === name) {
                    const href = a.getAttribute('href') || '';
                    const m = href.match(/__doPostBack\('([^']+)'/);
                    return { id: a.id, postbackTarget: m ? m[1] : null };
                }
            }
            return null;
        }, scriptName);

        if (linkData && linkData.postbackTarget) {
            // Open dock panel
            await vvAdmin.triggerPostback(page, linkData.postbackTarget, 'outsideprocessadmin', 30000);
            await page.waitForTimeout(1000);

            // Set textarea content
            const textareaSelector = '#ctl00_ContentBody_dockDetail_C_txtScriptCode';
            await page.waitForSelector(textareaSelector, { timeout: 10000 });
            await page.evaluate(
                ({ sel, code }) => {
                    const ta = document.querySelector(sel);
                    if (ta) ta.value = code;
                },
                { sel: textareaSelector, code: newCode }
            );

            // Click Save via JS
            const saveResp = page
                .waitForResponse(
                    (resp) => resp.request().method() === 'POST' && resp.url().includes('outsideprocessadmin'),
                    { timeout: 30000 }
                )
                .catch(() => null);

            await page.evaluate(() => {
                const btn = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnSave_input');
                if (btn) btn.click();
            });
            await saveResp;
            await page.waitForTimeout(1000);

            // Close dock panel
            await vvAdmin.hideDockPanel(page, '[id*="dockDetail"]');
            return;
        }

        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
        if (!advanced) break;
    }

    throw new Error(`Outside process "${scriptName}" not found`);
}

async function triggerTestMicroservice(page, scheduleName, schedUrl, timeout = 60000) {
    const vvAdmin = require('../helpers/vv-admin');

    // Find the schedule
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
                    return { postbackTarget: m ? m[1] : null };
                }
            }
            return null;
        }, scheduleName);

        if (!row) {
            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
            if (!advanced) break;
        }
    }

    if (!row || !row.postbackTarget) {
        return { dialogMessage: null, timedOut: false, elapsed: 0, error: 'Schedule not found' };
    }

    // Open dock panel
    await vvAdmin.triggerPostback(page, row.postbackTarget, 'scheduleradmin', 30000);
    await page.waitForTimeout(1000);

    // Enable schedule if needed
    const isEnabled = await page.evaluate(() => {
        const cb = document.querySelector('#ctl00_ContentBody_dockDetail_C_chkEnabled');
        return cb ? cb.checked : true;
    });
    if (!isEnabled) {
        await page.evaluate(() => {
            const cb = document.querySelector('#ctl00_ContentBody_dockDetail_C_chkEnabled');
            if (cb) cb.checked = true;
        });
        const saveResp = page
            .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('scheduleradmin'), {
                timeout: 30000,
            })
            .catch(() => null);
        await page.evaluate(() => {
            const btn = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnSave_input');
            if (btn) btn.click();
        });
        await saveResp;
        await page.waitForTimeout(1000);

        // Re-navigate and re-open dock panel
        await page.goto(schedUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        // Re-find and re-open
        row = null;
        pageNum = 0;
        while (pageNum < 10 && !row) {
            pageNum++;
            row = await page.evaluate((name) => {
                const rows = document.querySelectorAll(
                    '.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow'
                );
                for (const r of rows) {
                    const cells = r.querySelectorAll('td');
                    const link = cells[1] && cells[1].querySelector('a[id*="lnkDetails"]');
                    if (link && link.textContent.trim() === name) {
                        const href = link.getAttribute('href') || '';
                        const m = href.match(/__doPostBack\('([^']+)'/);
                        return { postbackTarget: m ? m[1] : null };
                    }
                }
                return null;
            }, scheduleName);
            if (!row) {
                const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
                if (!advanced) break;
            }
        }
        await vvAdmin.triggerPostback(page, row.postbackTarget, 'scheduleradmin', 30000);
        await page.waitForTimeout(1000);
    }

    // Click Test Microservice
    const testClickTime = Date.now();
    const testResp = page
        .waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('scheduleradmin'), { timeout })
        .catch(() => null);

    // Use JS-level click to bypass visibility issues with RadDock panel
    const btnExists = await page.evaluate(() => {
        const btn = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnTest_input');
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    });
    if (!btnExists) {
        return { dialogMessage: null, timedOut: false, elapsed: 0, error: 'Test button not found in DOM' };
    }

    let timedOut = false;
    await Promise.race([
        testResp,
        new Promise((resolve) =>
            setTimeout(() => {
                timedOut = true;
                resolve(null);
            }, timeout)
        ),
    ]);

    await page.waitForTimeout(2000);
    const elapsed = Date.now() - testClickTime;

    // Read dialog message
    const dialogMessage = await page.evaluate(() => {
        const el = document.querySelector('[id*="DockMessageWindow"]');
        if (el) {
            const text = el.textContent.trim().replace(/\s+/g, ' ');
            // Strip the "Response from OutsideProcess" title and OK button text
            return text
                .replace(/Response from OutsideProcess/gi, '')
                .replace(/OK/g, '')
                .trim();
        }
        // Also check RadWindow content
        const rw = document.querySelector('.rwWindowContent');
        return rw ? rw.textContent.trim() : null;
    });

    // Dismiss dialog and close dock panel via JS (avoid Playwright visibility issues)
    await page.evaluate(() => {
        const okBtn = document.querySelector('#ctl00_mpMessageWin_DockMessageWindow_C_Button1a_input');
        if (okBtn) okBtn.click();
        const cancelBtn = document.querySelector('#ctl00_ContentBody_dockDetail_C_btnCancel_input');
        if (cancelBtn) cancelBtn.click();
    });
    await page.waitForTimeout(500);

    return { dialogMessage, timedOut, elapsed };
}

async function readScheduleLog(page, scheduleName, schedUrl, maxEntries) {
    const vvAdmin = require('../helpers/vv-admin');

    // Find the View link for this schedule
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

    // Open the log panel
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

    await page.addScriptTag({
        content: `__doPostBack('${viewTarget.replace(/'/g, "\\'")}', '');`,
    });
    await responsePromise;
    await page.waitForTimeout(1000);

    // Parse log entries from captured HTML
    const entries = [];
    if (logHtml) {
        const rowRegex = /<tr[^>]*class="(?:rgRow|rgAltRow)"[^>]*>([\s\S]*?)<\/tr>/gi;
        let match;
        while ((match = rowRegex.exec(logHtml)) && entries.length < maxEntries) {
            const rowHtml = match[1];
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells = [];
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowHtml))) {
                cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
            }
            if (cells.length >= 5 && cells.length <= 7) {
                entries.push({
                    row: cells[0] || '',
                    scheduledDate: cells[1] || '',
                    actualDate: cells[2] || '',
                    completionDate: cells[3] || '',
                    result: cells[4] || '',
                    message: cells[5] || '',
                });
            }
        }
    }

    // Close any panels
    await page.evaluate(() => {
        document.querySelectorAll('.rwCloseButton, [title="Close"]').forEach((b) => b.click());
        document.querySelectorAll('[id*="dock"], .RadDock, .RadWindow').forEach((d) => (d.style.display = 'none'));
    });
    await page.waitForTimeout(300);

    return entries;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const config = loadEmanuelJofreConfig();
    const PHASE2_ONLY = args.includes('--phase2-only');

    let phase1Results = null;
    if (!PHASE2_ONLY) {
        phase1Results = await runPhase1();
    }

    if (RUN_PHASE2 || PHASE2_ONLY) {
        await runPhase2(config);
    } else {
        console.log('Phase 2 (VV platform test) skipped. Run with --phase2 to include.\n');
    }

    // Save results
    const outputPath = path.resolve(__dirname, '..', '..', 'projects', 'emanueljofre', 'sp-scenario-results.json');
    fs.writeFileSync(
        outputPath,
        JSON.stringify({ generatedAt: new Date().toISOString(), phase1: phase1Results }, null, 2)
    );
    console.log(`Results saved to: ${outputPath}`);
}

main().catch((err) => {
    console.error('Fatal:', err.message || err);
    process.exit(1);
});
