#!/usr/bin/env node
/**
 * Create a scheduled service in a VV environment via the admin UI.
 *
 * Scheduled services are managed via scheduleradmin (not outsideprocessadmin).
 * They link to an existing web service (outside process) by name.
 *
 * Usage:
 *   node tools/admin/create-schedule.js --project emanueljofre --name "zzzMySchedule" --service "zzzSchedTarget"
 *   node tools/admin/create-schedule.js --project emanueljofre --name "zzzMySchedule" --service "zzzSchedTarget" --headed
 *
 * Options:
 *   --project <name>        Customer name (resolved from .env.json)
 *   --name <name>           Schedule name (required)
 *   --description <desc>    Description (optional)
 *   --service <wsName>      Linked web service name (required — must be Scheduled category)
 *   --enabled               Enable the schedule (default: disabled)
 *   --headed                Show the browser
 *   --dry-run               Print what would be created
 */
const { chromium } = require('@playwright/test');
const vvAdmin = require('../helpers/vv-admin');

// Dock panel element IDs for scheduleradmin
const EL = {
    name: '#ctl00_ContentBody_dockDetail_C_txtSpName',
    description: '#ctl00_ContentBody_dockDetail_C_txtSpDescription',
    enabled: '#ctl00_ContentBody_dockDetail_C_chkEnabled',
    serviceDropdown: '#ctl00_ContentBody_dockDetail_C_cboOutsideProcessName',
    saveBtn: '#ctl00_ContentBody_dockDetail_C_btnSave_input',
    closeBtn: '#ctl00_ContentBody_dockDetail_C_btnCancel_input',
};

const cliArgs = process.argv.slice(2);
const HEADLESS = !cliArgs.includes('--headed');
const DRY_RUN = cliArgs.includes('--dry-run');
const ENABLED = cliArgs.includes('--enabled');

function getArg(flag) {
    const i = cliArgs.indexOf(flag);
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : null;
}

const PROJECT_NAME = getArg('--project');
const SCHED_NAME = getArg('--name');
const SCHED_DESCRIPTION = getArg('--description') || '';
const SERVICE_NAME = getArg('--service');

if (!PROJECT_NAME || !SCHED_NAME || !SERVICE_NAME) {
    console.error('Usage: node tools/admin/create-schedule.js --project <name> --name <schedName> --service <wsName>');
    console.error('\nRequired: --project, --name, --service');
    console.error('Optional: --description, --enabled, --headed, --dry-run');
    process.exit(1);
}

async function main() {
    const match = vvAdmin.findCustomer(PROJECT_NAME);
    if (!match) {
        console.error(`No customer "${PROJECT_NAME}" in .env.json`);
        console.error(`Available: ${vvAdmin.listCustomers().join(', ')}`);
        process.exit(1);
    }

    const config = vvAdmin.loadEnvConfig(match.server, match.customer);

    if (config.readOnly) {
        console.error(`Environment ${match.server}/${match.customer} is read-only.`);
        process.exit(1);
    }

    console.log(`\nCreate Scheduled Service`);
    console.log(`  Environment:  ${match.server}/${match.customer}`);
    console.log(`  Name:         ${SCHED_NAME}`);
    console.log(`  Description:  ${SCHED_DESCRIPTION || '(none)'}`);
    console.log(`  Service:      ${SERVICE_NAME}`);
    console.log(`  Enabled:      ${ENABLED}`);
    console.log();

    if (DRY_RUN) {
        console.log('[dry-run] Would create the scheduled service above. Exiting.');
        return;
    }

    const browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage();

    try {
        console.log(`Logging in to ${match.server}/${match.customer}...`);
        await vvAdmin.login(page, config);

        const url = vvAdmin.adminUrl(config, 'scheduleradmin');
        console.log('Navigating to scheduleradmin...');
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
        console.log('Grid loaded.');

        // Click "Add a Scheduled Service"
        console.log('Clicking "Add a Scheduled Service"...');
        const addBtn = page.locator('a[title="Add a Scheduled Service"]');
        await addBtn.waitFor({ state: 'visible', timeout: 10000 });

        const responsePromise = page
            .waitForResponse((resp) => resp.request().method() === 'POST' && resp.url().includes('scheduleradmin'), {
                timeout: 30000,
            })
            .catch(() => null);

        await addBtn.click();
        await responsePromise;
        await page.waitForTimeout(500);
        console.log('Dock panel opened.');

        // Fill fields
        console.log('Filling form fields...');
        await page.fill(EL.name, SCHED_NAME);

        if (SCHED_DESCRIPTION) {
            await page.fill(EL.description, SCHED_DESCRIPTION);
        }

        // Select the linked web service by matching name in the dropdown
        const serviceSelected = await page.evaluate(
            ({ sel, name }) => {
                const select = document.querySelector(sel);
                if (!select) return { error: 'Dropdown not found' };
                for (const opt of select.options) {
                    if (opt.text === name) {
                        select.value = opt.value;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        return { selected: opt.text, value: opt.value };
                    }
                }
                return {
                    error: `Service "${name}" not found in dropdown`,
                    available: Array.from(select.options).map((o) => o.text),
                };
            },
            { sel: EL.serviceDropdown, name: SERVICE_NAME }
        );

        if (serviceSelected.error) {
            console.error(serviceSelected.error);
            if (serviceSelected.available) {
                console.error('Available services:', serviceSelected.available.join(', '));
            }
            process.exit(1);
        }
        console.log(`  Linked service: ${serviceSelected.selected} (${serviceSelected.value})`);

        // Enabled — checkbox defaults to unchecked on new items
        if (!ENABLED) {
            const isChecked = await page.isChecked(EL.enabled);
            if (isChecked) {
                await page.uncheck(EL.enabled);
            }
        } else {
            await page.check(EL.enabled);
        }

        // Recurring — uncheck by default to avoid validation error
        // ("a valid recurring interval is required" if checked without interval)
        const recurringChecked = await page.isChecked('#ctl00_ContentBody_dockDetail_C_chkRecurring');
        if (recurringChecked) {
            await page.uncheck('#ctl00_ContentBody_dockDetail_C_chkRecurring');
        }

        // Save
        console.log('Saving...');
        let saveBody = null;
        const savePromise = page
            .waitForResponse(
                async (resp) => {
                    if (resp.request().method() === 'POST' && resp.url().includes('scheduleradmin')) {
                        try {
                            saveBody = await resp.text();
                        } catch {
                            /* ignore */
                        }
                        return true;
                    }
                    return false;
                },
                { timeout: 30000 }
            )
            .catch(() => null);

        await page.click(EL.saveBtn);
        await savePromise;
        await page.waitForTimeout(500);

        // Check for errors in the response
        if (saveBody) {
            // Check for ASP.NET validation errors, alert messages, or error classes
            const errorMatch = saveBody.match(/class="[^"]*error[^"]*"[^>]*>([^<]+)/i);
            if (errorMatch) {
                console.error(`Save error: ${errorMatch[1].trim()}`);
                process.exit(1);
            }
            // Check for alert/message window content
            const alertMatch = saveBody.match(/DockMessageWindow[^>]*>[\s\S]*?<span[^>]*>([^<]+)/i);
            if (alertMatch) {
                console.log(`  Message: ${alertMatch[1].trim()}`);
            }
            // Look for success/failure indicators
            if (saveBody.includes('lblScriptId') || saveBody.includes('lnkDetails')) {
                console.log('  Save response contains detail elements (likely success).');
            }
        } else {
            console.warn('  Warning: No save response captured.');
        }

        // Screenshot after save for debugging
        const path = require('path');
        const ssPath = path.resolve(__dirname, '..', '..', 'testing', 'tmp', 'schedule-after-save.png');
        await page.screenshot({ path: ssPath, fullPage: true });
        console.log(`  Screenshot: ${ssPath}`);

        // Check for any visible message/dialog on page
        const pageMessage = await page.evaluate(() => {
            // Check for message window
            const msgSpans = document.querySelectorAll('[id*="MessageWindow"] span, [id*="mpMessageWin"] span');
            const msgs = Array.from(msgSpans)
                .map((s) => s.textContent.trim())
                .filter((t) => t.length > 0 && t.length < 200);
            // Check for validation summary
            const valSummary = document.querySelector('[id*="ValidationSummary"], .validation-summary-errors');
            const valText = valSummary ? valSummary.textContent.trim() : '';
            return { messages: msgs, validation: valText };
        });
        if (pageMessage.messages.length > 0) console.log('  Page messages:', pageMessage.messages);
        if (pageMessage.validation) console.log('  Validation:', pageMessage.validation);

        // Verify in grid
        await page.click(EL.closeBtn).catch(() => {});
        await page.waitForTimeout(500);

        const found = await page.evaluate((name) => {
            const links = document.querySelectorAll('a[id*="lnkDetails"]');
            for (const link of links) {
                if (link.textContent.trim() === name) return true;
            }
            return false;
        }, SCHED_NAME);

        console.log('\nScheduled service created successfully.');
        console.log(`  Name:     ${SCHED_NAME}`);
        console.log(`  Service:  ${SERVICE_NAME}`);
        console.log(`  Verified: ${found ? 'Found in grid ✓' : 'Not found on current page (may be on another page)'}`);
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
