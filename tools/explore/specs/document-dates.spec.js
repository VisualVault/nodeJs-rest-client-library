/**
 * Document Library Date Field Investigation
 *
 * Explores how the Document Library UI handles date-type index fields:
 *   1. Navigate to Document Library → TestFolder → see date display
 *   2. Check if date index fields appear in the document grid
 *   3. Open a document's index fields panel → see date display/edit UI
 *   4. Intercept network traffic during date edit to see what the UI sends
 *   5. Compare API-stored value vs UI-displayed value
 *
 * Prerequisites:
 *   - /TestFolder exists with "Date" index field assigned (fieldType 4)
 *   - Document "Test1003" in /TestFolder has Date set to 2026-03-15T14:30:00
 */
const { test } = require('@playwright/test');
const { loadConfig } = require('../../../testing/fixtures/env-config');
const { createResponseCollector, scanDOM, formatReport } = require('../../helpers/vv-explore');

const config = loadConfig();
const CUSTOMER = config.customerAlias;
const DATABASE = config.databaseAlias;
const adminUrl = (section) => `/app/${CUSTOMER}/${DATABASE}/${section}`;

test.describe.configure({ mode: 'serial' });

test.describe('Document Library Date Investigation', () => {
    test('Probe 1: Document Library navigation and folder tree', async ({ page }, testInfo) => {
        await page.goto(adminUrl('DocumentLibrary'));
        await page.waitForLoadState('networkidle');

        // Take screenshot of initial state
        const screenshot = await page.screenshot();
        await testInfo.attach('doc-library-initial', { body: screenshot, contentType: 'image/png' });

        // Enumerate the folder tree structure
        const treeData = await page.evaluate(() => {
            const nodes = [];
            // VV uses Telerik RadTreeView for the folder tree
            document.querySelectorAll('.rtIn, .RadTreeView a, [class*="TreeView"] a, .rtLI').forEach((el) => {
                const text = el.textContent.trim();
                const href = el.getAttribute('href') || '';
                if (text && text.length < 100) {
                    nodes.push({ text, href, tag: el.tagName, className: (el.className || '').substring(0, 50) });
                }
            });

            // Also check for any tree nodes with different selectors
            document.querySelectorAll('[class*="TreeNode"], [class*="treenode"], [role="treeitem"]').forEach((el) => {
                const text = el.textContent.trim().substring(0, 80);
                if (text && !nodes.some((n) => n.text === text)) {
                    nodes.push({ text, tag: el.tagName, className: (el.className || '').substring(0, 50) });
                }
            });

            return nodes;
        });

        const findings = [
            `Folder tree nodes: ${treeData.length}`,
            ...treeData.map((n) => `  "${n.text}" <${n.tag}> class="${n.className}"`),
        ];

        console.log(formatReport('PROBE 1: Document Library Layout', [{ name: 'Folder Tree', findings }]));
        await testInfo.attach('probe-1-tree', {
            body: JSON.stringify(treeData, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 2: Navigate to TestFolder and inspect document grid', async ({ page }, testInfo) => {
        await page.goto(adminUrl('DocumentLibrary'));
        await page.waitForLoadState('networkidle');

        // Click TestFolder in the tree
        const testFolder = page.locator('text=TestFolder').first();
        if (await testFolder.isVisible()) {
            await testFolder.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000); // wait for grid to load

            const screenshot = await page.screenshot();
            await testInfo.attach('testfolder-view', { body: screenshot, contentType: 'image/png' });

            // Check the document grid for date columns
            const gridData = await page.evaluate(() => {
                const data = {
                    headers: [],
                    rows: [],
                    dateDisplays: [],
                };

                // Grid headers
                document.querySelectorAll('th, .rgHeader, .k-header').forEach((h) => {
                    const text = h.textContent.trim();
                    if (text) data.headers.push(text);
                });

                // Grid rows — look for date-like values
                document.querySelectorAll('td, .rgRow td, .rgAltRow td').forEach((td) => {
                    const text = td.textContent.trim();
                    if (/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(text)) {
                        data.dateDisplays.push({
                            text,
                            className: (td.className || '').substring(0, 40),
                            colIndex: td.cellIndex,
                        });
                    }
                });

                // All row content
                document.querySelectorAll('tr.rgRow, tr.rgAltRow').forEach((row) => {
                    const cells = [...row.querySelectorAll('td')].map((td) => td.textContent.trim().substring(0, 80));
                    if (cells.length > 0) data.rows.push(cells);
                });

                return data;
            });

            const findings = [
                `Grid headers: ${gridData.headers.join(' | ')}`,
                '',
                `Rows: ${gridData.rows.length}`,
                ...gridData.rows.map((r) => `  ${r.join(' | ')}`),
                '',
                `Date-like cell values: ${gridData.dateDisplays.length}`,
                ...gridData.dateDisplays.map((d) => `  col[${d.colIndex}]: "${d.text}"`),
            ];

            console.log(formatReport('PROBE 2: TestFolder Grid', [{ name: 'Document Grid', findings }]));
            await testInfo.attach('probe-2-grid', {
                body: JSON.stringify(gridData, null, 2),
                contentType: 'application/json',
            });
        } else {
            console.log('TestFolder not found in tree — may need to expand parent nodes');
            const screenshot = await page.screenshot();
            await testInfo.attach('testfolder-not-found', { body: screenshot, contentType: 'image/png' });
        }
    });

    test('Probe 3: Open document detail and inspect index fields panel', async ({ page }, testInfo) => {
        await page.goto(adminUrl('DocumentLibrary'));
        await page.waitForLoadState('networkidle');

        // Navigate to TestFolder
        const testFolder = page.locator('text=TestFolder').first();
        if (!(await testFolder.isVisible())) {
            console.log('TestFolder not visible — skipping');
            return;
        }

        await testFolder.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Look for the document (Test1003) and try to open its detail/properties
        const docLink = page.locator('text=Test1003').first();
        if (await docLink.isVisible()) {
            // Try right-click for context menu or look for properties/edit link
            await docLink.click();
            await page.waitForTimeout(1000);

            const screenshot = await page.screenshot();
            await testInfo.attach('doc-selected', { body: screenshot, contentType: 'image/png' });

            // Look for index fields panel/tab
            const indexData = await page.evaluate(() => {
                const data = {
                    panels: [],
                    tabs: [],
                    inputs: [],
                    labels: [],
                    dateInputs: [],
                };

                // Tabs that might contain index fields
                document.querySelectorAll('.rtsTab, [role="tab"], .RadTabStrip a').forEach((tab) => {
                    data.tabs.push(tab.textContent.trim());
                });

                // Look for index field labels and inputs
                document.querySelectorAll('label, .indexFieldLabel, [class*="indexField"]').forEach((el) => {
                    const text = el.textContent.trim();
                    if (text && text.length < 50) data.labels.push(text);
                });

                // Date inputs (type=date, datepicker, calendar)
                document
                    .querySelectorAll(
                        'input[type="date"], input[type="datetime-local"], .k-datepicker input, [class*="calendar"] input, [class*="datepicker"] input'
                    )
                    .forEach((input) => {
                        data.dateInputs.push({
                            type: input.type,
                            name: input.name || input.id,
                            value: input.value,
                            className: (input.className || '').substring(0, 50),
                        });
                    });

                // All inputs in the detail area
                document
                    .querySelectorAll(
                        '.RadDock input, .RadSlidingZone input, [id*="Detail"] input, [id*="detail"] input'
                    )
                    .forEach((input) => {
                        data.inputs.push({
                            type: input.type,
                            name: input.name || input.id,
                            value: input.value?.substring(0, 60),
                            className: (input.className || '').substring(0, 50),
                        });
                    });

                // Panels/docks
                document.querySelectorAll('.RadDock, .rdTitleBar, [class*="Panel"]').forEach((el) => {
                    const title = el.querySelector('.rdTitle, .rdTitleBar span')?.textContent?.trim();
                    if (title) data.panels.push(title);
                });

                return data;
            });

            const findings = [
                `Tabs: ${indexData.tabs.join(' | ') || '(none)'}`,
                `Panels: ${indexData.panels.join(' | ') || '(none)'}`,
                `Labels: ${indexData.labels.join(' | ') || '(none)'}`,
                '',
                `Date inputs: ${indexData.dateInputs.length}`,
                ...indexData.dateInputs.map(
                    (d) => `  <input type="${d.type}"> name="${d.name}" value="${d.value}" class="${d.className}"`
                ),
                '',
                `All detail inputs: ${indexData.inputs.length}`,
                ...indexData.inputs.map((d) => `  <input type="${d.type}"> name="${d.name}" value="${d.value}"`),
            ];

            console.log(formatReport('PROBE 3: Document Detail', [{ name: 'Index Fields', findings }]));
            await testInfo.attach('probe-3-detail', {
                body: JSON.stringify(indexData, null, 2),
                contentType: 'application/json',
            });
        } else {
            console.log('Test1003 document not found in grid');
        }
    });

    test('Probe 4: Network intercept — what does the UI send when editing dates?', async ({ page }, testInfo) => {
        const collector = createResponseCollector(page, { maxBodySize: 5000 });

        await page.goto(adminUrl('DocumentLibrary'));
        await page.waitForLoadState('networkidle');

        // Navigate to TestFolder
        const testFolder = page.locator('text=TestFolder').first();
        if (!(await testFolder.isVisible())) {
            console.log('TestFolder not visible — skipping');
            return;
        }

        await testFolder.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Start capturing before any interactions
        collector.start();

        // Click on the document
        const docLink = page.locator('text=Test1003').first();
        if (await docLink.isVisible()) {
            await docLink.click();
            await page.waitForTimeout(2000);

            // Look for and click on index field tabs (like "Library Stats" or "Index Fields")
            const tabs = page.locator('.rtsTab, [role="tab"]');
            const tabCount = await tabs.count();
            for (let i = 0; i < tabCount; i++) {
                const tabText = await tabs.nth(i).textContent();
                console.log(`Tab ${i}: "${tabText.trim()}"`);
                if (/index|field|detail|propert/i.test(tabText)) {
                    await tabs.nth(i).click();
                    await page.waitForTimeout(1500);
                }
            }

            await page.waitForTimeout(2000);
        }

        collector.stop();
        const responses = collector.getResults();

        // Filter for API/service calls (not static assets)
        const apiCalls = responses.filter(
            (r) => r.url.includes('/api/') || r.url.includes('/UIServices/') || r.url.includes('.asmx')
        );

        const findings = [
            `Total responses: ${responses.length}`,
            `API/service calls: ${apiCalls.length}`,
            '',
            ...apiCalls.map((r) => {
                const shortUrl = r.url.replace(config.baseUrl, '');
                let body = '';
                if (r.body && r.contentType?.includes('json')) {
                    body = `\n    Body: ${r.body.substring(0, 200)}`;
                }
                return `  [${r.status}] ${shortUrl.substring(0, 100)}${body}`;
            }),
        ];

        console.log(formatReport('PROBE 4: Network Traffic', [{ name: 'API Calls', findings }]));
        await testInfo.attach('probe-4-network', {
            body: JSON.stringify(
                apiCalls.map((r) => ({ url: r.url, status: r.status, body: r.body?.substring(0, 500) })),
                null,
                2
            ),
            contentType: 'application/json',
        });

        // Take final screenshot
        const screenshot = await page.screenshot();
        await testInfo.attach('probe-4-final', { body: screenshot, contentType: 'image/png' });
    });

    test('Probe 5: Document detail page — index field display', async ({ page }, testInfo) => {
        // Try the FormDetails-style URL which opens a document in the VV shell
        // The Document Library might use a dock/panel approach instead
        await page.goto(adminUrl('DocumentLibrary'));
        await page.waitForLoadState('networkidle');

        // Navigate to TestFolder
        const testFolder = page.locator('text=TestFolder').first();
        if (!(await testFolder.isVisible())) return;

        await testFolder.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Double-click the document to open it (common pattern for document detail)
        const docRow = page.locator('text=Test1003').first();
        if (!(await docRow.isVisible())) return;

        // Try double-click to open
        await docRow.dblclick();
        await page.waitForTimeout(3000);

        const screenshot = await page.screenshot();
        await testInfo.attach('doc-detail-dblclick', { body: screenshot, contentType: 'image/png' });

        // Scan the entire page for date-like values
        const dateData = await page.evaluate(() => {
            const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
            const matches = [];

            // Walk all visible text
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
                const text = walker.currentNode.textContent.trim();
                const match = text.match(datePattern);
                if (match) {
                    const parent = walker.currentNode.parentElement;
                    matches.push({
                        text: match[0],
                        context: text.substring(0, 100),
                        tag: parent?.tagName,
                        id: parent?.id,
                        className: (parent?.className || '').substring(0, 50),
                    });
                }
            }

            // Check all input values too
            const inputs = [];
            document.querySelectorAll('input, textarea').forEach((input) => {
                if (datePattern.test(input.value)) {
                    inputs.push({
                        type: input.type,
                        name: input.name || input.id,
                        value: input.value,
                        className: (input.className || '').substring(0, 50),
                    });
                }
            });

            return { textMatches: matches, inputMatches: inputs };
        });

        const findings = [
            `Date text on page: ${dateData.textMatches.length}`,
            ...dateData.textMatches.map((m) => `  "${m.text}" in <${m.tag}> id="${m.id}" context="${m.context}"`),
            '',
            `Date input values: ${dateData.inputMatches.length}`,
            ...dateData.inputMatches.map((m) => `  <input type="${m.type}"> name="${m.name}" value="${m.value}"`),
        ];

        console.log(formatReport('PROBE 5: Date Values on Page', [{ name: 'Date Display', findings }]));
        await testInfo.attach('probe-5-dates', {
            body: JSON.stringify(dateData, null, 2),
            contentType: 'application/json',
        });
    });
});
