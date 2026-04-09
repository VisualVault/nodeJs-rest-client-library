/**
 * Form Templates component — extracts template XMLs from FormTemplateAdmin.
 *
 * Uses Playwright to navigate FormTemplateAdmin grid, trigger the Export
 * button for each template, and capture the download. Templates whose names
 * start with "z" (case-insensitive) are excluded (typically test/draft items).
 *
 * Supports parallel extraction via multiple browser pages (CONCURRENCY workers)
 * and content-hash-based incremental sync to skip unchanged templates.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const vvAdmin = require('../../helpers/vv-admin');
const vvSync = require('../../helpers/vv-sync');

// Grid column indices for FormTemplateAdmin
const COL_CATEGORY = 1;
const COL_NAME = 2;
const CONCURRENCY = 3;

module.exports = {
    name: 'templates',
    adminSection: 'FormTemplateAdmin',
    outputSubdir: 'form-templates',
    syncOpts: { idField: 'name', dateField: null, hashField: 'contentHash' },

    /**
     * Fetch metadata by reading the FormTemplateAdmin grid.
     * No REST API exists for template listing — grid is the only source.
     *
     * Carries forward contentHash from previous manifest for incremental sync,
     * and records the grid page number for each template to speed up parallel extraction.
     */
    async fetchMetadata(page, config, opts = {}) {
        const url = vvAdmin.adminUrl(config, 'FormTemplateAdmin');
        console.log(`  Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        const info = await vvAdmin.getGridInfo(page);
        console.log(`  Grid: ${info || '(no pagination info)'}`);

        // Load previous manifest to carry forward content hashes
        const manifestPath = opts.manifestPath || null;
        const prevHashMap = new Map();
        if (manifestPath) {
            const manifest = vvSync.loadManifest(manifestPath);
            if (manifest) {
                const prevItems = manifest.templates || manifest.items || [];
                for (const item of prevItems) {
                    if (item.contentHash) {
                        prevHashMap.set(item.name, item.contentHash);
                    }
                }
            }
        }

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

            const currentPage = pageNum;
            const newRows = rows
                .filter((r) => {
                    if (!r.name || seenKeys.has(r.name)) return false;
                    seenKeys.add(r.name);
                    return true;
                })
                .map((r) => ({
                    ...r,
                    gridPage: currentPage,
                    contentHash: prevHashMap.get(r.name) || null,
                }));

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
     * Export template XMLs in parallel using multiple browser pages.
     * Each worker navigates to the grid, pages to the target template's known
     * grid page, triggers Export, and captures the download.
     *
     * @param {import('playwright').Page} page - Original component page (closed during parallel work)
     * @param {object} config - Environment config
     * @param {Array} itemsToExtract - Templates to extract (with gridPage hints)
     * @param {import('playwright').BrowserContext} context - Browser context for spawning worker pages
     * @returns {Map<string, {source: string, contentHash: string}>}
     */
    async extract(page, config, itemsToExtract, context) {
        if (!context) {
            // Fallback: no context provided, use single-page sequential extraction
            return this._extractSequential(page, config, itemsToExtract);
        }

        const results = new Map();
        const skipped = new Set();
        let nextIdx = 0;
        const total = itemsToExtract.length;
        const workerCount = Math.min(CONCURRENCY, total);

        console.log(`  Parallel extraction: ${workerCount} workers for ${total} templates`);

        const self = this;

        async function worker(workerId) {
            const workerPage = await context.newPage();
            try {
                while (nextIdx < total) {
                    const idx = nextIdx++;
                    if (idx >= total) break;
                    const item = itemsToExtract[idx];

                    process.stdout.write(`  [W${workerId}] [${idx + 1}/${total}] ${item.name}...`);

                    try {
                        // Navigate to FormTemplateAdmin
                        const adminUrl = vvAdmin.adminUrl(config, 'FormTemplateAdmin');
                        await workerPage.goto(adminUrl, { waitUntil: 'networkidle', timeout: 60000 });
                        await workerPage.waitForSelector('#ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });

                        // Page to the expected grid page
                        let found = false;
                        const startPage = item.gridPage || 1;
                        for (let p = 1; p < startPage; p++) {
                            const advanced = await vvAdmin.goToNextGridPage(workerPage, p, 'FormTemplateAdmin');
                            if (!advanced) break;
                        }

                        // Check if template is on this page
                        found = await _isTemplateOnPage(workerPage, item.name);

                        // Fallback: search forward a few more pages if not found
                        if (!found) {
                            for (let extra = 0; extra < 5; extra++) {
                                const advanced = await vvAdmin.goToNextGridPage(
                                    workerPage,
                                    startPage + extra,
                                    'FormTemplateAdmin'
                                );
                                if (!advanced) break;
                                found = await _isTemplateOnPage(workerPage, item.name);
                                if (found) break;
                            }
                        }

                        if (!found) {
                            skipped.add(item.name);
                            process.stdout.write(` NOT FOUND\n`);
                            continue;
                        }

                        const xml = await self._exportSingle(workerPage, item.name);
                        if (xml) {
                            const hash = crypto.createHash('sha256').update(xml).digest('hex');
                            results.set(item.name, { source: xml, contentHash: hash });
                            process.stdout.write(` OK (${(xml.length / 1024).toFixed(1)} KB)\n`);
                        } else {
                            skipped.add(item.name);
                            process.stdout.write(` SKIP\n`);
                        }
                    } catch (err) {
                        skipped.add(item.name);
                        process.stdout.write(` ERROR: ${err.message}\n`);
                    }
                }
            } catch (err) {
                console.error(`  [W${workerId}] Worker error: ${err.message}`);
            } finally {
                await workerPage.close();
            }
        }

        const workers = [];
        for (let w = 0; w < workerCount; w++) {
            workers.push(worker(w + 1));
        }
        await Promise.all(workers);

        if (skipped.size > 0) {
            console.log(`  Skipped ${skipped.size}: ${[...skipped].join(', ')}`);
        }

        return results;
    },

    /**
     * Sequential fallback for when no browser context is available.
     */
    async _extractSequential(page, config, itemsToExtract) {
        const url = vvAdmin.adminUrl(config, 'FormTemplateAdmin');
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('#ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });

        const targetNames = new Set(itemsToExtract.map((t) => t.name));
        const results = new Map();
        const skipped = new Set();
        let pageNum = 0;

        while (pageNum < 30 && results.size + skipped.size < targetNames.size) {
            pageNum++;
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
                        const hash = crypto.createHash('sha256').update(xml).digest('hex');
                        results.set(name, { source: xml, contentHash: hash });
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
     * Save extracted templates as individual .xml files.
     * Returns { saved, hashes } where hashes is a Map of name -> contentHash.
     */
    save(outputDir, allItems, extracted) {
        fs.mkdirSync(outputDir, { recursive: true });
        let saved = 0;
        const hashes = new Map();

        for (const [name, data] of extracted) {
            const fn = vvSync.sanitizeFilename(name) + '.xml';
            fs.writeFileSync(path.join(outputDir, fn), data.source, 'utf8');
            saved++;
            if (data.contentHash) {
                hashes.set(name, data.contentHash);
            }
        }
        return { saved, hashes };
    },

    /**
     * Generate README grouped by category.
     */
    generateReadme(outputDir, allItems, extractedNames) {
        vvSync.generateReadme(outputDir, {
            title: 'Form Templates',
            subtitle: `Extracted from FormTemplateAdmin`,
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

/**
 * Check if a template name exists on the current grid page.
 */
async function _isTemplateOnPage(page, templateName) {
    return page.evaluate(
        ({ targetName, colName }) => {
            const trs = document.querySelectorAll(
                '#ctl00_ContentBody_DG1_ctl00 tbody tr.rgRow, #ctl00_ContentBody_DG1_ctl00 tbody tr.rgAltRow'
            );
            for (const row of trs) {
                const cells = Array.from(row.querySelectorAll('td'));
                const name = (cells[colName] || {}).textContent?.trim();
                if (name === targetName) return true;
            }
            return false;
        },
        { targetName: templateName, colName: COL_NAME }
    );
}
