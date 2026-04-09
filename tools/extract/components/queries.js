/**
 * Custom Queries component — extracts SQL query definitions from ConnectionQueryAdmin.
 *
 * Queries are nested under Data Connections. The flow:
 * 1. API probe: attempt GET /customquery bare endpoint for definitions
 * 2. If API fails: Playwright discovery of connections via ConnectionsAdmin
 * 3. Per connection: enumerate queries via ConnectionQueryAdmin?CcID={guid}
 * 4. Parallel extraction of SQL via Edit dock panel (response interception)
 *
 * Supports hash-based incremental sync — only re-extracts queries whose SQL changed.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const vvAdmin = require('../../helpers/vv-admin');
const vvSync = require('../../helpers/vv-sync');

const CONCURRENCY = 3;

// Grid column indices for ConnectionQueryAdmin (from docs/architecture/visualvault-platform.md)
// Actual indices may vary — _discoverColumns validates at runtime.
// Expected layout:
//   0: checkbox (select)
//   1: Query Name (link)
//   2: Edit (link)
//   3: Description
//   4: Type
//   5: Cache Enabled
//   6: Cache Expires
const DEFAULT_QUERY_COLUMNS = [
    { name: 'queryName', index: 1, type: 'link' },
    { name: 'edit', index: 2, type: 'link' },
    { name: 'description', index: 3, type: 'text' },
    { name: 'queryType', index: 4, type: 'text' },
    { name: 'cacheEnabled', index: 5, type: 'text' },
    { name: 'cacheExpires', index: 6, type: 'text' },
];

module.exports = {
    name: 'queries',
    adminSection: 'ConnectionQueryAdmin',
    outputSubdir: 'custom-queries',
    syncOpts: {
        idField: 'name',
        dateField: null,
        hashField: 'contentHash',
        fileExt: '.sql',
        contentSubdir: 'sql',
    },

    /**
     * Fetch query metadata. Tries REST API first, falls back to Playwright grid scraping.
     *
     * @param {import('@playwright/test').Page} page
     * @param {object} config - from vvAdmin.loadEnvConfig()
     * @param {object} opts - { manifestPath }
     * @returns {Array<object>}
     */
    async fetchMetadata(page, config, opts = {}) {
        // Load previous hashes for carry-forward
        const manifestPath = opts.manifestPath || null;
        const prevHashMap = new Map();
        if (manifestPath) {
            const manifest = vvSync.loadManifest(manifestPath);
            if (manifest) {
                const prevItems = manifest.queries || manifest.items || [];
                for (const item of prevItems) {
                    if (item.contentHash) {
                        prevHashMap.set(item.name, item.contentHash);
                    }
                }
            }
        }

        // --- Attempt 1: API probe ---
        const apiResult = await _probeApi(config);
        if (apiResult) {
            console.log(`  API probe: found ${apiResult.length} queries`);
            return apiResult
                .map((q) => ({
                    ...q,
                    contentHash: prevHashMap.get(q.name) || null,
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
        }
        console.log('  API probe: no listing endpoint available, using Playwright');

        // --- Attempt 2: Playwright grid scraping ---
        // Step 1: Discover connections
        const connections = await _discoverConnections(page, config);
        if (connections.length === 0) {
            console.log('  No data connections found.');
            return [];
        }
        console.log(`  Found ${connections.length} data connection(s)`);

        // Step 2: Enumerate queries per connection
        const allItems = [];
        const seenNames = new Set();

        for (const conn of connections) {
            const queries = await _scrapeQueryGrid(page, config, conn, seenNames);
            console.log(`  ${conn.name}: ${queries.length} queries`);
            allItems.push(...queries);
        }

        // Carry forward hashes
        for (const item of allItems) {
            item.contentHash = prevHashMap.get(item.name) || null;
        }

        return allItems.sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Extract SQL definitions via parallel dock panel extraction.
     *
     * @param {import('@playwright/test').Page} page
     * @param {object} config
     * @param {Array<object>} itemsToExtract
     * @param {import('playwright').BrowserContext} context
     * @returns {Map<string, {source: string, contentHash: string}>}
     */
    async extract(page, config, itemsToExtract, context) {
        if (!context) {
            return _extractSequential(page, config, itemsToExtract);
        }

        const results = new Map();
        const skipped = new Set();
        let nextIdx = 0;
        const total = itemsToExtract.length;

        // Sort by connectionId for batching — workers stay on same connection longer
        const sorted = [...itemsToExtract].sort((a, b) => {
            const cmp = a.connectionId.localeCompare(b.connectionId);
            return cmp !== 0 ? cmp : (a.gridPage || 0) - (b.gridPage || 0);
        });

        const workerCount = Math.min(CONCURRENCY, total);
        console.log(`  Parallel extraction: ${workerCount} workers for ${total} queries`);

        // Shared textarea ID cache — discovered on first extraction
        let textareaId = null;

        async function worker(workerId) {
            const workerPage = await context.newPage();
            let currentConnectionId = null;
            let currentGridPage = 0;

            try {
                while (nextIdx < total) {
                    const idx = nextIdx++;
                    if (idx >= total) break;
                    const item = sorted[idx];

                    process.stdout.write(`  [W${workerId}] [${idx + 1}/${total}] ${item.name}...`);

                    try {
                        // Navigate to the right connection's query page if needed
                        if (currentConnectionId !== item.connectionId) {
                            const queryUrl = vvAdmin.adminUrl(config, `ConnectionQueryAdmin?CcID=${item.connectionId}`);
                            await workerPage.goto(queryUrl, { waitUntil: 'networkidle', timeout: 60000 });
                            await workerPage.waitForSelector('.rgMasterTable', { timeout: 30000 });
                            currentConnectionId = item.connectionId;
                            currentGridPage = 1;
                        }

                        // Page to the expected grid page
                        const targetPage = item.gridPage || 1;
                        if (currentGridPage !== targetPage) {
                            // Navigate to page 1 first by reloading if we're ahead
                            if (currentGridPage > targetPage) {
                                const queryUrl = vvAdmin.adminUrl(
                                    config,
                                    `ConnectionQueryAdmin?CcID=${item.connectionId}`
                                );
                                await workerPage.goto(queryUrl, { waitUntil: 'networkidle', timeout: 60000 });
                                await workerPage.waitForSelector('.rgMasterTable', { timeout: 30000 });
                                currentGridPage = 1;
                            }
                            for (let p = currentGridPage; p < targetPage; p++) {
                                const advanced = await vvAdmin.goToNextGridPage(workerPage, p, 'ConnectionQueryAdmin');
                                if (!advanced) break;
                            }
                            currentGridPage = targetPage;
                        }

                        // Find the Edit link for this query
                        const editInfo = await _findEditLink(workerPage, item.name);
                        if (!editInfo) {
                            // Fallback: search forward a few pages
                            let found = false;
                            for (let extra = 0; extra < 3; extra++) {
                                const advanced = await vvAdmin.goToNextGridPage(
                                    workerPage,
                                    currentGridPage + extra,
                                    'ConnectionQueryAdmin'
                                );
                                if (!advanced) break;
                                currentGridPage++;
                                const retryInfo = await _findEditLink(workerPage, item.name);
                                if (retryInfo) {
                                    found = true;
                                    const sql = await _extractSql(workerPage, retryInfo, textareaId);
                                    if (sql) {
                                        if (sql.textareaId) textareaId = sql.textareaId;
                                        const hash = crypto.createHash('sha256').update(sql.source).digest('hex');
                                        results.set(item.name, { source: sql.source, contentHash: hash });
                                        process.stdout.write(` OK (${sql.source.length} chars)\n`);
                                    } else {
                                        skipped.add(item.name);
                                        process.stdout.write(` SKIP (no SQL)\n`);
                                    }
                                    break;
                                }
                            }
                            if (!found) {
                                skipped.add(item.name);
                                process.stdout.write(` NOT FOUND\n`);
                            }
                            continue;
                        }

                        const sql = await _extractSql(workerPage, editInfo, textareaId);
                        if (sql) {
                            if (sql.textareaId) textareaId = sql.textareaId;
                            const hash = crypto.createHash('sha256').update(sql.source).digest('hex');
                            results.set(item.name, { source: sql.source, contentHash: hash });
                            process.stdout.write(` OK (${sql.source.length} chars)\n`);
                        } else {
                            skipped.add(item.name);
                            process.stdout.write(` SKIP (no SQL)\n`);
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
     * Save extracted queries as .sql files with metadata headers.
     * Returns { saved, hashes } for manifest merge.
     */
    save(outputDir, allItems, extracted) {
        const sqlDir = path.join(outputDir, 'sql');
        fs.mkdirSync(sqlDir, { recursive: true });
        const today = new Date().toISOString().split('T')[0];
        let saved = 0;
        const hashes = new Map();

        for (const [name, data] of extracted) {
            const meta = allItems.find((m) => m.name === name);
            const fn = vvSync.sanitizeFilename(name) + '.sql';
            const headerLines = [
                '/**',
                ` * Query: ${name}`,
                meta && meta.connectionName ? ` * Connection: ${meta.connectionName}` : '',
                meta && meta.queryType ? ` * Type: ${meta.queryType}` : '',
                meta
                    ? ` * Cache: ${meta.cacheEnabled ? 'Yes' : 'No'}${meta.cacheExpires ? ' (' + meta.cacheExpires + ')' : ''}`
                    : '',
                meta && meta.description ? ` * Description: ${meta.description}` : '',
                ` * Extracted: ${today}`,
                ' */',
                '',
            ]
                .filter((l) => l !== '')
                .join('\n');

            fs.writeFileSync(path.join(sqlDir, fn), headerLines + data.source + '\n', 'utf8');
            saved++;
            if (data.contentHash) {
                hashes.set(name, data.contentHash);
            }
        }

        return { saved, hashes };
    },

    /**
     * Generate README grouped by connection name.
     */
    generateReadme(outputDir, allItems, extractedNames) {
        vvSync.generateReadme(outputDir, {
            title: 'Custom Queries',
            subtitle: 'Extracted from ConnectionQueryAdmin',
            items: allItems,
            groupByField: 'connectionName',
            columns: [
                {
                    header: 'Query Name',
                    field: 'name',
                    transform: (item) => {
                        const fn = vvSync.sanitizeFilename(item.name) + '.sql';
                        return extractedNames && extractedNames.has(item.name)
                            ? `[${item.name}](./sql/${fn})`
                            : item.name;
                    },
                },
                {
                    header: 'Description',
                    field: 'description',
                    transform: (i) => (i.description || '').substring(0, 60),
                },
                { header: 'Type', field: 'queryType' },
                {
                    header: 'Cache',
                    field: 'cacheEnabled',
                    transform: (i) => (i.cacheEnabled ? 'Yes' : '-'),
                },
                {
                    header: 'Src',
                    field: '_src',
                    transform: (i) => (extractedNames && extractedNames.has(i.name) ? 'Y' : '-'),
                },
            ],
        });
    },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to list query definitions via the REST API.
 * Returns array of query objects or null if API doesn't support listing.
 */
async function _probeApi(config) {
    try {
        const clientLib = require(
            path.join(__dirname, '..', '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi')
        );
        const auth = new clientLib.authorize();
        auth.readOnly = true;
        const vv = await auth.getVaultApi(
            config.clientId,
            config.clientSecret,
            config.username,
            config.password,
            config.audience,
            config.baseUrl,
            config.customerAlias,
            config.databaseAlias
        );

        // Try bare GET /customquery — may return a list of definitions
        const res = await Promise.race([
            vv.customQuery.getCustomQueryResultsByName('', {}),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);

        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        const items = parsed.data || parsed;

        if (!Array.isArray(items) || items.length === 0) return null;

        // Check if the response contains query definitions (not execution results)
        const sample = items[0];
        const hasDefinition = sample.queryName || sample.name || sample.sqlText || sample.queryText;
        if (!hasDefinition) return null;

        // Map to our standard shape
        return items.map((q) => ({
            name: q.queryName || q.name || '',
            description: q.description || '',
            queryType: q.queryType || q.type || 'Text Query',
            cacheEnabled: q.cacheEnabled != null ? Boolean(q.cacheEnabled) : true,
            cacheExpires: q.cacheExpires || '',
            connectionName: q.connectionName || q.dataConnectionName || '',
            connectionId: q.connectionId || q.dataConnectionId || '',
            sqlText: q.sqlText || q.queryText || null,
            gridPage: null,
        }));
    } catch {
        return null;
    }
}

/**
 * Discover data connections from the ConnectionsAdmin grid.
 *
 * The "Queries" links are lnkDetails postback links — CcID is resolved server-side.
 * We trigger each postback and extract CcID from the resulting ConnectionQueryAdmin URL.
 *
 * @returns {Array<{name: string, connectionId: string}>}
 */
async function _discoverConnections(page, config) {
    const url = vvAdmin.adminUrl(config, 'ConnectionsAdmin');
    console.log(`  Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('#ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });

    // Get connection names from the grid (column 1 = Name)
    const CONN_COLUMNS = [
        { name: 'connName', index: 1, type: 'text' },
        { name: 'description', index: 4, type: 'text' },
    ];
    const rows = await vvAdmin.readGridRows(page, CONN_COLUMNS);

    // Get "Queries" links (they're lnkDetails links)
    const detailLinks = await vvAdmin.getGridDetailLinks(page);

    if (detailLinks.length === 0) return [];

    // For each Queries link, trigger postback and capture CcID from redirect URL
    const connections = [];
    for (let i = 0; i < detailLinks.length; i++) {
        const link = detailLinks[i];
        const connName = rows[i] ? rows[i].connName : link.name;

        // Set up navigation listener before triggering postback
        const navPromise = page.waitForURL(/ConnectionQueryAdmin/i, { timeout: 15000 }).catch(() => null);

        await page.addScriptTag({
            content: `__doPostBack('${link.postbackTarget.replace(/'/g, "\\'")}', '');`,
        });

        await navPromise;
        const currentUrl = page.url();
        const ccidMatch = currentUrl.match(/CcID=([a-f0-9-]+)/i);

        if (ccidMatch) {
            connections.push({
                name: connName,
                connectionId: ccidMatch[1],
            });
            console.log(`    ${connName} → CcID=${ccidMatch[1]}`);
        } else {
            console.log(`    ${connName} → no CcID found (URL: ${currentUrl})`);
        }

        // Navigate back to ConnectionsAdmin for the next link
        if (i < detailLinks.length - 1) {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForSelector('#ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });
        }
    }

    return connections;
}

/**
 * Scrape the ConnectionQueryAdmin grid for a given connection.
 * Returns array of query metadata objects.
 */
async function _scrapeQueryGrid(page, config, connection, seenNames) {
    const url = vvAdmin.adminUrl(config, `ConnectionQueryAdmin?CcID=${connection.connectionId}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for grid — might redirect to ConnectionsAdmin if CcID is invalid
    try {
        await page.waitForSelector('.rgMasterTable', { timeout: 15000 });
    } catch {
        // Grid didn't load — likely no queries for this connection or redirect
        console.log(`    ${connection.name}: no query grid found (may have no queries)`);
        return [];
    }

    const info = await vvAdmin.getGridInfo(page);
    if (info) console.log(`    Grid: ${info}`);

    const allItems = [];
    let pageNum = 0;
    const MAX_PAGES = 30;

    while (pageNum < MAX_PAGES) {
        pageNum++;
        const rows = await vvAdmin.readGridRows(page, DEFAULT_QUERY_COLUMNS);

        const newRows = rows.filter((r) => {
            const name = r.queryName;
            if (!name || seenNames.has(name)) return false;
            seenNames.add(name);
            return true;
        });

        if (pageNum === 1 || newRows.length > 0) {
            console.log(`    Page ${pageNum}: ${rows.length} rows, ${newRows.length} new`);
        }

        for (const row of newRows) {
            allItems.push({
                name: row.queryName || '',
                description: row.description || '',
                queryType: row.queryType || 'Text Query',
                cacheEnabled: _normalizeBool(row.cacheEnabled),
                cacheExpires: row.cacheExpires || '',
                connectionName: connection.name,
                connectionId: connection.connectionId,
                gridPage: pageNum,
                contentHash: null,
            });
        }

        if (newRows.length === 0 && pageNum > 1) break;
        const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'ConnectionQueryAdmin');
        if (!advanced) break;
    }

    return allItems;
}

/**
 * Find the Edit link for a query by name on the current grid page.
 * Returns {postbackTarget} or null.
 */
async function _findEditLink(page, queryName) {
    return page.evaluate((targetName) => {
        const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
        for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td'));
            // Find the row that contains our query name
            const hasName = cells.some((cell) => {
                const text = cell.textContent.trim();
                return text === targetName;
            });
            if (!hasName) continue;

            // Find Edit link — could be a link with "Edit" text or an edit-style link
            for (const cell of cells) {
                const links = cell.querySelectorAll('a');
                for (const link of links) {
                    const text = link.textContent.trim().toLowerCase();
                    if (text === 'edit' || text === 'select') {
                        const href = link.getAttribute('href') || '';
                        const m = href.match(/__doPostBack\('([^']+)'/);
                        if (m) return { postbackTarget: m[1] };
                    }
                }
            }

            // Fallback: try any postback link in the row that's not the query name link
            for (const cell of cells) {
                const links = cell.querySelectorAll('a');
                for (const link of links) {
                    const linkText = link.textContent.trim();
                    if (linkText === targetName) continue; // Skip name link
                    const href = link.getAttribute('href') || '';
                    const m = href.match(/__doPostBack\('([^']+)'/);
                    if (m) return { postbackTarget: m[1] };
                }
            }
        }
        return null;
    }, queryName);
}

/**
 * Extract SQL from the Edit dock panel via response interception.
 * Probes for textarea ID if not yet discovered.
 *
 * @returns {{ source: string, textareaId?: string } | null}
 */
async function _extractSql(page, editInfo, knownTextareaId) {
    // Set up response interception BEFORE triggering postback
    let capturedBody = null;
    const responsePromise = page
        .waitForResponse(
            async (resp) => {
                if (resp.request().method() === 'POST' && resp.url().includes('ConnectionQueryAdmin')) {
                    capturedBody = await resp.text();
                    return true;
                }
                return false;
            },
            { timeout: 20000 }
        )
        .catch(() => null);

    // Trigger the Edit postback
    await page.addScriptTag({
        content: `__doPostBack('${editInfo.postbackTarget.replace(/'/g, "\\'")}', '');`,
    });

    await responsePromise;
    if (!capturedBody) return null;

    // Try known textarea ID first
    if (knownTextareaId) {
        const source = _parseTextarea(capturedBody, knownTextareaId);
        if (source !== null) return { source };
    }

    // Probe: find any textarea in the response
    // Common patterns: txtQueryText, txtQuery, txtSqlText
    const probeIds = ['txtQueryString', 'txtQueryText', 'txtQuery', 'txtSqlText', 'txtSQL', 'txtCommandText'];

    for (const probe of probeIds) {
        const re = new RegExp(`id="[^"]*${probe}"[^>]*>([\\s\\S]*?)</textarea`, 'i');
        const match = capturedBody.match(re);
        if (match) {
            const source = _decodeHtml(match[1]);
            // Extract full textarea ID for caching
            const idMatch = capturedBody.match(new RegExp(`id="([^"]*${probe})"`, 'i'));
            return { source, textareaId: idMatch ? idMatch[1] : null };
        }
    }

    // Last resort: find textarea whose ID contains "dock" (dock panel textarea)
    const dockTextarea = capturedBody.match(/id="([^"]*dockDetail[^"]*)"[^>]*>([\s\S]*?)<\/textarea/i);
    if (dockTextarea) {
        const source = _decodeHtml(dockTextarea[2]);
        return { source, textareaId: dockTextarea[1] };
    }

    return null;
}

/**
 * Parse textarea content from response HTML by exact ID.
 */
function _parseTextarea(html, textareaId) {
    const escaped = textareaId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`id="${escaped}"[^>]*>([\\s\\S]*?)</textarea`, 'i');
    const match = html.match(re);
    return match ? _decodeHtml(match[1]) : null;
}

/**
 * Decode HTML entities.
 */
function _decodeHtml(html) {
    return html
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

/**
 * Normalize boolean-like values from grid cells.
 */
function _normalizeBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const v = value.toLowerCase().trim();
        if (v === 'true' || v === 'yes' || v === 'on' || v === 'enabled') return true;
    }
    return false;
}

/**
 * Sequential fallback extraction when no browser context is available.
 */
async function _extractSequential(page, config, itemsToExtract) {
    const results = new Map();
    const skipped = new Set();
    let textareaId = null;

    // Group by connection for fewer navigations
    const byConnection = new Map();
    for (const item of itemsToExtract) {
        const key = item.connectionId;
        if (!byConnection.has(key)) byConnection.set(key, []);
        byConnection.get(key).push(item);
    }

    for (const [connectionId, items] of byConnection) {
        const url = vvAdmin.adminUrl(config, `ConnectionQueryAdmin?CcID=${connectionId}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });

        const targetNames = new Set(items.map((i) => i.name));
        let pageNum = 0;

        while (pageNum < 30 && results.size + skipped.size < targetNames.size + results.size) {
            pageNum++;
            for (const item of items) {
                if (results.has(item.name) || skipped.has(item.name)) continue;

                const editInfo = await _findEditLink(page, item.name);
                if (!editInfo) continue;

                process.stdout.write(`    ${item.name}...`);
                const sql = await _extractSql(page, editInfo, textareaId);
                if (sql) {
                    if (sql.textareaId) textareaId = sql.textareaId;
                    const hash = crypto.createHash('sha256').update(sql.source).digest('hex');
                    results.set(item.name, { source: sql.source, contentHash: hash });
                    process.stdout.write(` OK (${sql.source.length} chars)\n`);
                } else {
                    skipped.add(item.name);
                    process.stdout.write(` SKIP\n`);
                }
            }

            // Check if we got all on this connection
            const remaining = items.filter((i) => !results.has(i.name) && !skipped.has(i.name));
            if (remaining.length === 0) break;

            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'ConnectionQueryAdmin');
            if (!advanced) break;
        }
    }

    if (skipped.size > 0) {
        console.log(`  Skipped ${skipped.size}: ${[...skipped].join(', ')}`);
    }

    return results;
}
