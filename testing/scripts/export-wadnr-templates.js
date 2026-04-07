/**
 * Export WADNR form template XMLs via Playwright.
 *
 * Navigates to FormTemplateAdmin, reads the Telerik RadGrid, and exports
 * each template whose name does NOT start with "z" (case-insensitive).
 * XMLs are saved to tasks/date-handling/wadnr-impact/form-templates/.
 *
 * Usage:
 *   node testing/scripts/export-wadnr-templates.js [--dry-run] [--headless]
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// --- Config ---

const ENV_JSON_PATH = path.resolve(__dirname, '..', '..', '.env.json');
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'tasks', 'date-handling', 'wadnr-impact', 'form-templates');

// Grid column indices (discovered from dry run)
const COL_CATEGORY = 1;
const COL_NAME = 2;
// Export button is at column 9 but we find it by value="Export" in the row

function loadVv5devConfig() {
    const raw = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    const env = raw.environments && raw.environments['vv5dev'];
    if (!env) throw new Error('No "vv5dev" environment in .env.json');
    return {
        baseUrl: env.baseUrl,
        username: env.username,
        password: env.loginPassword,
        customerAlias: env.customerAlias,
        databaseAlias: env.databaseAlias,
    };
}

// --- CLI args ---

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const HEADLESS = args.includes('--headless');

// --- Helpers ---

function sanitizeFilename(name) {
    return name
        .replace(/[^a-zA-Z0-9_\-. ]/g, '_')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function login(page, config) {
    console.log('Logging in to vv5dev...');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    if (page.url().includes('/app/') || page.url().includes('/VVPortalUI/')) {
        console.log('Already logged in.');
        return;
    }

    await page.getByRole('textbox', { name: 'User Name' }).fill(config.username);
    await page.getByRole('textbox', { name: 'Password' }).fill(config.password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForFunction(
        () => document.location.pathname !== '/' && !document.location.pathname.includes('login'),
        { timeout: 15000 }
    );
    console.log('Login OK:', page.url());
}

async function navigateToAdmin(page, config) {
    const url = `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/FormTemplateAdmin`;
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
    console.log('FormTemplateAdmin loaded.');
}

/**
 * Read all template rows from the current grid page.
 * Returns [{name, category, rowIndex}] for rgRow/rgAltRow only.
 */
async function readCurrentPage(page) {
    return page.evaluate(
        ({ colName, colCategory }) => {
            const rows = document.querySelectorAll(
                '#ctl00_ContentBody_DG1_ctl00 tbody tr.rgRow, #ctl00_ContentBody_DG1_ctl00 tbody tr.rgAltRow'
            );
            const results = [];
            for (let i = 0; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll('td'));
                const name = (cells[colName] || {}).textContent?.trim() || '';
                const category = (cells[colCategory] || {}).textContent?.trim() || '';
                if (name) results.push({ name, category, rowIndex: i });
            }
            return results;
        },
        { colName: COL_NAME, colCategory: COL_CATEGORY }
    );
}

/**
 * Get pagination info from the Telerik RadGrid pager.
 * Current page is the <a class="rgCurrentPage"> element.
 * Available pages are <a> elements in .rgNumPart with href="javascript:__doPostBack(...)".
 */
async function getPaginationInfo(page) {
    return page.evaluate(() => {
        const numPart = document.querySelector('.rgNumPart');
        if (!numPart) return { currentPage: 1, totalPages: 1, hasNext: false, maxVisible: 1 };

        const links = numPart.querySelectorAll('a');
        let currentPage = 1;
        const pageNums = [];

        for (const link of links) {
            const num = parseInt(link.textContent.trim());
            if (!isNaN(num)) {
                pageNums.push(num);
                if (link.classList.contains('rgCurrentPage')) currentPage = num;
            }
        }

        const maxVisible = pageNums.length > 0 ? Math.max(...pageNums) : 1;
        const hasNext = currentPage < maxVisible || !!document.querySelector('.rgPageNext:not(.rgDisabled)');

        return { currentPage, totalPages: maxVisible, hasNext, maxVisible };
    });
}

/**
 * Navigate to the next grid page.
 * VV FormTemplateAdmin uses Telerik RadGrid with ASP.NET __doPostBack.
 * The page links have href="javascript:__doPostBack(target, '')".
 * We extract the target and invoke __doPostBack directly, then wait for
 * either a full page navigation or an AJAX response.
 */
async function goToNextPage(page, currentPage) {
    const nextNum = currentPage + 1;

    // Extract the __doPostBack target for the next page number link
    let postbackTarget = await page.evaluate((targetNum) => {
        const links = document.querySelectorAll('.rgNumPart a');
        for (const link of links) {
            if (parseInt(link.textContent.trim()) === targetNum) {
                const match = (link.getAttribute('href') || '').match(/__doPostBack\('([^']+)'/);
                if (match) return match[1];
            }
        }
        // Fallback: Next button
        const nextBtn = document.querySelector('input.rgPageNext');
        if (nextBtn) {
            const match = (nextBtn.getAttribute('onclick') || '').match(/__doPostBack\('([^']+)'/);
            if (match) return match[1];
        }
        return null;
    }, nextNum);

    if (!postbackTarget) {
        console.log(`  No postback target found for page ${nextNum}`);
        return false;
    }

    console.log(`  Posting back: ${postbackTarget}`);

    // __doPostBack uses arguments.callee which fails in Playwright's strict-mode evaluate.
    // Inject a <script> tag to call it from the page's own non-strict context.
    // __doPostBack triggers an AJAX partial postback (UpdatePanel).
    // Wait for the POST response that carries the updated grid HTML.
    const responsePromise = page.waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes('FormTemplateAdmin'),
        { timeout: 30000 }
    );
    await page.addScriptTag({
        content: `__doPostBack('${postbackTarget.replace(/'/g, "\\'")}', '');`,
    });
    await responsePromise;
    await page.waitForTimeout(1000); // Let the DOM update from the AJAX response

    await page.waitForSelector('.rgMasterTable', { timeout: 15000 });
    return true;
}

/**
 * Export a single template by triggering its Export button's __doPostBack.
 * The Export button is an input[value="Export"] inside the template's row.
 * Its onclick contains __doPostBack(target, '') which we extract and call
 * via addScriptTag (to avoid strict mode issues).
 */
async function exportTemplateByName(page, templateName) {
    const filename = sanitizeFilename(templateName) + '.xml';
    const filePath = path.join(OUTPUT_DIR, filename);

    // Find the Export button's __doPostBack target for this template row
    const exportTarget = await page.evaluate(
        ({ targetName, colName }) => {
            const rows = document.querySelectorAll(
                '#ctl00_ContentBody_DG1_ctl00 tbody tr.rgRow, #ctl00_ContentBody_DG1_ctl00 tbody tr.rgAltRow'
            );
            for (const row of rows) {
                const cells = Array.from(row.querySelectorAll('td'));
                const name = (cells[colName] || {}).textContent?.trim();
                if (name === targetName) {
                    // Export is an <a> link with title="Export Form Template"
                    const btn = row.querySelector('a[title*="Export"]') || row.querySelector('input[value="Export"]');
                    if (!btn) return { error: 'No Export button in row' };
                    // Extract __doPostBack target from href or onclick
                    const href = btn.getAttribute('href') || '';
                    const onclick = btn.getAttribute('onclick') || '';
                    const match = (href + onclick).match(/__doPostBack\('([^']+)'/);
                    return { target: match ? match[1] : null };
                }
            }
            return { error: 'Row not found: ' + targetName };
        },
        { targetName: templateName, colName: COL_NAME }
    );

    if (exportTarget.error) {
        console.error(`  FAIL: ${exportTarget.error}`);
        return false;
    }

    if (!exportTarget.target) {
        console.error(`  FAIL: Could not extract postback target for Export button`);
        return false;
    }

    // Set up download listener BEFORE triggering the postback
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });

    // Trigger the export via __doPostBack (injected script to avoid strict mode)
    await page.addScriptTag({
        content: `__doPostBack('${exportTarget.target.replace(/'/g, "\\'")}', '');`,
    });

    try {
        const download = await downloadPromise;
        await download.saveAs(filePath);
        const size = fs.statSync(filePath).size;
        console.log(`  OK: ${filename} (${(size / 1024).toFixed(1)} KB)`);

        // Wait for page to settle after postback
        await page.waitForResponse((resp) => resp.request().method() === 'POST', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500);

        return true;
    } catch (err) {
        console.error(`  Download failed: ${err.message}`);
        return false;
    }
}

// --- Main ---

async function main() {
    const config = loadVv5devConfig();
    const adminUrl = `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/FormTemplateAdmin`;
    console.log(`Target: ${adminUrl}`);
    console.log(`Output: ${OUTPUT_DIR}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXPORT'}\n`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
        await login(page, config);
        await navigateToAdmin(page, config);

        // Check for iframes — VV admin pages often use iframes
        const frames = page.frames();
        console.log(`Frames found: ${frames.length}`);
        for (const f of frames) {
            console.log(`  Frame: ${f.name() || '(unnamed)'} — ${f.url().substring(0, 100)}`);
        }

        // Debug: inspect the pager DOM structure
        const pagerDebug = await page.evaluate(() => {
            const pagerArea = document.querySelector('.rgPager, [class*="pager"], [class*="Pager"]');
            if (!pagerArea) return 'No pager found';
            return {
                html: pagerArea.innerHTML.substring(0, 2000),
                classes: pagerArea.className,
                buttons: Array.from(pagerArea.querySelectorAll('a, button, input, span')).map((el) => ({
                    tag: el.tagName,
                    text: el.textContent.trim().substring(0, 30),
                    class: el.className,
                    title: el.title || '',
                    type: el.type || '',
                    value: el.value || '',
                })),
            };
        });
        console.log('Pager debug:', JSON.stringify(pagerDebug, null, 2));

        // Read all templates across all pages
        const allTemplates = [];
        const seenNames = new Set();
        let pageNum = 0;
        const MAX_PAGES = 100;

        while (pageNum < MAX_PAGES) {
            pageNum++;
            const pageTemplates = await readCurrentPage(page);

            const newOnThisPage = pageTemplates.filter((t) => !seenNames.has(t.name));
            if (newOnThisPage.length === 0 && pageNum > 1) {
                console.log(`Page ${pageNum}: all duplicates — stopping.`);
                break;
            }

            console.log(`Page ${pageNum}: ${pageTemplates.length} templates (${newOnThisPage.length} new)`);

            for (const t of newOnThisPage) {
                seenNames.add(t.name);
                allTemplates.push(t);
            }

            const pager = await getPaginationInfo(page);
            console.log(`  pager: page=${pager.currentPage}/${pager.totalPages}, hasNext=${pager.hasNext}`);
            if (!pager.hasNext) break;

            const advanced = await goToNextPage(page, pager.currentPage);
            if (!advanced) {
                console.log('  Could not advance to next page — stopping.');
                break;
            }
        }

        // Filter
        const toExport = allTemplates.filter((t) => !t.name.toLowerCase().startsWith('z'));
        const excluded = allTemplates.filter((t) => t.name.toLowerCase().startsWith('z'));

        console.log(`\nTotal templates found: ${allTemplates.length}`);
        console.log(`To export (non-z): ${toExport.length}`);
        console.log(`Excluded (z-prefix): ${excluded.length}`);
        if (excluded.length > 0) {
            console.log(`  Excluded: ${excluded.map((t) => t.name).join(', ')}`);
        }

        console.log('\nTemplate list:');
        for (const t of toExport) {
            console.log(`  [${t.category || '-'}] ${t.name}`);
        }

        if (DRY_RUN) {
            console.log('\n--- DRY RUN COMPLETE ---');
            await browser.close();
            return;
        }

        // Parallel export: launch N worker pages, each handling a slice of templates.
        // Each worker logs in (shares cookies), navigates to FormTemplateAdmin,
        // finds its template, exports, re-navigates, repeats.
        const CONCURRENCY = 2; // Fewer workers for reliability on retry
        console.log(`\n--- Starting parallel exports (${CONCURRENCY} workers) ---\n`);

        // Split templates into chunks for each worker
        const remaining = toExport.filter((t) => {
            const fp = path.join(OUTPUT_DIR, sanitizeFilename(t.name) + '.xml');
            return !fs.existsSync(fp) || fs.statSync(fp).size < 100;
        });
        const alreadyDone = toExport.length - remaining.length;
        if (alreadyDone > 0) console.log(`Skipping ${alreadyDone} already exported templates.`);
        console.log(`Remaining to export: ${remaining.length}\n`);

        // Shared progress counter
        let success = alreadyDone;
        let failed = 0;

        // Create a work queue
        let nextIdx = 0;

        async function worker(workerId) {
            const workerPage = await context.newPage();
            try {
                await login(workerPage, config);

                while (nextIdx < remaining.length) {
                    const idx = nextIdx++;
                    if (idx >= remaining.length) break;
                    const t = remaining[idx];

                    // Skip if another worker already exported it
                    const fp = path.join(OUTPUT_DIR, sanitizeFilename(t.name) + '.xml');
                    if (fs.existsSync(fp) && fs.statSync(fp).size > 100) {
                        success++;
                        continue;
                    }

                    console.log(`[W${workerId}] [${success + failed + 1}/${toExport.length}] ${t.name}`);

                    // Navigate to admin and find the template
                    await navigateToAdmin(workerPage, config);

                    let found = false;
                    for (let attempts = 0; attempts < 20; attempts++) {
                        const templates = await readCurrentPage(workerPage);
                        if (templates.find((ct) => ct.name === t.name)) {
                            found = true;
                            break;
                        }
                        const pager = await getPaginationInfo(workerPage);
                        if (!pager.hasNext) break;
                        await goToNextPage(workerPage, pager.currentPage);
                    }

                    if (!found) {
                        console.error(`[W${workerId}]   FAIL: not found on grid`);
                        failed++;
                        continue;
                    }

                    const ok = await exportTemplateByName(workerPage, t.name);
                    if (ok) {
                        success++;
                    } else {
                        failed++;
                    }
                }
            } catch (err) {
                console.error(`[W${workerId}] Worker error: ${err.message}`);
            } finally {
                await workerPage.close();
            }
        }

        // Launch workers in parallel
        const workers = [];
        for (let w = 0; w < Math.min(CONCURRENCY, remaining.length); w++) {
            workers.push(worker(w + 1));
        }
        await Promise.all(workers);

        console.log(`\n--- Export complete ---`);
        console.log(`Success: ${success}/${toExport.length}`);
        if (failed > 0) console.log(`Failed: ${failed}`);

        const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.xml'));
        console.log(`Files in output dir: ${files.length}`);
    } catch (err) {
        console.error('Fatal error:', err.message);
        await page.screenshot({ path: path.join(OUTPUT_DIR, '_error-screenshot.png'), fullPage: true }).catch(() => {});
        throw err;
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
