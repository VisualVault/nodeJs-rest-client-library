/**
 * Form Templates component — exports template XMLs from FormTemplateAdmin.
 *
 * Uses Playwright to navigate FormTemplateAdmin grid, trigger the Export
 * button for each template, and capture the download. Templates whose names
 * start with "z" (case-insensitive) are excluded (typically test/draft items).
 */
const path = require('path');
const fs = require('fs');
const vvAdmin = require('../../helpers/vv-admin');
const vvSync = require('../../helpers/vv-sync');

// Grid column indices for FormTemplateAdmin
const COL_CATEGORY = 1;
const COL_NAME = 2;

module.exports = {
    name: 'templates',
    adminSection: 'FormTemplateAdmin',
    outputSubdir: 'form-templates',
    syncOpts: { idField: 'name', dateField: null }, // Grid-scraped: no ID or modifyDate

    /**
     * Fetch metadata by reading the FormTemplateAdmin grid.
     * No REST API exists for template listing — grid is the only source.
     */
    async fetchMetadata(page, config) {
        const url = vvAdmin.adminUrl(config, 'FormTemplateAdmin');
        console.log(`  Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        const info = await vvAdmin.getGridInfo(page);
        console.log(`  Grid: ${info || '(no pagination info)'}`);

        const allItems = [];
        const seenKeys = new Set();
        let pageNum = 0;
        const MAX_PAGES = 30;

        while (pageNum < MAX_PAGES) {
            pageNum++;
            const rows = await page.evaluate(
                ({ colName, colCategory }) => {
                    const trs = document.querySelectorAll(
                        '#ctl00_ContentBody_DG1_ctl00 tbody tr.rgRow, #ctl00_ContentBody_DG1_ctl00 tbody tr.rgAltRow'
                    );
                    return Array.from(trs).map((row) => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        return {
                            name: (cells[colName] || {}).textContent?.trim() || '',
                            category: (cells[colCategory] || {}).textContent?.trim() || '',
                        };
                    });
                },
                { colName: COL_NAME, colCategory: COL_CATEGORY }
            );

            const newRows = rows.filter((r) => {
                if (!r.name || seenKeys.has(r.name)) return false;
                seenKeys.add(r.name);
                return true;
            });

            console.log(`  Page ${pageNum}: ${rows.length} rows, ${newRows.length} new`);
            allItems.push(...newRows);

            if (newRows.length === 0 && pageNum > 1) break;
            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'FormTemplateAdmin');
            if (!advanced) break;
        }

        // Filter out z-prefixed templates (test/draft)
        const filtered = allItems.filter((t) => !t.name.toLowerCase().startsWith('z'));
        console.log(`  ${allItems.length} total, ${filtered.length} after excluding z-prefixed`);

        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Export template XMLs by triggering the Export button for each template.
     * Uses download interception to capture the file.
     */
    async extract(page, config, itemsToExtract) {
        const url = vvAdmin.adminUrl(config, 'FormTemplateAdmin');
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('#ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });

        const targetNames = new Set(itemsToExtract.map((t) => t.name));
        const results = new Map();
        const skipped = new Set();
        let pageNum = 0;

        while (pageNum < 30 && results.size + skipped.size < targetNames.size) {
            pageNum++;
            // Read template names on current page
            const pageTemplates = await page.evaluate(
                ({ colName }) => {
                    const trs = document.querySelectorAll(
                        '#ctl00_ContentBody_DG1_ctl00 tbody tr.rgRow, #ctl00_ContentBody_DG1_ctl00 tbody tr.rgAltRow'
                    );
                    return Array.from(trs)
                        .map((row) => {
                            const cells = Array.from(row.querySelectorAll('td'));
                            return (cells[colName] || {}).textContent?.trim() || '';
                        })
                        .filter(Boolean);
                },
                { colName: COL_NAME }
            );

            const needed = pageTemplates.filter(
                (name) => targetNames.has(name) && !results.has(name) && !skipped.has(name)
            );
            console.log(`  Page ${pageNum}: ${pageTemplates.length} templates, ${needed.length} to export`);

            for (const name of needed) {
                process.stdout.write(`    ${name}...`);
                try {
                    const xml = await this._exportSingle(page, name);
                    if (xml) {
                        results.set(name, { source: xml });
                        process.stdout.write(` OK (${(xml.length / 1024).toFixed(1)} KB)\n`);
                    } else {
                        skipped.add(name);
                        process.stdout.write(` SKIP\n`);
                    }
                } catch (err) {
                    skipped.add(name);
                    process.stdout.write(` ERROR: ${err.message}\n`);
                }
            }

            if (results.size + skipped.size >= targetNames.size) break;
            if (needed.length === 0 && pageNum > 1) break;
            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'FormTemplateAdmin');
            if (!advanced) break;
        }

        if (skipped.size > 0) {
            console.log(`  Skipped ${skipped.size}: ${[...skipped].join(', ')}`);
        }

        return results;
    },

    /**
     * Export a single template by triggering the __doPostBack for its Export button.
     */
    async _exportSingle(page, templateName) {
        const exportTarget = await page.evaluate(
            ({ targetName, colName }) => {
                const rows = document.querySelectorAll(
                    '#ctl00_ContentBody_DG1_ctl00 tbody tr.rgRow, #ctl00_ContentBody_DG1_ctl00 tbody tr.rgAltRow'
                );
                for (const row of rows) {
                    const cells = Array.from(row.querySelectorAll('td'));
                    const name = (cells[colName] || {}).textContent?.trim();
                    if (name === targetName) {
                        const btn =
                            row.querySelector('a[title*="Export"]') || row.querySelector('input[value="Export"]');
                        if (!btn) return null;
                        const href = btn.getAttribute('href') || '';
                        const onclick = btn.getAttribute('onclick') || '';
                        const match = (href + onclick).match(/__doPostBack\('([^']+)'/);
                        return match ? match[1] : null;
                    }
                }
                return null;
            },
            { targetName: templateName, colName: COL_NAME }
        );

        if (!exportTarget) return null;

        const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
        await page.addScriptTag({
            content: `__doPostBack('${exportTarget.replace(/'/g, "\\'")}', '');`,
        });

        const download = await downloadPromise;
        const tempPath = await download.path();
        const xml = fs.readFileSync(tempPath, 'utf8');

        // Wait for page to settle
        await page.waitForResponse((resp) => resp.request().method() === 'POST', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500);

        return xml;
    },

    /**
     * Save exported templates as individual .xml files.
     */
    save(outputDir, allItems, extracted) {
        fs.mkdirSync(outputDir, { recursive: true });
        let saved = 0;

        for (const [name, data] of extracted) {
            const fn = vvSync.sanitizeFilename(name) + '.xml';
            fs.writeFileSync(path.join(outputDir, fn), data.source, 'utf8');
            saved++;
        }
        return saved;
    },

    /**
     * Generate README grouped by category.
     */
    generateReadme(outputDir, allItems, extractedNames) {
        vvSync.generateReadme(outputDir, {
            title: 'Form Templates',
            subtitle: `Exported from FormTemplateAdmin`,
            items: allItems,
            groupByField: 'category',
            columns: [
                {
                    header: 'Template Name',
                    field: 'name',
                    transform: (item) => {
                        const fn = vvSync.sanitizeFilename(item.name) + '.xml';
                        return extractedNames.has(item.name) ? `[${item.name}](${fn})` : item.name;
                    },
                },
                { header: 'Category', field: 'category' },
            ],
        });
    },
};
