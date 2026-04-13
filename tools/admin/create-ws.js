#!/usr/bin/env node
/**
 * Create a web service (outside process) in a VV environment via the admin UI.
 *
 * There is no REST API for creating web services — this uses Playwright to
 * automate the outsideprocessadmin page.
 *
 * Usage:
 *   node tools/admin/create-ws.js --project emanueljofre --name "zzzMyService" --category form
 *   node tools/admin/create-ws.js --project emanueljofre --name "zzzMyService" --category form --script "response.json(200, 'ok')"
 *   node tools/admin/create-ws.js --project emanueljofre --name "zzzMyService" --category form --script-file ./path/to/script.js
 *   node tools/admin/create-ws.js --project emanueljofre --name "zzzMyService" --description "test" --category workflow --headed
 *
 * Options:
 *   --project <name>        Customer name (case-insensitive, resolved from .env.json)
 *   --name <name>           Web service name (required)
 *   --description <desc>    Service description (optional, defaults to "")
 *   --category <cat>        Category alias (see below) — defaults to "form"
 *   --connection <type>     Connection type: "nodejs" (default) or "webservice"
 *   --script <code>         Inline script source code
 *   --script-file <path>    Path to a .js file with the script source
 *   --timeout <ms>          Service timeout in seconds (optional)
 *   --headed                Show the browser
 *   --dry-run               Print what would be created without doing it
 *
 * Category aliases:
 *   form       → Form Controls (0)
 *   scheduled  → Scheduled Service (1)
 *   query      → Web Service Data Query (2)
 *   2fa        → Two Factor Authentication (3)
 *   session    → User Session End (4)
 *   nodejs     → Node.Js Script Service (5)
 *   workflow   → Form Workflow Web Service (6)
 *   docflow    → Document Workflow Web Service (7)
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vvAdmin = require('../helpers/vv-admin');

// --- Category mapping ---

const CATEGORY_MAP = {
    form: { value: '0', label: 'Form Controls' },
    scheduled: { value: '1', label: 'Scheduled Service' },
    query: { value: '2', label: 'Web Service Data Query' },
    '2fa': { value: '3', label: 'Two Factor Authentication' },
    session: { value: '4', label: 'User Session End' },
    nodejs: { value: '5', label: 'Node.Js Script Service' },
    workflow: { value: '6', label: 'Form Workflow Web Service' },
    docflow: { value: '7', label: 'Document Workflow Web Service' },
};

const CONNECTION_MAP = {
    webservice: { value: '1', label: 'Web Service' },
    nodejs: { value: '2', label: 'Node.Js Server' },
};

// --- Dock panel element IDs ---

const EL = {
    name: '#ctl00_ContentBody_dockDetail_C_txtOpName',
    description: '#ctl00_ContentBody_dockDetail_C_txtDescription',
    category: '#ctl00_ContentBody_dockDetail_C_ddlCategory',
    connectionType: '#ctl00_ContentBody_dockDetail_C_ddlConnectionType',
    timeout: '#ctl00_ContentBody_dockDetail_C_txtServiceTimeout',
    scriptCode: '#ctl00_ContentBody_dockDetail_C_txtScriptCode',
    wsUrl: '#ctl00_ContentBody_dockDetail_C_txtWSURL',
    saveBtn: '#ctl00_ContentBody_dockDetail_C_btnSave_input',
    closeBtn: '#ctl00_ContentBody_dockDetail_C_btnCancel_input',
    scriptIdLabel: '[id*="lblScriptId"]',
};

// --- CLI ---

const cliArgs = process.argv.slice(2);
const HEADLESS = !cliArgs.includes('--headed');
const DRY_RUN = cliArgs.includes('--dry-run');

function getArg(flag) {
    const i = cliArgs.indexOf(flag);
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : null;
}

const PROJECT_NAME = getArg('--project');
const WS_NAME = getArg('--name');
const WS_DESCRIPTION = getArg('--description') || '';
const CATEGORY_ALIAS = (getArg('--category') || 'form').toLowerCase();
const CONNECTION_ALIAS = (getArg('--connection') || 'nodejs').toLowerCase();
const SCRIPT_INLINE = getArg('--script');
const SCRIPT_FILE = getArg('--script-file');
const SERVICE_TIMEOUT = getArg('--timeout');

// --- Validation ---

if (!PROJECT_NAME || !WS_NAME) {
    console.error('Usage: node tools/admin/create-ws.js --project <name> --name <wsName> [options]');
    console.error('\nRequired: --project, --name');
    console.error(
        'Optional: --description, --category, --connection, --script, --script-file, --timeout, --headed, --dry-run'
    );
    console.error(`\nCategories: ${Object.keys(CATEGORY_MAP).join(', ')}`);
    console.error(`Connections: ${Object.keys(CONNECTION_MAP).join(', ')}`);
    process.exit(1);
}

const category = CATEGORY_MAP[CATEGORY_ALIAS];
if (!category) {
    console.error(`Unknown category "${CATEGORY_ALIAS}". Valid: ${Object.keys(CATEGORY_MAP).join(', ')}`);
    process.exit(1);
}

const connection = CONNECTION_MAP[CONNECTION_ALIAS];
if (!connection) {
    console.error(`Unknown connection "${CONNECTION_ALIAS}". Valid: ${Object.keys(CONNECTION_MAP).join(', ')}`);
    process.exit(1);
}

let scriptSource = '';
if (SCRIPT_FILE) {
    const filePath = path.resolve(SCRIPT_FILE);
    if (!fs.existsSync(filePath)) {
        console.error(`Script file not found: ${filePath}`);
        process.exit(1);
    }
    scriptSource = fs.readFileSync(filePath, 'utf8');
} else if (SCRIPT_INLINE) {
    scriptSource = SCRIPT_INLINE;
}

// --- Main ---

async function main() {
    const match = vvAdmin.findCustomer(PROJECT_NAME);
    if (!match) {
        console.error(`No customer "${PROJECT_NAME}" in .env.json`);
        console.error(`Available: ${vvAdmin.listCustomers().join(', ')}`);
        process.exit(1);
    }

    const config = vvAdmin.loadEnvConfig(match.server, match.customer);

    if (config.readOnly) {
        console.error(`Environment ${match.server}/${match.customer} is read-only. Cannot create web services.`);
        process.exit(1);
    }

    console.log(`\nCreate Web Service`);
    console.log(`  Environment:  ${match.server}/${match.customer}`);
    console.log(`  Name:         ${WS_NAME}`);
    console.log(`  Description:  ${WS_DESCRIPTION || '(none)'}`);
    console.log(`  Category:     ${category.label} (${category.value})`);
    console.log(`  Connection:   ${connection.label} (${connection.value})`);
    console.log(`  Script:       ${scriptSource ? `${scriptSource.length} chars` : '(none)'}`);
    if (SERVICE_TIMEOUT) console.log(`  Timeout:      ${SERVICE_TIMEOUT}s`);
    console.log();

    if (DRY_RUN) {
        console.log('[dry-run] Would create the web service above. Exiting.');
        return;
    }

    const browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage();

    try {
        // 1. Login
        console.log(`Logging in to ${match.server}/${match.customer}...`);
        await vvAdmin.login(page, config);

        // 2. Navigate to outsideprocessadmin
        const url = vvAdmin.adminUrl(config, 'outsideprocessadmin');
        console.log(`Navigating to outsideprocessadmin...`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
        console.log('Grid loaded.');

        // 3. Click "Add Service" toolbar button
        console.log('Clicking "Add Service"...');
        const addBtn = page.locator('a[title="AddOutsideProcess"]');
        await addBtn.waitFor({ state: 'visible', timeout: 10000 });

        // Intercept the AJAX response from clicking Add — capture body inline
        let addResponseBody = null;
        const responsePromise = page
            .waitForResponse(
                async (resp) => {
                    if (resp.request().method() === 'POST' && resp.url().includes('outsideprocessadmin')) {
                        try {
                            addResponseBody = await resp.text();
                        } catch {
                            /* body may not be available */
                        }
                        return true;
                    }
                    return false;
                },
                { timeout: 30000 }
            )
            .catch(() => null);

        await addBtn.click();
        await responsePromise;
        console.log('Dock panel opened.');

        // 4. Wait for the name field to be visible/ready
        await page.waitForTimeout(500);

        // 5. Fill in the form fields
        console.log('Filling form fields...');

        // Connection type FIRST — triggers a partial postback that reloads the dock
        // panel and switches between txtWSURL (external) and txtScriptCode (Node.js).
        // Must complete before filling other fields (postback resets them).
        if (connection.value !== '1') {
            console.log(`Switching connection type to ${connection.label}...`);
            await page.selectOption(EL.connectionType, connection.value);
            await vvAdmin.triggerPostback(
                page,
                'ctl00$ContentBody$dockDetail$C$ddlConnectionType',
                'outsideprocessadmin',
                15000
            );
            console.log('Connection type postback completed.');
        }

        // Category
        await page.selectOption(EL.category, category.value);

        // Name (filled after connection type postback to avoid reset)
        await page.fill(EL.name, WS_NAME);

        // Description
        if (WS_DESCRIPTION) {
            await page.fill(EL.description, WS_DESCRIPTION);
        }

        // Timeout
        if (SERVICE_TIMEOUT) {
            await page.fill(EL.timeout, SERVICE_TIMEOUT);
        }

        // Script code — try the Node.js script textarea first, fall back to WS URL textarea
        if (scriptSource) {
            const scriptField = await page.$(EL.scriptCode);
            if (scriptField) {
                console.log('Filling script code (txtScriptCode)...');
                await page.fill(EL.scriptCode, scriptSource);
            } else {
                // The script code field may not be present for new services.
                // Use the WS URL textarea as fallback — on Node.Js services this
                // often doubles as the script input.
                const wsUrlField = await page.$(EL.wsUrl);
                if (wsUrlField) {
                    console.log('Filling script/URL (txtWSURL)...');
                    // txtWSURL is a Telerik RadTextBox — need to set value via JS
                    await page.evaluate(
                        ({ sel, val }) => {
                            const el = document.querySelector(sel);
                            if (el) {
                                el.value = val;
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        },
                        { sel: EL.wsUrl, val: scriptSource }
                    );
                } else {
                    console.warn('Warning: No script code or URL field found. Saving without script.');
                }
            }
        }

        // 6. Click Save
        console.log('Saving...');
        let saveBody = null;
        const saveResponsePromise = page
            .waitForResponse(
                async (resp) => {
                    if (resp.request().method() === 'POST' && resp.url().includes('outsideprocessadmin')) {
                        try {
                            saveBody = await resp.text();
                        } catch {
                            /* body may not be available */
                        }
                        return true;
                    }
                    return false;
                },
                { timeout: 30000 }
            )
            .catch(() => null);

        await page.click(EL.saveBtn);
        await saveResponsePromise;
        await page.waitForTimeout(500);

        // Check for error messages in the response
        if (saveBody) {
            const errorMatch = saveBody.match(/class="[^"]*error[^"]*"[^>]*>([^<]+)/i);
            if (errorMatch) {
                console.error(`Save error: ${errorMatch[1].trim()}`);
                process.exit(1);
            }
        }

        // Try to extract the script ID from the response or DOM
        let scriptId = null;
        if (saveBody) {
            const scriptIdMatch = saveBody.match(/lblScriptId[^>]*>([^<]+)/i);
            scriptId = scriptIdMatch ? scriptIdMatch[1].trim() : null;
        }
        if (!scriptId) {
            scriptId = await page.evaluate(() => {
                const el = document.querySelector('[id*="lblScriptId"]');
                return el ? el.textContent.trim() : null;
            });
        }

        console.log('\nWeb service created successfully.');
        console.log(`  Name:      ${WS_NAME}`);
        if (scriptId) console.log(`  Script ID: ${scriptId}`);

        // 7. Verify — check the grid for the new entry
        // Close the dock panel first
        await page.click(EL.closeBtn).catch(() => {});
        await page.waitForTimeout(500);

        // Search for the new WS in the grid
        const found = await page.evaluate((wsName) => {
            const links = document.querySelectorAll('a[id*="lnkDetails"]');
            for (const link of links) {
                if (link.textContent.trim() === wsName) return true;
            }
            return false;
        }, WS_NAME);

        if (found) {
            console.log(`  Verified:  Found in grid ✓`);
        } else {
            console.log(`  Verified:  Not found on current grid page (may be on another page)`);
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
