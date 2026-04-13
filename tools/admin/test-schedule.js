#!/usr/bin/env node
/**
 * Test a scheduled service end-to-end:
 * 1. Open the schedule in the dock panel
 * 2. Enable it (if needed)
 * 3. Click "Test Microservice" to trigger immediate execution
 * 4. Poll the grid for "Last Run Date" to change from its current value
 * 5. Report the result
 *
 * Usage:
 *   node tools/admin/test-schedule.js --project emanueljofre --name "zzzSched_Underscore2" [--headed]
 */
const { chromium } = require('@playwright/test');
const vvAdmin = require('../helpers/vv-admin');

const cliArgs = process.argv.slice(2);
const HEADLESS = !cliArgs.includes('--headed');

function getArg(flag) {
    const i = cliArgs.indexOf(flag);
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : null;
}

const PROJECT_NAME = getArg('--project');
const SCHED_NAME = getArg('--name');

if (!PROJECT_NAME || !SCHED_NAME) {
    console.error('Usage: node tools/admin/test-schedule.js --project <name> --name <scheduleName> [--headed]');
    process.exit(1);
}

// Grid column indices for scheduleradmin
const COL = {
    name: 1,
    enabled: 3,
    runState: 4,
    lastRunDate: 6,
    recurrence: 7,
    nextRunDate: 8,
    serviceName: 9,
};

async function readScheduleRow(page, scheduleName) {
    return page.evaluate(
        ({ name, cols }) => {
            const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                const link = cells[cols.name]?.querySelector('a[id*="lnkDetails"]');
                if (link && link.textContent.trim() === name) {
                    return {
                        name: link.textContent.trim(),
                        linkId: link.id,
                        postbackTarget: (link.getAttribute('href') || '').match(/__doPostBack\('([^']+)'/)?.[1] || null,
                        enabled: cells[cols.enabled]?.textContent.trim() || '',
                        runState: cells[cols.runState]?.textContent.trim() || '',
                        lastRunDate: cells[cols.lastRunDate]?.textContent.trim() || '',
                        recurrence: cells[cols.recurrence]?.textContent.trim() || '',
                        nextRunDate: cells[cols.nextRunDate]?.textContent.trim() || '',
                        serviceName: cells[cols.serviceName]?.textContent.trim() || '',
                    };
                }
            }
            return null;
        },
        { name: scheduleName, cols: COL }
    );
}

async function main() {
    const match = vvAdmin.findCustomer(PROJECT_NAME);
    if (!match) {
        console.error(`No customer "${PROJECT_NAME}" in .env.json`);
        process.exit(1);
    }

    const config = vvAdmin.loadEnvConfig(match.server, match.customer);
    const browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage();

    try {
        console.log(`Logging in to ${match.server}/${match.customer}...`);
        await vvAdmin.login(page, config);

        const url = vvAdmin.adminUrl(config, 'scheduleradmin');
        console.log('Navigating to scheduleradmin...');
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        // Find the schedule in the grid (may need pagination)
        let scheduleRow = null;
        let pageNum = 1;
        while (!scheduleRow) {
            scheduleRow = await readScheduleRow(page, SCHED_NAME);
            if (!scheduleRow) {
                const hasNext = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
                if (!hasNext) break;
                pageNum++;
            }
        }

        if (!scheduleRow) {
            console.error(`Schedule "${SCHED_NAME}" not found in grid.`);
            process.exit(1);
        }

        console.log('\nSchedule found:');
        console.log(`  Name:         ${scheduleRow.name}`);
        console.log(`  Enabled:      ${scheduleRow.enabled}`);
        console.log(`  Run State:    ${scheduleRow.runState}`);
        console.log(`  Last Run:     ${scheduleRow.lastRunDate}`);
        console.log(`  Recurrence:   ${scheduleRow.recurrence}`);
        console.log(`  Service:      ${scheduleRow.serviceName}`);

        const beforeLastRun = scheduleRow.lastRunDate;

        // Open the dock panel by clicking the schedule name link
        console.log('\nOpening dock panel...');
        if (!scheduleRow.postbackTarget) {
            console.error('No postback target found for schedule link.');
            process.exit(1);
        }

        const detailResponse = page
            .waitForResponse((resp) => resp.request().method() === 'POST' && resp.url().includes('scheduleradmin'), {
                timeout: 30000,
            })
            .catch(() => null);

        await vvAdmin.triggerPostback(page, scheduleRow.postbackTarget, 'scheduleradmin', 30000);
        await detailResponse;
        await page.waitForTimeout(1000);

        // Check if "Test Microservice" button is visible
        const testBtn = await page.$('#ctl00_ContentBody_dockDetail_C_btnTest_input');
        if (!testBtn) {
            console.error('"Test Microservice" button not found in dock panel.');
            process.exit(1);
        }
        console.log('"Test Microservice" button found.');

        // Check if schedule is enabled — it must be enabled to test
        const enabledCheckbox = await page.$('#ctl00_ContentBody_dockDetail_C_chkEnabled');
        if (enabledCheckbox) {
            const isEnabled = await page.isChecked('#ctl00_ContentBody_dockDetail_C_chkEnabled');
            if (!isEnabled) {
                console.log('Schedule is disabled. Enabling it first...');
                await page.check('#ctl00_ContentBody_dockDetail_C_chkEnabled');
                // Save the enabled state
                const saveResp = page
                    .waitForResponse(
                        (resp) => resp.request().method() === 'POST' && resp.url().includes('scheduleradmin'),
                        { timeout: 30000 }
                    )
                    .catch(() => null);
                await page.click('#ctl00_ContentBody_dockDetail_C_btnSave_input');
                await saveResp;
                await page.waitForTimeout(1000);
                console.log('Schedule enabled and saved.');

                // Re-open the dock panel (save may have closed it or refreshed)
                // Re-navigate to get fresh state
                await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
                await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

                // Re-find the schedule
                scheduleRow = null;
                pageNum = 1;
                while (!scheduleRow) {
                    scheduleRow = await readScheduleRow(page, SCHED_NAME);
                    if (!scheduleRow) {
                        const hasNext = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
                        if (!hasNext) break;
                        pageNum++;
                    }
                }

                // Re-open dock panel
                await vvAdmin.triggerPostback(page, scheduleRow.postbackTarget, 'scheduleradmin', 30000);
                await page.waitForTimeout(1000);
            }
        }

        // Click "Test Microservice"
        console.log('\nClicking "Test Microservice"...');
        const testResponse = page
            .waitForResponse((resp) => resp.request().method() === 'POST' && resp.url().includes('scheduleradmin'), {
                timeout: 60000,
            })
            .catch(() => null);

        await page.click('#ctl00_ContentBody_dockDetail_C_btnTest_input');
        const resp = await testResponse;
        await page.waitForTimeout(2000);

        // Check for dialog/message after test
        const dialogText = await page.evaluate(() => {
            // Check for the response dialog (RadWindow)
            const allSpans = document.querySelectorAll(
                '[id*="MessageWindow"] span, [id*="mpMessageWin"] span, .rwWindowContent span'
            );
            const msgs = Array.from(allSpans)
                .map((s) => s.textContent.trim())
                .filter((t) => t.length > 3 && t.length < 500);
            // Also check for any visible dialog/popup text
            const dialogContent = document.querySelector('[id*="DockMessageWindow"], [id*="divDialogWindowPanel"]');
            const dialogMsg = dialogContent ? dialogContent.textContent.trim().substring(0, 500) : '';
            return { spans: msgs, dialog: dialogMsg };
        });
        if (dialogText.spans.length > 0) {
            console.log(`  Dialog messages:`);
            dialogText.spans.forEach((m) => console.log(`    ${m}`));
        }
        if (dialogText.dialog) {
            console.log(`  Dialog content: ${dialogText.dialog.substring(0, 300)}`);
        }

        // Dismiss the dialog if present (click OK)
        const okBtn = await page.$('#ctl00_mpMessageWin_DockMessageWindow_C_Button1a_input');
        if (okBtn) {
            await okBtn.click();
            await page.waitForTimeout(500);
        }

        // Screenshot after test
        const path = require('path');
        const ssPath = path.resolve(__dirname, '..', '..', 'testing', 'tmp', 'schedule-test-result.png');
        await page.screenshot({ path: ssPath, fullPage: true });
        console.log(`  Screenshot: ${ssPath}`);

        // Close dock panel and refresh grid to check if lastRunDate changed
        await page.click('#ctl00_ContentBody_dockDetail_C_btnCancel_input').catch(() => {});
        await page.waitForTimeout(1000);

        // Reload the page to get fresh grid data
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        // Find schedule again
        let afterRow = null;
        pageNum = 1;
        while (!afterRow) {
            afterRow = await readScheduleRow(page, SCHED_NAME);
            if (!afterRow) {
                const hasNext = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
                if (!hasNext) break;
                pageNum++;
            }
        }

        if (afterRow) {
            console.log('\nAfter test:');
            console.log(`  Enabled:      ${afterRow.enabled}`);
            console.log(`  Run State:    ${afterRow.runState}`);
            console.log(`  Last Run:     ${afterRow.lastRunDate}`);
            console.log(`  Next Run:     ${afterRow.nextRunDate}`);

            if (afterRow.lastRunDate !== beforeLastRun) {
                console.log(
                    `\n  Result: Schedule executed! Last Run changed from "${beforeLastRun}" to "${afterRow.lastRunDate}"`
                );
            } else {
                console.log(
                    `\n  Result: Last Run unchanged ("${beforeLastRun}"). May still be running or test may not have triggered execution.`
                );
            }
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
