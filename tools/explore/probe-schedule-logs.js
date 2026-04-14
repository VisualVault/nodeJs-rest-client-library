#!/usr/bin/env node

/**
 * Read-only probe: Open each active scheduled process's run log (View link)
 * and capture the log entries — specifically the Message column.
 *
 * Purpose: determine empirically whether the logged messages come from
 * response.json() or postCompletion() for each active schedule.
 *
 * Usage:
 *   node tools/explore/probe-schedule-logs.js
 *   node tools/explore/probe-schedule-logs.js --headed
 *   node tools/explore/probe-schedule-logs.js --max-entries 10
 */

const { chromium } = require('playwright');
const vvAdmin = require('../helpers/vv-admin');

// Parse CLI args
const args = process.argv.slice(2);
const headed = args.includes('--headed');
const maxEntriesIdx = args.indexOf('--max-entries');
const MAX_LOG_ENTRIES = maxEntriesIdx >= 0 ? parseInt(args[maxEntriesIdx + 1]) : 5;

async function main() {
    const active = vvAdmin.getActiveCustomer();
    const config = vvAdmin.loadEnvConfig(active.server, active.customer);
    console.log(`Target: ${config.baseUrl} (${config.customerAlias}/${config.databaseAlias})`);
    console.log(`Mode: ${headed ? 'headed' : 'headless'}, max log entries per schedule: ${MAX_LOG_ENTRIES}\n`);

    const browser = await chromium.launch({ headless: !headed });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    console.log('Logging in...');
    await vvAdmin.login(page, config);
    console.log('Logged in.\n');

    // Navigate to scheduler admin
    const url = vvAdmin.adminUrl(config, 'scheduleradmin');
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    // Collect all enabled schedule rows with their View link postback targets
    const schedules = await collectEnabledSchedules(page);
    console.log(`\nFound ${schedules.length} enabled schedules.\n`);

    const results = [];

    for (const schedule of schedules) {
        console.log(`--- ${schedule.name} ---`);

        // Navigate back to scheduleradmin (log panel may leave us elsewhere)
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        // Find the View link for this schedule on the current page
        const viewTarget = await findViewLinkTarget(page, schedule.name);
        if (!viewTarget) {
            console.log('  View link not found (schedule may be on another page).');
            // Try paginating to find it
            const found = await findScheduleAcrossPages(page, schedule.name, url);
            if (!found) {
                console.log('  SKIP: could not locate schedule row.\n');
                results.push({ name: schedule.name, error: 'View link not found' });
                continue;
            }
        }

        // Now we should be on the right page — get the view link target
        const target = await findViewLinkTarget(page, schedule.name);
        if (!target) {
            console.log('  SKIP: View link not found after pagination.\n');
            results.push({ name: schedule.name, error: 'View link not found after pagination' });
            continue;
        }

        // Click the View link via postback — capture the response
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
            content: `__doPostBack('${target.replace(/'/g, "\\'")}', '');`,
        });
        await responsePromise;
        await page.waitForTimeout(1000);

        // Read the log entries from the RadWindow / dock panel
        const logEntries = await readLogEntries(page, MAX_LOG_ENTRIES);

        if (logEntries.length === 0 && logHtml) {
            // Try parsing from captured HTML response
            const parsed = parseLogFromHtml(logHtml, MAX_LOG_ENTRIES);
            if (parsed.length > 0) {
                logEntries.push(...parsed);
            }
        }

        console.log(`  Log entries found: ${logEntries.length}`);
        for (const entry of logEntries) {
            console.log(`    [${entry.result}] ${entry.scheduledDate} | ${entry.completionDate} | ${entry.message}`);
        }
        console.log();

        results.push({
            name: schedule.name,
            serviceName: schedule.serviceName,
            entries: logEntries,
        });

        // Close any open dock panel / RadWindow
        await closeDockPanels(page);
    }

    await browser.close();

    // Summary report
    console.log('\n====================================================');
    console.log('SUMMARY: Scheduled Process Log Messages');
    console.log('====================================================\n');

    for (const r of results) {
        if (r.error) {
            console.log(`${r.name}: ERROR — ${r.error}`);
            continue;
        }
        console.log(`${r.name} (service: ${r.serviceName})`);
        if (r.entries.length === 0) {
            console.log('  No log entries found.');
        } else {
            for (const e of r.entries) {
                const msg = e.message || '(empty)';
                console.log(`  [${e.result}] ${e.scheduledDate} → ${e.completionDate} | Message: ${msg}`);
            }
        }
        console.log();
    }

    // JSON output for further analysis
    const outputPath = require('path').resolve(
        __dirname,
        '..',
        '..',
        'projects',
        'wadnr',
        'extracts',
        'schedules',
        'log-probe-results.json'
    );
    require('fs').writeFileSync(
        outputPath,
        JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
    );
    console.log(`Results saved to: ${outputPath}`);
}

/**
 * Collect all enabled schedules from the grid (across all pages).
 */
async function collectEnabledSchedules(page) {
    const all = [];
    const seen = new Set();
    let pageNum = 0;

    while (pageNum < 10) {
        pageNum++;
        const rows = await page.evaluate(() => {
            const rowEls = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
            return Array.from(rowEls).map((row) => {
                const cells = Array.from(row.querySelectorAll('td'));
                const nameLink = cells[1] ? cells[1].querySelector('a') : null;
                const enabled = cells[3] ? cells[3].textContent.trim() : '';
                const serviceName = cells[9] ? cells[9].textContent.trim() : '';
                return {
                    name: nameLink ? nameLink.textContent.trim() : '',
                    enabled: enabled.toLowerCase() === 'true',
                    serviceName,
                };
            });
        });

        let newCount = 0;
        for (const row of rows) {
            if (row.enabled && !seen.has(row.name)) {
                seen.add(row.name);
                all.push(row);
                newCount++;
            }
        }

        if (newCount === 0 && pageNum > 1) break;

        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
        if (!advanced) break;
    }

    return all.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find the View (lnkViewLog) link's postback target for a specific schedule name on the current grid page.
 */
async function findViewLinkTarget(page, scheduleName) {
    return page.evaluate((name) => {
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
}

/**
 * Paginate through the grid to find a schedule by name.
 * Returns true if found (page is now showing the row).
 */
async function findScheduleAcrossPages(page, scheduleName, baseUrl) {
    // Start from page 1
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

    let pageNum = 0;
    while (pageNum < 10) {
        pageNum++;
        const found = await findViewLinkTarget(page, scheduleName);
        if (found) return true;

        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
        if (!advanced) break;
    }
    return false;
}

/**
 * Read log entries from the open RadWindow/dock panel.
 * The log panel contains a grid with: Row, Scheduled Run Date, Actual Run Date,
 * Completion Date, Result, Message.
 */
async function readLogEntries(page, maxEntries) {
    // Wait for the log panel to appear
    await page.waitForTimeout(500);

    return page.evaluate((max) => {
        // Look for the log RadWindow content — it could be in an iframe or inline
        const entries = [];

        // Try to find the log grid inside any visible RadWindow or dock panel
        const containers = [
            document.querySelector('[id*="dockScheduledProcessLog"]'),
            document.querySelector('[id*="ScheduledProcessLog"]'),
            document.querySelector('.rwWindowContent'),
            document.querySelector('.RadWindow_Default .rwWindowContent'),
        ].filter(Boolean);

        // Also check iframes inside RadWindows
        const iframes = document.querySelectorAll('.RadWindow iframe, [id*="dock"] iframe');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc) containers.push(iframeDoc.body);
            } catch {
                // cross-origin
            }
        }

        // Fallback: look anywhere on the page for a grid inside a dock/window
        if (containers.length === 0) {
            containers.push(document.body);
        }

        for (const container of containers) {
            if (!container) continue;

            // Find all tables that look like log grids
            const tables = container.querySelectorAll('table.rgMasterTable, table[id*="DG"], table[class*="Grid"]');
            for (const table of tables) {
                const rows = table.querySelectorAll('tbody tr.rgRow, tbody tr.rgAltRow, tbody tr');
                for (const row of rows) {
                    if (entries.length >= max) break;
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells.length < 5) continue;

                    // Skip the main scheduleradmin grid rows (they have 10 columns)
                    if (cells.length >= 9) continue;

                    entries.push({
                        row: cells[0] ? cells[0].textContent.trim() : '',
                        scheduledDate: cells[1] ? cells[1].textContent.trim() : '',
                        actualDate: cells[2] ? cells[2].textContent.trim() : '',
                        completionDate: cells[3] ? cells[3].textContent.trim() : '',
                        result: cells[4] ? cells[4].textContent.trim() : '',
                        message: cells[5] ? cells[5].textContent.trim() : '',
                    });
                }
            }
        }

        return entries;
    }, maxEntries);
}

/**
 * Parse log entries from captured HTML response body.
 * Fallback if DOM reading doesn't work (RadWindow may load async).
 */
function parseLogFromHtml(html, maxEntries) {
    const entries = [];

    // Look for table rows in the response HTML
    // The log grid rows follow the pattern: <tr class="rgRow">...<td>...</td>...
    const rowRegex = /<tr[^>]*class="(?:rgRow|rgAltRow)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    while ((match = rowRegex.exec(html)) && entries.length < maxEntries) {
        const rowHtml = match[1];
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowHtml))) {
            cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
        }

        // Log grid has 6 columns; main grid has 10+
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

    return entries;
}

/**
 * Close any open dock panels or RadWindow dialogs.
 */
async function closeDockPanels(page) {
    await page.evaluate(() => {
        // Close RadWindows
        const closeButtons = document.querySelectorAll('.rwCloseButton, [title="Close"], a.rwCloseButton');
        for (const btn of closeButtons) btn.click();

        // Hide dock panels
        const docks = document.querySelectorAll('[id*="dock"], .RadDock, .RadWindow');
        for (const dock of docks) dock.style.display = 'none';

        // Remove overlays
        const overlays = document.querySelectorAll('.rdOverlay, [class*="overlay"]');
        for (const o of overlays) o.style.display = 'none';
    });
    await page.waitForTimeout(300);
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
