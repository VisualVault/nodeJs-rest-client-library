#!/usr/bin/env node
/**
 * Explore the outsideprocessadmin page structure to understand how to extract
 * web service script source code. Takes screenshots and dumps DOM structure.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ENV_JSON_PATH = path.resolve(__dirname, '..', '..', '.env.json');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', 'tasks', 'date-handling', 'wadnr-impact', '_exploration');

function loadWadnrConfig() {
    const raw = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    const server = raw.servers['vv5dev'];
    const wadnr = server.customers['WADNR'];
    return {
        baseUrl: server.baseUrl,
        username: wadnr.username,
        password: wadnr.loginPassword,
        customerAlias: wadnr.customerAlias,
        databaseAlias: wadnr.databaseAlias,
    };
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

async function main() {
    const config = loadWadnrConfig();
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await login(page, config);

        // Navigate to outsideprocessadmin
        const adminUrl = `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/outsideprocessadmin`;
        console.log(`\nNavigating to: ${adminUrl}`);
        await page.goto(adminUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('.rgMasterTable', { timeout: 30000 });
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-grid-loaded.png'), fullPage: true });
        console.log('Grid loaded. Screenshot saved.');

        // Inspect grid structure
        const gridInfo = await page.evaluate(() => {
            const table = document.querySelector('.rgMasterTable');
            if (!table) return { error: 'No grid found' };

            // Header columns
            const headers = Array.from(table.querySelectorAll('thead th')).map((th, i) => ({
                index: i,
                text: th.textContent.trim().substring(0, 50),
                className: th.className,
            }));

            // First row structure
            const firstRow = table.querySelector('tbody tr.rgRow, tbody tr.rgAltRow');
            let firstRowCells = [];
            if (firstRow) {
                firstRowCells = Array.from(firstRow.querySelectorAll('td')).map((td, i) => ({
                    index: i,
                    text: td.textContent.trim().substring(0, 100),
                    html: td.innerHTML.substring(0, 300),
                    links: Array.from(td.querySelectorAll('a')).map(a => ({
                        text: a.textContent.trim(),
                        href: (a.getAttribute('href') || '').substring(0, 200),
                        onclick: (a.getAttribute('onclick') || '').substring(0, 200),
                        id: a.id || '',
                    })),
                    inputs: Array.from(td.querySelectorAll('input, textarea, select')).map(el => ({
                        type: el.type || el.tagName.toLowerCase(),
                        id: el.id || '',
                        value: (el.value || '').substring(0, 100),
                    })),
                }));
            }

            // Total rows on this page
            const dataRows = table.querySelectorAll('tbody tr.rgRow, tbody tr.rgAltRow');

            // Pager info
            const pager = document.querySelector('.rgPager, [class*="Pager"]');
            const pagerHTML = pager ? pager.innerHTML.substring(0, 500) : 'No pager';

            return {
                headers,
                firstRowCells,
                rowCount: dataRows.length,
                pagerHTML,
            };
        });

        console.log(`\n=== Grid Structure ===`);
        console.log(`Rows on page: ${gridInfo.rowCount}`);
        console.log(`\nHeaders:`);
        gridInfo.headers.forEach(h => console.log(`  [${h.index}] "${h.text}"`));
        console.log(`\nFirst row cells:`);
        gridInfo.firstRowCells.forEach(c => {
            console.log(`  [${c.index}] text="${c.text}"`);
            if (c.links.length > 0) console.log(`         links:`, JSON.stringify(c.links));
            if (c.inputs.length > 0) console.log(`         inputs:`, JSON.stringify(c.inputs));
        });

        // Now click the first row's edit/view link to see what happens
        console.log('\n=== Attempting to open first script ===');

        // Set up network interception to capture AJAX requests
        const capturedRequests = [];
        page.on('request', req => {
            if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
                capturedRequests.push({
                    url: req.url().substring(0, 200),
                    method: req.method(),
                });
            }
        });

        // Find and click the first edit/view link
        const clickTarget = await page.evaluate(() => {
            const firstRow = document.querySelector('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
            if (!firstRow) return { error: 'No row found' };

            // Look for Edit/View links
            const links = firstRow.querySelectorAll('a');
            for (const a of links) {
                const text = a.textContent.trim().toLowerCase();
                if (text === 'edit' || text === 'view' || text === 'details') {
                    return { found: 'link', text: a.textContent.trim(), id: a.id };
                }
            }

            // Check for any clickable link in the name column
            // First find which column has the name
            const cells = Array.from(firstRow.querySelectorAll('td'));
            for (let i = 0; i < cells.length; i++) {
                const link = cells[i].querySelector('a:not([href="#"])');
                if (link && link.textContent.trim().length > 3) {
                    return { found: 'nameLink', text: link.textContent.trim(), cellIndex: i, id: link.id };
                }
            }

            // Check for buttons
            const buttons = firstRow.querySelectorAll('input[type="button"], button');
            for (const btn of buttons) {
                return { found: 'button', text: btn.value || btn.textContent, id: btn.id };
            }

            return { found: 'none', rowHTML: firstRow.innerHTML.substring(0, 500) };
        });

        console.log('Click target:', JSON.stringify(clickTarget, null, 2));

        if (clickTarget.found === 'link' || clickTarget.found === 'nameLink') {
            const selector = clickTarget.id ? `#${clickTarget.id}` : `a:has-text("${clickTarget.text}")`;

            // Check if click opens a popup or navigates
            const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
            const navPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);

            // Click the element
            if (clickTarget.id) {
                await page.click(`#${clickTarget.id}`);
            } else {
                // Click the first row's first meaningful link
                await page.evaluate(() => {
                    const firstRow = document.querySelector('.rgMasterTable tbody tr.rgRow');
                    const links = firstRow.querySelectorAll('a');
                    for (const a of links) {
                        if (a.textContent.trim().length > 3 && !a.getAttribute('href')?.startsWith('#')) {
                            a.click();
                            return;
                        }
                    }
                });
            }

            // Wait a moment for AJAX/navigation
            await page.waitForTimeout(3000);

            const popup = await popupPromise;
            const nav = await navPromise;

            if (popup) {
                console.log('Popup opened:', popup.url());
                await popup.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
                await popup.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-popup-opened.png'), fullPage: true });

                // Inspect popup content for script source
                const popupContent = await popup.evaluate(() => {
                    // Look for textareas, code editors, pre elements
                    const textareas = Array.from(document.querySelectorAll('textarea')).map(t => ({
                        id: t.id || '',
                        name: t.name || '',
                        rows: t.rows,
                        valueLength: t.value.length,
                        valuePreview: t.value.substring(0, 300),
                    }));

                    // CodeMirror editors
                    const codeMirrors = document.querySelectorAll('.CodeMirror');

                    // Pre/code elements
                    const preElements = Array.from(document.querySelectorAll('pre, code')).map(el => ({
                        tag: el.tagName,
                        textLength: el.textContent.length,
                        textPreview: el.textContent.substring(0, 300),
                    }));

                    // All input fields
                    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="hidden"], select')).map(el => ({
                        id: el.id || '',
                        name: el.name || '',
                        type: el.type || el.tagName,
                        value: (el.value || '').substring(0, 100),
                    }));

                    // Form elements
                    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
                        id: f.id || '',
                        action: f.action || '',
                    }));

                    return { textareas, codeMirrorCount: codeMirrors.length, preElements, inputs, forms, title: document.title };
                });

                console.log('\nPopup content:', JSON.stringify(popupContent, null, 2));
                await popup.close().catch(() => {});
            } else {
                console.log('No popup — checking for inline changes or navigation...');
                console.log('Current URL:', page.url());
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-after-click.png'), fullPage: true });

                // Check for modal/dialog
                const modalContent = await page.evaluate(() => {
                    // Look for modals, dialogs, expanded rows
                    const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"], [class*="popup"], [role="dialog"]');
                    const expandedRows = document.querySelectorAll('.rgEditRow, .rgEditForm, [class*="Edit"]');
                    const textareas = Array.from(document.querySelectorAll('textarea')).map(t => ({
                        id: t.id || '',
                        name: t.name || '',
                        rows: t.rows,
                        valueLength: t.value.length,
                        valuePreview: t.value.substring(0, 300),
                    }));

                    return {
                        modalCount: modals.length,
                        expandedRowCount: expandedRows.length,
                        textareas,
                        pageTitle: document.title,
                    };
                });

                console.log('Modal/dialog check:', JSON.stringify(modalContent, null, 2));
            }

            // Show captured AJAX requests
            if (capturedRequests.length > 0) {
                console.log(`\nCaptured ${capturedRequests.length} AJAX requests:`);
                capturedRequests.forEach(r => console.log(`  ${r.method} ${r.url}`));
            }
        } else {
            console.log('No edit/view link found. Trying to click the row name directly...');

            // Try clicking any cell in the name column
            await page.evaluate(() => {
                const firstRow = document.querySelector('.rgMasterTable tbody tr.rgRow');
                if (firstRow) {
                    const cells = firstRow.querySelectorAll('td');
                    // Click the cell that has the most text (likely the name)
                    let maxText = '';
                    let targetCell = null;
                    cells.forEach(c => {
                        if (c.textContent.trim().length > maxText.length) {
                            maxText = c.textContent.trim();
                            targetCell = c;
                        }
                    });
                    if (targetCell) targetCell.click();
                }
            });

            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-after-cell-click.png'), fullPage: true });
        }

        console.log('\n=== Exploration complete ===');
        console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
    } catch (err) {
        console.error('Error:', err.message);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png'), fullPage: true }).catch(() => {});
        throw err;
    } finally {
        await browser.close();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
