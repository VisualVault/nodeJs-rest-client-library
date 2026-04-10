/**
 * Reusable helpers for scraping VV admin pages (Telerik RadGrid + ASP.NET).
 *
 * These helpers abstract the common patterns across VV admin pages:
 * - Login to vv5dev environments
 * - Telerik RadGrid pagination
 * - ASP.NET __doPostBack triggers
 * - Dock panel detail extraction
 *
 * Designed for use with Playwright — pass a `page` instance.
 */
const fs = require('fs');
const path = require('path');

const ENV_JSON_PATH = path.resolve(__dirname, '..', '..', '.env.json');

/**
 * Find a customer in .env.json by name (case-insensitive).
 * Returns { server, customer } with the exact key names from .env.json, or null.
 */
function findCustomer(name) {
    const env = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    const needle = name.toLowerCase();
    for (const [serverKey, serverObj] of Object.entries(env.servers || {})) {
        for (const customerKey of Object.keys(serverObj.customers || {})) {
            if (customerKey.toLowerCase() === needle) {
                return { server: serverKey, customer: customerKey };
            }
        }
    }
    return null;
}

/**
 * List all available server/customer pairs from .env.json.
 * @returns {string[]} e.g., ['vvdemo/EmanuelJofre', 'vv5dev/WADNR']
 */
function listCustomers() {
    const env = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    return Object.entries(env.servers || {}).flatMap(([s, obj]) =>
        Object.keys(obj.customers || {}).map((c) => `${s}/${c}`)
    );
}

/**
 * Get the active server/customer from .env.json.
 * @returns {{ server: string, customer: string }}
 */
function getActiveCustomer() {
    const env = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    return { server: env.activeServer, customer: env.activeCustomer };
}

/**
 * Load credentials for a specific server/customer from .env.json.
 * @param {string} serverName - e.g., 'vv5dev', 'vvdemo'
 * @param {string} customerName - e.g., 'WADNR', 'EmanuelJofre'
 */
function loadEnvConfig(serverName, customerName) {
    const raw = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    const server = raw.servers && raw.servers[serverName];
    if (!server) throw new Error(`No "${serverName}" server in .env.json`);
    const customer = server.customers && server.customers[customerName];
    if (!customer) throw new Error(`No "${customerName}" customer under ${serverName}`);
    return {
        baseUrl: server.baseUrl,
        username: customer.username,
        password: customer.loginPassword,
        customerAlias: customer.customerAlias,
        databaseAlias: customer.databaseAlias,
        clientId: customer.clientId,
        clientSecret: customer.clientSecret,
        audience: customer.audience || '',
        readOnly: customer.readOnly === true,
    };
}

/**
 * Login to a VV environment via the browser login form.
 */
async function login(page, config) {
    await page.goto(config.baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
    if (page.url().includes('/app/') || page.url().includes('/VVPortalUI/')) return;
    await page.getByRole('textbox', { name: 'User Name' }).fill(config.username);
    await page.getByRole('textbox', { name: 'Password' }).fill(config.password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForFunction(
        () => !document.location.pathname.includes('login') && document.location.pathname !== '/',
        { timeout: 15000 }
    );
}

/**
 * Build a VV admin page URL.
 * @param {object} config - loadEnvConfig result
 * @param {string} section - e.g., 'outsideprocessadmin', 'FormTemplateAdmin'
 */
function adminUrl(config, section) {
    return `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/${section}`;
}

/**
 * Trigger an ASP.NET __doPostBack via injected <script> tag.
 * This avoids strict-mode issues with page.evaluate + __doPostBack.
 * Waits for the POST response to complete.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} target - __doPostBack event target
 * @param {string} urlMatch - substring to match in the response URL
 * @param {number} timeout - ms
 */
async function triggerPostback(page, target, urlMatch, timeout = 30000) {
    const responsePromise = page
        .waitForResponse((resp) => resp.request().method() === 'POST' && resp.url().includes(urlMatch), { timeout })
        .catch(() => null);

    await page.addScriptTag({
        content: `__doPostBack('${target.replace(/'/g, "\\'")}', '');`,
    });

    await responsePromise;
    await page.waitForTimeout(500);
}

/**
 * Find all lnkDetails links on the current RadGrid page.
 * Returns [{name, linkId, postbackTarget}].
 */
async function getGridDetailLinks(page) {
    return page.evaluate(() => {
        const links = document.querySelectorAll('a[id*="lnkDetails"]');
        return Array.from(links)
            .map((a) => {
                const href = a.getAttribute('href') || '';
                const match = href.match(/__doPostBack\('([^']+)'/);
                return {
                    name: a.textContent.trim(),
                    linkId: a.id,
                    postbackTarget: match ? match[1] : null,
                };
            })
            .filter((l) => l.postbackTarget);
    });
}

/**
 * Navigate to the next RadGrid page.
 * @returns {boolean} true if navigation succeeded
 */
async function goToNextGridPage(page, currentPage, urlMatch) {
    const nextNum = currentPage + 1;

    const postbackTarget = await page.evaluate((targetNum) => {
        const links = document.querySelectorAll('.rgNumPart a');
        for (const link of links) {
            if (parseInt(link.textContent.trim()) === targetNum) {
                const m = (link.getAttribute('href') || '').match(/__doPostBack\('([^']+)'/);
                if (m) return m[1];
            }
        }
        const nextBtn = document.querySelector('input.rgPageNext:not(.rgDisabled)');
        if (nextBtn) {
            const m = (nextBtn.getAttribute('onclick') || '').match(/__doPostBack\('([^']+)'/);
            if (m) return m[1];
        }
        return null;
    }, nextNum);

    if (!postbackTarget) return false;

    await triggerPostback(page, postbackTarget, urlMatch);
    return true;
}

/**
 * Extract content from a dock panel by clicking a detail link and intercepting
 * the AJAX response. Parses the script source directly from the response body
 * rather than reading the DOM — avoids stale textarea issues.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} linkId - the lnkDetails link ID
 * @param {string} textareaId - the textarea DOM ID (used to find content in response)
 * @param {string} urlMatch - URL substring to match for the AJAX response
 * @param {object} opts - { extraFields: {key: regex_or_id}, dockSelector }
 * @returns {object|null} {source, ...extraFields} or null on failure
 */
async function extractDockPanelDetail(page, linkId, textareaId, urlMatch, opts = {}) {
    // Extract the postback target from the link's href
    const postbackTarget = await page.evaluate((id) => {
        const link = document.getElementById(id);
        if (!link) return null;
        const href = link.getAttribute('href') || '';
        const m = href.match(/__doPostBack\('([^']+)'/);
        return m ? m[1] : null;
    }, linkId);

    if (!postbackTarget) return null;

    // Set up response interception BEFORE triggering the postback
    let capturedBody = null;
    const responsePromise = page
        .waitForResponse(
            async (resp) => {
                if (resp.request().method() === 'POST' && resp.url().includes(urlMatch)) {
                    capturedBody = await resp.text();
                    return true;
                }
                return false;
            },
            { timeout: 20000 }
        )
        .catch(() => null);

    // Trigger __doPostBack via injected <script> tag — bypasses click/overlay issues
    await page.addScriptTag({
        content: `__doPostBack('${postbackTarget.replace(/'/g, "\\'")}', '');`,
    });

    await responsePromise;
    if (!capturedBody) return null;

    // Parse the textarea content from the AJAX response body.
    // ASP.NET UpdatePanel responses contain HTML with the textarea element.
    const taIdEscaped = textareaId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`id="${taIdEscaped}"[^>]*>([\\s\\S]*?)</textarea`, 'i');
    const match = capturedBody.match(re);
    if (!match) return null;

    const source = decodeHtmlEntities(match[1]);
    const result = { source };

    // Extract extra fields from the response body
    for (const [key, pattern] of Object.entries(opts.extraFields || {})) {
        if (typeof pattern === 'string' && pattern.startsWith('[')) {
            // CSS-like selector — find in response HTML
            const idMatch = pattern.match(/id\*="([^"]+)"/);
            if (idMatch) {
                const fieldRe = new RegExp(`${idMatch[1]}[^>]*>([^<]*)`, 'i');
                const fm = capturedBody.match(fieldRe);
                result[key] = fm ? fm[1].trim() : '';
            }
        }
    }

    return result;
}

/**
 * Decode HTML entities in extracted text.
 */
function decodeHtmlEntities(html) {
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
 * Hide a Telerik RadDock panel.
 */
async function hideDockPanel(page, dockSelector) {
    await page.evaluate((sel) => {
        const dock = document.querySelector(sel);
        if (dock) dock.style.display = 'none';
        const overlay = document.querySelector('.rdOverlay, [class*="overlay"], [class*="Overlay"]');
        if (overlay) overlay.style.display = 'none';
    }, dockSelector);
    await page.waitForTimeout(200);
}

/**
 * Get grid pagination info text (e.g., "272 items in 19 pages").
 */
async function getGridInfo(page) {
    return page.evaluate(() => {
        const info = document.querySelector('.rgInfoPart');
        return info ? info.textContent.trim() : '';
    });
}

/**
 * Read all data rows from the current RadGrid page.
 * Generic column extraction — handles text, checkboxes, links, and inputs.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array<{name: string, index: number, type?: string}>} columnDefs
 *   type: 'text' (default) | 'checkbox' | 'link' | 'input'
 * @returns {Array<object>} one object per row with column names as keys
 */
async function readGridRows(page, columnDefs) {
    return page.evaluate((cols) => {
        const rows = document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow');
        if (rows.length === 0) {
            // Fallback: try any data rows in the grid table
            const table = document.querySelector('#ctl00_ContentBody_DG1_ctl00');
            if (table) {
                const allRows = table.querySelectorAll('tbody tr');
                return extractFromRows(allRows, cols);
            }
            return [];
        }
        return extractFromRows(rows, cols);

        function extractFromRows(rowList, colDefs) {
            return Array.from(rowList)
                .map((row) => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    const obj = {};
                    for (const col of colDefs) {
                        const cell = cells[col.index];
                        if (!cell) {
                            obj[col.name] = null;
                            continue;
                        }
                        const type = col.type || 'text';
                        switch (type) {
                            case 'checkbox': {
                                const cb = cell.querySelector('input[type="checkbox"]');
                                obj[col.name] = cb ? cb.checked : null;
                                break;
                            }
                            case 'link': {
                                const a = cell.querySelector('a');
                                obj[col.name] = a ? a.textContent.trim() : cell.textContent.trim();
                                break;
                            }
                            case 'input': {
                                const inp = cell.querySelector('input, select');
                                obj[col.name] = inp ? inp.value : cell.textContent.trim();
                                break;
                            }
                            default:
                                obj[col.name] = cell.textContent.trim();
                        }
                    }
                    return obj;
                })
                .filter((row) => Object.values(row).some((v) => v !== null && v !== ''));
        }
    }, columnDefs);
}

module.exports = {
    findCustomer,
    listCustomers,
    getActiveCustomer,
    loadEnvConfig,
    login,
    adminUrl,
    triggerPostback,
    getGridDetailLinks,
    goToNextGridPage,
    extractDockPanelDetail,
    hideDockPanel,
    getGridInfo,
    readGridRows,
};
