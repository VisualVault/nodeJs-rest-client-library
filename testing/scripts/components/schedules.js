/**
 * Scheduled Services component — extracts schedule configuration from scheduleradmin.
 *
 * This is a metadata-only component — no script source extraction needed.
 * Script source lives in outsideprocessadmin (handled by the scripts component).
 * Schedules link to scripts via the serviceName field.
 */
const path = require('path');
const vvAdmin = require('../../helpers/vv-admin');
const vvSync = require('../../helpers/vv-sync');

// Grid column definitions for scheduleradmin (verified 2026-04-08)
// index 0: checkbox/select
// index 1: Name (link)
// index 2: "View" detail link (skip)
// index 3: Enable (True/False text)
// index 4: Run State (Idle/Running)
// index 5: Set to Idle ("Reset" button — skip)
// index 6: Last Run Date
// index 7: Recurrence (e.g., "Every 1 Days")
// index 8: Next Run Date
// index 9: Service Name
const GRID_COLUMNS = [
    { name: 'name', index: 1, type: 'link' },
    { name: 'enabled', index: 3, type: 'text' },
    { name: 'runState', index: 4, type: 'text' },
    { name: 'lastRunDate', index: 6, type: 'text' },
    { name: 'recurrence', index: 7, type: 'text' },
    { name: 'nextRunDate', index: 8, type: 'text' },
    { name: 'serviceName', index: 9, type: 'text' },
];

module.exports = {
    name: 'schedules',
    adminSection: 'scheduleradmin',
    outputSubdir: 'schedules',

    /**
     * Fetch schedule metadata by scraping the scheduleradmin grid.
     * No REST API exists for scheduled services — grid is the only source.
     *
     * @param {import('@playwright/test').Page} page - logged-in Playwright page
     * @param {object} config - from vvAdmin.loadEnvConfig()
     * @returns {Array<object>} schedule entries
     */
    async fetchMetadata(page, config) {
        const url = vvAdmin.adminUrl(config, 'scheduleradmin');
        console.log(`  Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        // Wait for the grid — try standard grid ID, fall back to class
        await page.waitForSelector('.rgMasterTable, #ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });

        const info = await vvAdmin.getGridInfo(page);
        console.log(`  Grid: ${info || '(no pagination info)'}`);

        const allItems = [];
        const seenKeys = new Set();
        let pageNum = 0;
        const MAX_PAGES = 30;

        while (pageNum < MAX_PAGES) {
            pageNum++;
            const rows = await vvAdmin.readGridRows(page, GRID_COLUMNS);

            // Deduplicate: stop if all rows on this page were already seen
            const newRows = rows.filter((r) => {
                const key = JSON.stringify(r);
                if (seenKeys.has(key)) return false;
                seenKeys.add(key);
                return true;
            });

            console.log(`  Page ${pageNum}: ${rows.length} rows, ${newRows.length} new`);
            allItems.push(...newRows);

            if (newRows.length === 0 && pageNum > 1) break;

            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'scheduleradmin');
            if (!advanced) break;
        }

        // Normalize the data
        return allItems
            .map((row) => ({
                name: row.name || '',
                enabled: normalizeEnabled(row.enabled),
                runState: row.runState || '',
                lastRunDate: row.lastRunDate || '',
                recurrence: row.recurrence || '',
                nextRunDate: row.nextRunDate || '',
                serviceName: row.serviceName || '',
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * No extraction needed — grid data IS the content.
     */
    extract: null,

    /**
     * Save schedule metadata as manifest.json.
     */
    save(outputDir, items) {
        const manifestPath = path.join(outputDir, 'manifest.json');
        vvSync.saveManifest(manifestPath, {
            environment: 'vv5dev/WADNR/fpOnline',
            component: 'schedules',
            items,
        });
        return items.length;
    },

    /**
     * Generate README with cross-links to web service scripts.
     */
    generateReadme(outputDir, items) {
        const scriptsDir = path.resolve(outputDir, '..', 'web-services', 'scripts');

        vvSync.generateReadme(outputDir, {
            title: 'WADNR Scheduled Services',
            subtitle: 'Extracted from scheduleradmin on vv5dev (WADNR/fpOnline)',
            items: items.map((i) => ({ ...i, _group: i.enabled ? 'Enabled' : 'Disabled' })),
            groupByField: '_group',
            columns: [
                { header: 'Schedule Name', field: 'name' },
                {
                    header: 'Service',
                    field: 'serviceName',
                    transform: (item) => {
                        const fn = vvSync.sanitizeFilename(item.serviceName) + '.js';
                        const exists = require('fs').existsSync(path.join(scriptsDir, fn));
                        return exists ? `[${item.serviceName}](../web-services/scripts/${fn})` : item.serviceName;
                    },
                },
                { header: 'Recurrence', field: 'recurrence' },
                { header: 'Run State', field: 'runState' },
                { header: 'Last Run', field: 'lastRunDate' },
                { header: 'Next Run', field: 'nextRunDate' },
            ],
        });
    },
};

function normalizeEnabled(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const v = value.toLowerCase().trim();
        if (v === 'true' || v === 'yes' || v === 'on' || v === 'enabled') return true;
        if (v === 'false' || v === 'no' || v === 'off' || v === 'disabled') return false;
    }
    return value;
}
