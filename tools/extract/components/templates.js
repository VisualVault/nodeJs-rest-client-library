/**
 * Form Templates component — extracts template XMLs via REST API + direct URL.
 *
 * Uses vv-templates helper for metadata (REST API) and direct ExportForm URL
 * for XML download. No grid scraping or __doPostBack required.
 *
 * Templates whose names start with "z" (case-insensitive) are excluded
 * (typically test/draft items).
 *
 * Supports parallel extraction via multiple browser pages (CONCURRENCY workers)
 * and content-hash-based incremental sync to skip unchanged templates.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const vvTemplates = require('../../helpers/vv-templates');
const vvSync = require('../../helpers/vv-sync');
const vvFormsApi = require('../../helpers/vv-formsapi');

const CONCURRENCY = 3;

module.exports = {
    name: 'templates',
    adminSection: 'FormTemplateAdmin',
    outputSubdir: 'form-templates',
    syncOpts: { idField: 'name', dateField: null, hashField: 'contentHash', fileExt: ['.xml', '.json'] },

    /**
     * Fetch metadata via the VV REST API.
     *
     * Returns template objects with id, revisionId, name, etc.
     * Carries forward contentHash from previous manifest for incremental sync.
     *
     * @param {import('playwright').Page} _page - Unused (kept for orchestrator interface)
     * @param {object} config - Result of vvAdmin.loadEnvConfig()
     * @param {object} [opts]
     * @param {string} [opts.manifestPath] - Path to previous manifest for hash carry-forward
     * @returns {Promise<Array<object>>}
     */
    async fetchMetadata(_page, config, opts = {}) {
        console.log('  Fetching via REST API...');
        const templates = await vvTemplates.getTemplates(config);

        // Load previous manifest to carry forward content hashes
        const prevHashMap = new Map();
        if (opts.manifestPath) {
            const manifest = vvSync.loadManifest(opts.manifestPath);
            if (manifest) {
                const prevItems = manifest.templates || manifest.items || [];
                for (const item of prevItems) {
                    if (item.contentHash) {
                        prevHashMap.set(item.name, item.contentHash);
                    }
                }
            }
        }

        // Carry forward content hashes and add revisionId for export URL
        const items = templates.map((t) => ({
            name: t.name,
            description: t.description || '',
            revisionId: t.revisionId,
            templateRevision: t.templateRevision || '',
            modifyDate: t.modifyDate || null,
            contentHash: prevHashMap.get(t.name) || null,
        }));

        console.log(`  ${templates.length} templates from API (z-prefixed excluded)`);
        return items;
    },

    /**
     * Download template XMLs in parallel via direct ExportForm URL.
     *
     * Each worker opens the export URL directly — no grid navigation or
     * __doPostBack required. Uses the browser context for auth cookies.
     *
     * @param {import('playwright').Page} _page - Unused (kept for orchestrator interface)
     * @param {object} config - Environment config
     * @param {Array} itemsToExtract - Templates to extract (must have revisionId)
     * @param {import('playwright').BrowserContext} context - Browser context for auth cookies
     * @returns {Promise<Map<string, {source: string, contentHash: string}>>}
     */
    async extract(_page, config, itemsToExtract, context) {
        const results = new Map();
        const jsonFallbacks = [];
        const skipped = [];
        let nextIdx = 0;
        const total = itemsToExtract.length;
        const workerCount = Math.min(CONCURRENCY, total);

        console.log(`  Parallel download: ${workerCount} workers for ${total} templates`);

        async function worker(workerId) {
            const workerPage = await context.newPage();
            try {
                while (nextIdx < total) {
                    const idx = nextIdx++;
                    if (idx >= total) break;
                    const item = itemsToExtract[idx];

                    process.stdout.write(`  [W${workerId}] [${idx + 1}/${total}] ${item.name}...`);

                    if (!item.revisionId) {
                        skipped.push({ name: item.name, error: 'missing revisionId' });
                        process.stdout.write(` SKIP (no revisionId)\n`);
                        continue;
                    }

                    try {
                        const xml = await downloadExport(workerPage, config, item);
                        if (xml) {
                            const hash = crypto.createHash('sha256').update(xml).digest('hex');
                            results.set(item.name, { source: xml, contentHash: hash, format: 'xml' });
                            process.stdout.write(` OK (${(xml.length / 1024).toFixed(1)} KB)\n`);
                        } else {
                            jsonFallbacks.push(item);
                            process.stdout.write(` EMPTY (queued for JSON fallback)\n`);
                        }
                    } catch (err) {
                        jsonFallbacks.push(item);
                        process.stdout.write(` ${err.message} (queued for JSON fallback)\n`);
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
        await Promise.allSettled(workers);

        // JSON fallback via preformsapi for templates that failed XML export
        if (jsonFallbacks.length > 0) {
            console.log(`\n  JSON fallback: ${jsonFallbacks.length} templates via preformsapi...`);
            try {
                const fallbackPage = await context.newPage();
                const baseApi = `${config.baseUrl}/api/v1/${config.customerAlias}/${config.databaseAlias}`;
                const formsApiUrl = await vvFormsApi.discoverFormsApiUrl(fallbackPage, baseApi);
                const jwt = await vvFormsApi.getJwt(fallbackPage, baseApi);

                for (const item of jsonFallbacks) {
                    process.stdout.write(`    ${item.name}...`);
                    if (!item.revisionId) {
                        skipped.push({ name: item.name, error: 'no revisionId for JSON fallback' });
                        process.stdout.write(` SKIP (no revisionId)\n`);
                        continue;
                    }

                    try {
                        const json = await vvFormsApi.fetchTemplateJson(
                            fallbackPage,
                            formsApiUrl,
                            item.revisionId,
                            jwt
                        );
                        const source = JSON.stringify(json, null, 2);
                        const hash = crypto.createHash('sha256').update(source).digest('hex');
                        results.set(item.name, { source, contentHash: hash, format: 'json' });
                        process.stdout.write(` OK (JSON, ${(source.length / 1024).toFixed(1)} KB)\n`);
                    } catch (err) {
                        skipped.push({ name: item.name, error: err.message });
                        process.stdout.write(` JSON ERROR: ${err.message}\n`);
                    }
                }

                await fallbackPage.close();
            } catch (err) {
                console.error(`  JSON fallback setup failed: ${err.message}`);
                for (const item of jsonFallbacks) {
                    if (!results.has(item.name)) skipped.push({ name: item.name, error: err.message });
                }
            }
        }

        if (skipped.length > 0) {
            console.log(`  Skipped (${skipped.length}): ${skipped.map((e) => e.name).join(', ')}`);
        }

        const xmlCount = [...results.values()].filter((r) => r.format === 'xml').length;
        const jsonCount = [...results.values()].filter((r) => r.format === 'json').length;
        if (jsonCount > 0) {
            console.log(`  Results: ${xmlCount} XML + ${jsonCount} JSON`);
        }

        return results;
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
            const ext = data.format === 'json' ? '.json' : '.xml';
            const altExt = data.format === 'json' ? '.xml' : '.json';
            const baseName = vvSync.sanitizeFilename(name);

            fs.writeFileSync(path.join(outputDir, baseName + ext), data.source, 'utf8');
            saved++;

            // Remove alternate-format file if it exists (format may change between runs)
            const altPath = path.join(outputDir, baseName + altExt);
            if (fs.existsSync(altPath)) {
                fs.unlinkSync(altPath);
            }

            if (data.contentHash) {
                hashes.set(name, data.contentHash);
            }
        }
        return { saved, hashes };
    },

    /**
     * Generate README grouped by description.
     */
    generateReadme(outputDir, allItems, extractedNames) {
        vvSync.generateReadme(outputDir, {
            title: 'Form Templates',
            subtitle: 'Extracted via REST API + ExportForm URL',
            items: allItems,
            columns: [
                {
                    header: 'Template Name',
                    field: 'name',
                    transform: (item) => {
                        if (!extractedNames.has(item.name)) return item.name;
                        const baseName = vvSync.sanitizeFilename(item.name);
                        for (const ext of ['.xml', '.json']) {
                            if (fs.existsSync(path.join(outputDir, baseName + ext))) {
                                return `[${item.name}](${baseName + ext})`;
                            }
                        }
                        return `[${item.name}](${baseName}.xml)`;
                    },
                },
                { header: 'Version', field: 'templateRevision' },
            ],
        });
    },
};

/**
 * Download a single template XML via direct ExportForm URL.
 *
 * The ExportForm endpoint responds with Content-Disposition: attachment,
 * which Playwright intercepts as a download event. If the server returns
 * an error (redirect to ErrorConfirmation), no download fires.
 *
 * Uses Promise.race between the download event and a navigation settle
 * to avoid hanging on templates that redirect to error pages.
 *
 * @param {import('playwright').Page} page - Browser page (with auth cookies)
 * @param {object} config - Environment config
 * @param {object} item - Template item with revisionId
 * @returns {Promise<string|null>} XML content or null
 */
async function downloadExport(page, config, item) {
    const exportUrl = vvTemplates.getExportUrl(config, item.revisionId);

    // Set up download listener before navigating
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).then(
        (dl) => ({ type: 'download', download: dl }),
        () => ({ type: 'timeout' })
    );

    // Navigate — successful exports throw "Download is starting",
    // error templates redirect to ErrorConfirmation
    const navResult = await page.goto(exportUrl, { waitUntil: 'commit', timeout: 30000 }).catch((err) => {
        if (err.message.includes('Download')) return 'download_started';
        throw err;
    });

    // If navigation completed normally (no download), check for error
    if (navResult !== 'download_started') {
        const finalUrl = page.url();
        if (finalUrl.includes('Error')) {
            throw new Error('server error (ExportForm redirect to ErrorConfirmation)');
        }
    }

    // Wait for the download to complete
    const result = await downloadPromise;
    if (result.type === 'timeout') {
        if (page.url().includes('Error')) {
            throw new Error('server error (ExportForm failed)');
        }
        return null;
    }

    const tempPath = await result.download.path();
    return fs.readFileSync(tempPath, 'utf8');
}
