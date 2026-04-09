/**
 * VV Platform Discovery
 *
 * Systematically explores the VV platform to discover available sections,
 * features, admin tools, API resources, and UI components.
 *
 * Probes:
 *   1. Main navigation — all menus, submenus, links
 *   2. Admin Tools — Users, Groups, Portals, Menus, Dropdowns, Site Admin
 *   3. URL section brute-force — try known VV URL patterns
 *   4. Control Panel / Enterprise Tools
 *   5. User menu and profile
 *   6. API resource discovery — enumerate available REST resources
 *   7. Main app JS state — config objects, feature flags, user context
 *   8. Reports section
 *   9. Process Design Studio access
 *  10. Page framework analysis — JS libraries, UI toolkit versions
 *
 * Run:
 *   npm run explore:headed
 *   npm run explore
 */
const { test } = require('@playwright/test');
const { loadConfig } = require('../../../testing/fixtures/env-config');
const {
    createResponseCollector,
    enumerateJSGlobals,
    scanDOM,
    probeEndpoints,
    formatReport,
} = require('../../helpers/vv-explore');

const config = loadConfig();
const BASE_URL = config.baseUrl;
const CUSTOMER = config.customerAlias;
const DATABASE = config.databaseAlias;
const API_BASE = `/api/v1/${CUSTOMER}/${DATABASE}`;

const adminUrl = (section) => `/app/${CUSTOMER}/${DATABASE}/${section}`;

let apiToken = null;

async function getApiToken(request) {
    if (apiToken) return apiToken;
    const resp = await request.post(`${BASE_URL}/OAuth/Token`, {
        form: {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            username: config.username,
            password: config.password,
            grant_type: 'password',
        },
    });
    if (!resp.ok()) throw new Error(`OAuth failed: ${resp.status()}`);
    const data = await resp.json();
    apiToken = data.access_token;
    return apiToken;
}

test.describe.configure({ mode: 'serial' });

test.describe('VV Platform Discovery', () => {
    test('Probe 1: Main navigation structure', async ({ page }, testInfo) => {
        await page.goto(adminUrl('FormDataAdmin'));
        await page.waitForLoadState('networkidle');

        // Enumerate all navigation elements — links, buttons, menu items
        const navData = await page.evaluate(() => {
            const results = {
                topNavLinks: [],
                sidebarLinks: [],
                dropdownMenus: [],
                allLinks: [],
                iframes: [],
            };

            // All anchor tags with href
            document.querySelectorAll('a[href]').forEach((a) => {
                const href = a.getAttribute('href');
                const text = a.textContent.trim().substring(0, 80);
                if (href && text && !href.startsWith('#') && !href.startsWith('javascript:void')) {
                    results.allLinks.push({
                        text,
                        href,
                        id: a.id || null,
                        className: (a.className || '').substring(0, 60),
                    });
                }
            });

            // Look for Telerik RadMenu (VV uses Telerik UI)
            document.querySelectorAll('.rmLink, .rmText, .RadMenu a, [class*="RadMenu"] a').forEach((a) => {
                const text = a.textContent.trim();
                const href = a.getAttribute('href') || a.parentElement?.getAttribute('href') || '';
                if (text) results.topNavLinks.push({ text, href, tag: a.tagName });
            });

            // Any dropdown/submenu containers
            document
                .querySelectorAll(
                    '.rmGroup, .rmSlide, [class*="submenu"], [class*="dropdown-menu"], .RadMenu_Default .rmVertical'
                )
                .forEach((container) => {
                    const items = [];
                    container.querySelectorAll('a, span.rmText').forEach((el) => {
                        const text = el.textContent.trim();
                        if (text) items.push(text);
                    });
                    if (items.length > 0) {
                        results.dropdownMenus.push({ containerClass: container.className.substring(0, 60), items });
                    }
                });

            // Sidebar navigation
            document
                .querySelectorAll('.sidebar a, .nav-sidebar a, #sidebar a, [class*="sidebar"] a, .treeview a')
                .forEach((a) => {
                    const text = a.textContent.trim();
                    const href = a.getAttribute('href') || '';
                    if (text) results.sidebarLinks.push({ text, href });
                });

            // Any iframes (separate apps embedded)
            document.querySelectorAll('iframe').forEach((iframe) => {
                results.iframes.push({ src: iframe.src, id: iframe.id || null, name: iframe.name || null });
            });

            return results;
        });

        const findings = [
            `Top nav links: ${navData.topNavLinks.length}`,
            ...navData.topNavLinks.map((l) => `  "${l.text}" → ${l.href}`),
            '',
            `All links on page: ${navData.allLinks.length}`,
            ...navData.allLinks.map((l) => `  "${l.text}" → ${l.href}${l.id ? ` [#${l.id}]` : ''}`),
            '',
            `Dropdown menus: ${navData.dropdownMenus.length}`,
            ...navData.dropdownMenus.map((d) => `  [${d.containerClass.substring(0, 30)}] ${d.items.join(' | ')}`),
            '',
            `Sidebar links: ${navData.sidebarLinks.length}`,
            ...navData.sidebarLinks.map((l) => `  "${l.text}" → ${l.href}`),
            '',
            `Iframes: ${navData.iframes.length}`,
            ...navData.iframes.map((f) => `  src="${f.src}" id="${f.id}"`),
        ];

        console.log(formatReport('PROBE 1: Main Navigation', [{ name: 'Navigation Structure', findings }]));
        await testInfo.attach('probe-1-navigation', {
            body: JSON.stringify(navData, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 2: Hover menus — expand all top-level nav items', async ({ page }, testInfo) => {
        await page.goto(adminUrl('FormDataAdmin'));
        await page.waitForLoadState('networkidle');

        // Find all top-level menu items and hover to expand submenus
        const menuItems = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.rmRootGroup > li > a, .rmRootGroup > li > span').forEach((el) => {
                const text = el.textContent.trim();
                const rect = el.getBoundingClientRect();
                if (text && rect.width > 0) {
                    items.push({ text, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }
            });
            return items;
        });

        const expandedMenus = {};

        for (const item of menuItems) {
            // Hover over each top-level menu item
            await page.mouse.move(item.x, item.y);
            await page.waitForTimeout(500); // wait for submenu animation

            // Capture any visible submenus
            const submenu = await page.evaluate((parentText) => {
                const items = [];
                // After hover, Telerik reveals rmSlide panels
                document
                    .querySelectorAll(
                        '.rmSlide:not([style*="display: none"]) a, .rmSlide:not([style*="display: none"]) .rmText'
                    )
                    .forEach((el) => {
                        const text = el.textContent.trim();
                        const href = el.getAttribute?.('href') || el.closest('a')?.getAttribute('href') || '';
                        if (text && !items.some((i) => i.text === text)) {
                            items.push({ text, href });
                        }
                    });

                // Also check rmVertical visible menus
                document.querySelectorAll('.rmVertical:not([style*="display: none"]) a').forEach((el) => {
                    const text = el.textContent.trim();
                    const href = el.getAttribute('href') || '';
                    if (text && !items.some((i) => i.text === text)) {
                        items.push({ text, href });
                    }
                });

                return items;
            }, item.text);

            if (submenu.length > 0) {
                expandedMenus[item.text] = submenu;
            }
        }

        // Move mouse away to close menus
        await page.mouse.move(0, 0);

        const findings = [`Top-level menu items: ${menuItems.length}`, ...menuItems.map((m) => `  ${m.text}`), ''];

        for (const [parent, children] of Object.entries(expandedMenus)) {
            findings.push(`[${parent}] submenu (${children.length} items):`);
            children.forEach((c) => findings.push(`  "${c.text}" → ${c.href}`));
            findings.push('');
        }

        console.log(formatReport('PROBE 2: Expanded Menus', [{ name: 'Menu Hierarchy', findings }]));
        await testInfo.attach('probe-2-menus', {
            body: JSON.stringify({ topLevel: menuItems.map((m) => m.text), submenus: expandedMenus }, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 3: Admin Tools pages', async ({ page }, testInfo) => {
        // Known and suspected admin section URLs
        const adminSections = [
            { name: 'Users', path: 'UserAdmin' },
            { name: 'Groups', path: 'GroupAdmin' },
            { name: 'Portals', path: 'PortalAdmin' },
            { name: 'Menus', path: 'MenuAdmin' },
            { name: 'Dropdown Lists', path: 'DropdownAdmin' },
            { name: 'Site Admin', path: 'SiteAdmin' },
            { name: 'Site Admin Locations', path: 'LocationAdmin' },
            { name: 'Customer Admin', path: 'CustomerAdmin' },
            { name: 'Supplier Admin', path: 'SupplierAdmin' },
            { name: 'Email Templates', path: 'EmailTemplateAdmin' },
            { name: 'Notifications', path: 'NotificationAdmin' },
            { name: 'Security Roles', path: 'SecurityRoleAdmin' },
            { name: 'Audit Log', path: 'AuditLog' },
            { name: 'Folders', path: 'FolderAdmin' },
            { name: 'Indexing', path: 'IndexAdmin' },
            { name: 'Tags', path: 'TagAdmin' },
            { name: 'Scripts', path: 'ScriptAdmin' },
            { name: 'Global Scripts', path: 'GlobalScriptAdmin' },
            { name: 'Workflow Admin', path: 'WorkflowAdmin' },
            { name: 'Form Rules', path: 'FormRuleAdmin' },
            { name: 'API Applications', path: 'ApiApplicationAdmin' },
            { name: 'OAuth Applications', path: 'OAuthAdmin' },
            { name: 'License', path: 'LicenseAdmin' },
            { name: 'System Settings', path: 'SystemSettings' },
            { name: 'Reports', path: 'ReportAdmin' },
            { name: 'Custom Reports', path: 'CustomReportAdmin' },
            { name: 'Import', path: 'ImportAdmin' },
            { name: 'Export', path: 'ExportAdmin' },
            { name: 'Branding', path: 'BrandingAdmin' },
            { name: 'Theme', path: 'ThemeAdmin' },
            { name: 'Control Panel', path: 'ControlPanel' },
        ];

        const results = [];

        for (const section of adminSections) {
            try {
                const response = await page.goto(adminUrl(section.path), {
                    timeout: 15000,
                    waitUntil: 'domcontentloaded',
                });
                const status = response?.status() || 'unknown';
                const finalUrl = page.url();
                const title = await page.title();

                // Check if we were redirected (access denied or not found often redirect to login or home)
                const redirected = !finalUrl.toLowerCase().includes(section.path.toLowerCase());
                const isLogin = finalUrl.includes('/Login') || finalUrl.includes('/Account');

                // Get page heading or first h1/h2
                const heading = await page
                    .evaluate(() => {
                        const h = document.querySelector('h1, h2, .page-title, .content-title, #ctl00_ContentHead');
                        return h ? h.textContent.trim().substring(0, 80) : null;
                    })
                    .catch(() => null);

                results.push({
                    name: section.name,
                    path: section.path,
                    status,
                    title,
                    heading,
                    redirected,
                    isLogin,
                    accessible: status === 200 && !redirected && !isLogin,
                    finalUrl: finalUrl.replace(BASE_URL, ''),
                });
            } catch (e) {
                results.push({
                    name: section.name,
                    path: section.path,
                    status: 'error',
                    error: e.message.substring(0, 100),
                    accessible: false,
                });
            }
        }

        const accessible = results.filter((r) => r.accessible);
        const blocked = results.filter((r) => !r.accessible);

        const findings = [
            `Accessible sections: ${accessible.length}`,
            ...accessible.map(
                (r) => `  ✓ ${r.name.padEnd(25)} /${r.path.padEnd(25)} title="${r.title}" heading="${r.heading || ''}"`
            ),
            '',
            `Blocked/redirected: ${blocked.length}`,
            ...blocked.map(
                (r) =>
                    `  ✗ ${r.name.padEnd(25)} /${r.path.padEnd(25)} ${r.status}${r.redirected ? ' (redirected → ' + r.finalUrl + ')' : ''}${r.isLogin ? ' (login required)' : ''}`
            ),
        ];

        console.log(formatReport('PROBE 3: Admin Sections', [{ name: 'Section Discovery', findings }]));
        await testInfo.attach('probe-3-admin-sections', {
            body: JSON.stringify(results, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 4: User menu and profile', async ({ page }, testInfo) => {
        await page.goto(adminUrl('FormDataAdmin'));
        await page.waitForLoadState('networkidle');

        // Find user menu / avatar / profile elements
        const userMenu = await page.evaluate(() => {
            const results = {
                userElements: [],
                settingsLinks: [],
                profileLinks: [],
                logoutLinks: [],
                allButtonsAndLinks: [],
            };

            // Look for user-related elements (name display, avatar, etc.)
            const userSelectors = [
                '[class*="user"]',
                '[id*="user"]',
                '[class*="User"]',
                '[id*="User"]',
                '[class*="profile"]',
                '[id*="profile"]',
                '[class*="account"]',
                '[class*="avatar"]',
                '[class*="logout"]',
                '[class*="signout"]',
                '[class*="preferences"]',
                '[class*="settings"]',
            ];

            for (const sel of userSelectors) {
                document.querySelectorAll(sel).forEach((el) => {
                    const text = el.textContent.trim().substring(0, 100);
                    if (text) {
                        results.userElements.push({
                            selector: sel,
                            tag: el.tagName,
                            id: el.id || null,
                            className: (el.className || '').substring(0, 80),
                            text: text.substring(0, 80),
                            href: el.getAttribute?.('href') || null,
                        });
                    }
                });
            }

            // Look for buttons/icons in the header/toolbar area
            const headerEl = document.querySelector('header, .header, #header, [class*="toolbar"], [class*="top-bar"]');
            if (headerEl) {
                headerEl.querySelectorAll('a, button, [role="button"]').forEach((el) => {
                    const text = el.textContent.trim();
                    const title = el.getAttribute('title') || '';
                    if (text || title) {
                        results.allButtonsAndLinks.push({
                            tag: el.tagName,
                            text: (text || title).substring(0, 50),
                            href: el.getAttribute('href') || null,
                            id: el.id || null,
                            className: (el.className || '').substring(0, 60),
                            title,
                        });
                    }
                });
            }

            return results;
        });

        const findings = [
            `User-related elements: ${userMenu.userElements.length}`,
            ...userMenu.userElements.map(
                (e) => `  <${e.tag}> ${e.selector} id="${e.id}" text="${e.text}" href="${e.href}"`
            ),
            '',
            `Header buttons/links: ${userMenu.allButtonsAndLinks.length}`,
            ...userMenu.allButtonsAndLinks.map(
                (e) => `  <${e.tag}> "${e.text}" href="${e.href}" title="${e.title}" class="${e.className}"`
            ),
        ];

        console.log(formatReport('PROBE 4: User Menu & Profile', [{ name: 'User Elements', findings }]));
        await testInfo.attach('probe-4-user-menu', {
            body: JSON.stringify(userMenu, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 5: API resource discovery', async ({ request }, testInfo) => {
        const token = await getApiToken(request);

        // Probe all likely REST resource endpoints
        const resources = [
            'users',
            'groups',
            'sites',
            'formtemplates',
            'forms',
            'documents',
            'documenttemplates',
            'folders',
            'outsideprocesses',
            'scheduledProcess',
            'customquery',
            'email',
            'scripts',
            'reports',
            'projects',
            'configuration',
            'version',
            'meta',
            'schema',
            'indexfields',
            'securitymembers',
            'notifications',
            'workflow',
            'workflowinstances',
            'processes',
            'files',
            'library',
            'customers',
            'databases',
            'roles',
            'permissions',
            'apiapplications',
            'dropdownlists',
            'menus',
            'portals',
            'tags',
            'audit',
            'auditlog',
            'sessions',
            'tokens',
            'search',
            'fulltext',
            'calendar',
            'events',
            'dashboards',
            'widgets',
            'exports',
            'imports',
            'templates',
            'revisions',
            'histories',
        ];

        const results = [];
        for (const resource of resources) {
            try {
                const resp = await request.get(`${BASE_URL}${API_BASE}/${resource}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 10000,
                    failOnStatusCode: false,
                });

                const status = resp.status();
                let bodyPreview = '';
                let dataCount = null;

                if (status === 200) {
                    try {
                        const text = await resp.text();
                        bodyPreview = text.substring(0, 300);

                        // Try to extract data count
                        if (text.startsWith('{')) {
                            const json = JSON.parse(text);
                            if (Array.isArray(json.data)) {
                                dataCount = json.data.length;
                            } else if (json.data && typeof json.data === 'object') {
                                dataCount = 'object';
                            }
                        }
                    } catch {
                        /* not json */
                    }
                }

                results.push({ resource, status, dataCount, bodyPreview });
            } catch (e) {
                results.push({ resource, status: 'error', error: e.message.substring(0, 80) });
            }
        }

        const found = results.filter((r) => r.status === 200);
        const notFound = results.filter((r) => r.status === 404);
        const forbidden = results.filter((r) => r.status === 403 || r.status === 401);
        const other = results.filter((r) => ![200, 404, 403, 401].includes(r.status) && r.status !== 'error');

        const findings = [
            `Accessible resources (200): ${found.length}`,
            ...found.map((r) => `  ✓ /${r.resource}${r.dataCount !== null ? ` (${r.dataCount} items)` : ''}`),
            '',
            `Forbidden (401/403): ${forbidden.length}`,
            ...forbidden.map((r) => `  ✗ /${r.resource} [${r.status}]`),
            '',
            `Not found (404): ${notFound.length}`,
            ...notFound.map((r) => `  - /${r.resource}`),
            '',
            `Other status: ${other.length}`,
            ...other.map((r) => `  ? /${r.resource} [${r.status}]`),
        ];

        console.log(formatReport('PROBE 5: API Resources', [{ name: 'REST Endpoint Discovery', findings }]));
        await testInfo.attach('probe-5-api-resources', {
            body: JSON.stringify(results, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 6: Main app JavaScript state', async ({ page }, testInfo) => {
        await page.goto(adminUrl('FormDataAdmin'));
        await page.waitForLoadState('networkidle');

        // Explore the main app's JS context (different from FormViewer's VV.Form)
        const appState = await page.evaluate(() => {
            const results = {
                globalObjects: [],
                telerikVersion: null,
                jqueryVersion: null,
                kendoVersion: null,
                angularVersion: null,
                windowProperties: [],
                vvProperties: [],
            };

            // Check for common frameworks
            try {
                results.jqueryVersion = window.jQuery?.fn?.jquery || null;
            } catch {
                /* */
            }
            try {
                results.telerikVersion = window.Telerik?.Web?.UI?.RadScriptManager?.Version || null;
            } catch {
                /* */
            }
            try {
                results.kendoVersion = window.kendo?.version || null;
            } catch {
                /* */
            }
            try {
                results.angularVersion = window.angular?.version?.full || null;
            } catch {
                /* */
            }

            // Check for VV global on the main app (not FormViewer)
            if (typeof VV !== 'undefined') {
                const keys = Object.getOwnPropertyNames(VV).filter((k) => typeof VV[k] !== 'function');
                for (const key of keys) {
                    try {
                        const val = VV[key];
                        const type = typeof val;
                        if (type === 'string' || type === 'number' || type === 'boolean') {
                            results.vvProperties.push({ key, value: String(val).substring(0, 200), type });
                        } else if (type === 'object' && val !== null) {
                            results.vvProperties.push({
                                key,
                                value: `[object with ${Object.keys(val).length} keys]`,
                                type: 'object',
                                keys: Object.keys(val).slice(0, 20),
                            });
                        }
                    } catch {
                        /* skip */
                    }
                }
            }

            // Interesting global objects
            const globalChecks = [
                'Sys',
                'Telerik',
                'kendo',
                '$telerik$',
                'VV',
                'RadGrid',
                'RadMenu',
                'RequireJS',
                'require',
                '__VIEWSTATE',
                '__doPostBack',
                'pageLoad',
            ];
            for (const name of globalChecks) {
                try {
                    const val = window[name];
                    if (val !== undefined) {
                        results.globalObjects.push({
                            name,
                            type: typeof val,
                            isFunction: typeof val === 'function',
                            keys: typeof val === 'object' && val !== null ? Object.keys(val).slice(0, 15) : [],
                        });
                    }
                } catch {
                    /* skip */
                }
            }

            // Window properties that look interesting (filter out standard browser props)
            const standardProps = new Set([
                'location',
                'document',
                'navigator',
                'window',
                'self',
                'top',
                'parent',
                'frames',
                'length',
                'closed',
                'opener',
                'screen',
                'history',
                'crypto',
                'performance',
                'caches',
                'indexedDB',
                'localStorage',
                'sessionStorage',
                'console',
                'customElements',
                'visualViewport',
                'speechSynthesis',
                'isSecureContext',
                'crossOriginIsolated',
                'scheduler',
                'alert',
                'confirm',
                'prompt',
                'print',
                'name',
                'status',
                'origin',
                'chrome',
            ]);
            for (const key of Object.getOwnPropertyNames(window)) {
                if (standardProps.has(key)) continue;
                if (key.startsWith('__') || key.startsWith('webkit') || key.startsWith('on')) continue;
                try {
                    const val = window[key];
                    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                        const keyCount = Object.keys(val).length;
                        if (keyCount > 0 && keyCount < 50) {
                            results.windowProperties.push({
                                key,
                                type: 'object',
                                keyCount,
                                sampleKeys: Object.keys(val).slice(0, 10),
                            });
                        }
                    } else if (typeof val === 'string' && val.length > 0 && val.length < 500) {
                        results.windowProperties.push({ key, type: 'string', value: val.substring(0, 100) });
                    }
                } catch {
                    /* skip */
                }
            }

            return results;
        });

        const findings = [
            'Framework versions:',
            `  jQuery: ${appState.jqueryVersion || '(not found)'}`,
            `  Kendo UI: ${appState.kendoVersion || '(not found)'}`,
            `  Telerik: ${appState.telerikVersion || '(not found)'}`,
            `  Angular: ${appState.angularVersion || '(not found)'}`,
            '',
            `Global objects found: ${appState.globalObjects.length}`,
            ...appState.globalObjects.map(
                (o) => `  ${o.name} [${o.type}]${o.keys.length > 0 ? ' keys: ' + o.keys.join(', ') : ''}`
            ),
            '',
            `VV properties: ${appState.vvProperties.length}`,
            ...appState.vvProperties.map(
                (p) => `  VV.${p.key} = ${p.value}${p.keys ? ' (' + p.keys.join(', ') + ')' : ''}`
            ),
            '',
            `Interesting window properties: ${appState.windowProperties.length}`,
            ...appState.windowProperties
                .slice(0, 20)
                .map((p) =>
                    p.type === 'string'
                        ? `  window.${p.key} = "${p.value}"`
                        : `  window.${p.key} [${p.type}] (${p.keyCount} keys: ${p.sampleKeys.join(', ')})`
                ),
        ];

        console.log(formatReport('PROBE 6: Main App JS State', [{ name: 'Application Context', findings }]));
        await testInfo.attach('probe-6-app-state', {
            body: JSON.stringify(appState, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 7: Page-specific deep scan on key sections', async ({ page }, testInfo) => {
        // Visit several key pages and capture their unique elements, grids, forms, controls
        const pagesToScan = [
            { name: 'FormDataAdmin', path: adminUrl('FormDataAdmin') },
            { name: 'FormTemplateAdmin', path: adminUrl('FormTemplateAdmin') },
            { name: 'formdata (Dashboards)', path: adminUrl('formdata') },
            { name: 'DocumentLibrary', path: adminUrl('DocumentLibrary') },
            { name: 'outsideprocessadmin', path: adminUrl('outsideprocessadmin') },
        ];

        const allResults = {};

        for (const pg of pagesToScan) {
            try {
                await page.goto(pg.path, { timeout: 20000 });
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

                const pageData = await page.evaluate(() => {
                    const data = {
                        title: document.title,
                        grids: [],
                        forms: [],
                        buttons: [],
                        tabs: [],
                        panels: [],
                        modals: [],
                        breadcrumb: null,
                    };

                    // Grids (Telerik RadGrid, Kendo Grid, standard tables)
                    document
                        .querySelectorAll('.RadGrid, .k-grid, table.rgMasterTable, [class*="GridView"]')
                        .forEach((grid) => {
                            const headers = [...grid.querySelectorAll('th, .rgHeader')]
                                .map((h) => h.textContent.trim())
                                .filter(Boolean);
                            const rowCount = grid.querySelectorAll('tr.rgRow, tr.rgAltRow, tbody tr').length;
                            data.grids.push({
                                headers: headers.slice(0, 20),
                                rowCount,
                                className: (grid.className || '').substring(0, 60),
                            });
                        });

                    // Forms
                    document.querySelectorAll('form').forEach((form) => {
                        const inputs = [...form.querySelectorAll('input, select, textarea')].map((i) => ({
                            type: i.type || i.tagName.toLowerCase(),
                            name: i.name || i.id || '',
                            placeholder: i.placeholder || '',
                        }));
                        if (inputs.length > 0) {
                            data.forms.push({ action: form.action, method: form.method, inputs: inputs.slice(0, 20) });
                        }
                    });

                    // Action buttons (Create, Add, Import, Export, etc.)
                    document
                        .querySelectorAll(
                            'input[type="button"], input[type="submit"], button, a.rbButton, .RadButton, [class*="btn-"]'
                        )
                        .forEach((btn) => {
                            const text = btn.value || btn.textContent.trim();
                            if (text && text.length < 50) {
                                data.buttons.push({
                                    text,
                                    tag: btn.tagName,
                                    id: btn.id || null,
                                    className: (btn.className || '').substring(0, 40),
                                });
                            }
                        });

                    // Tabs
                    document
                        .querySelectorAll('.rtsTab, .k-tab, [role="tab"], .tab-pane, .RadTabStrip a')
                        .forEach((tab) => {
                            const text = tab.textContent.trim();
                            if (text) data.tabs.push(text);
                        });

                    // Breadcrumb
                    const bc = document.querySelector('.breadcrumb, [class*="breadcrumb"], .path-bar');
                    if (bc) data.breadcrumb = bc.textContent.trim().substring(0, 200);

                    return data;
                });

                allResults[pg.name] = pageData;
            } catch (e) {
                allResults[pg.name] = { error: e.message.substring(0, 100) };
            }
        }

        const findings = [];
        for (const [name, data] of Object.entries(allResults)) {
            findings.push(`[${name}]`);
            if (data.error) {
                findings.push(`  Error: ${data.error}`);
            } else {
                findings.push(`  Title: ${data.title}`);
                if (data.breadcrumb) findings.push(`  Breadcrumb: ${data.breadcrumb}`);
                if (data.grids.length > 0) {
                    data.grids.forEach((g, i) => {
                        findings.push(`  Grid ${i + 1}: ${g.rowCount} rows, columns: ${g.headers.join(' | ')}`);
                    });
                }
                if (data.buttons.length > 0) {
                    findings.push(`  Buttons: ${data.buttons.map((b) => b.text).join(' | ')}`);
                }
                if (data.tabs.length > 0) {
                    findings.push(`  Tabs: ${data.tabs.join(' | ')}`);
                }
            }
            findings.push('');
        }

        console.log(formatReport('PROBE 7: Page Deep Scan', [{ name: 'Section Details', findings }]));
        await testInfo.attach('probe-7-page-scan', {
            body: JSON.stringify(allResults, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 8: Network traffic — API calls from main app', async ({ page }, testInfo) => {
        const collector = createResponseCollector(page, { maxBodySize: 2000 });
        collector.start();

        // Navigate to the dashboard list (triggers several API calls)
        await page.goto(adminUrl('formdata'));
        await page.waitForLoadState('networkidle');

        // Also visit Document Library to capture its API pattern
        await page.goto(adminUrl('DocumentLibrary'));
        await page.waitForLoadState('networkidle');

        collector.stop();
        const responses = collector.getResults();

        // Categorize responses
        const apiCalls = responses.filter(
            (r) => r.url.includes('/api/') || r.url.includes('/UIServices/') || r.url.includes('.asmx')
        );
        const staticAssets = responses.filter((r) => /\.(js|css|png|jpg|gif|woff|svg)(\?|$)/.test(r.url));
        const pageLoads = responses.filter((r) => !apiCalls.includes(r) && !staticAssets.includes(r));

        const findings = [
            `Total responses: ${responses.length}`,
            `API/service calls: ${apiCalls.length}`,
            `Static assets: ${staticAssets.length}`,
            `Page loads: ${pageLoads.length}`,
            '',
            'API/Service calls:',
            ...apiCalls.map((r) => {
                const shortUrl = r.url.replace(BASE_URL, '');
                return `  [${r.status}] ${shortUrl.substring(0, 100)}${r.contentType.includes('json') ? ' (JSON)' : ''}`;
            }),
            '',
            'Page loads:',
            ...pageLoads.map((r) => `  [${r.status}] ${r.url.replace(BASE_URL, '').substring(0, 100)}`),
        ];

        console.log(formatReport('PROBE 8: Network Traffic', [{ name: 'API Call Analysis', findings }]));
        await testInfo.attach('probe-8-network', {
            body: JSON.stringify(
                {
                    apiCalls: apiCalls.map((r) => ({ url: r.url, status: r.status, contentType: r.contentType })),
                    totalResponses: responses.length,
                },
                null,
                2
            ),
            contentType: 'application/json',
        });
    });

    test('Probe 9: Deeper API exploration — sub-resources and params', async ({ request }, testInfo) => {
        const token = await getApiToken(request);
        const headers = { Authorization: `Bearer ${token}` };

        const results = {};

        // Get user info
        try {
            const resp = await request.get(`${BASE_URL}${API_BASE}/users/me`, { headers, failOnStatusCode: false });
            if (resp.ok()) results.currentUser = await resp.json();
        } catch {
            /* skip */
        }

        // Get sites
        try {
            const resp = await request.get(`${BASE_URL}${API_BASE}/sites`, { headers, failOnStatusCode: false });
            if (resp.ok()) {
                const data = await resp.json();
                results.sites = {
                    count: Array.isArray(data.data) ? data.data.length : 'n/a',
                    sample: data.data?.slice(0, 3),
                };
            }
        } catch {
            /* skip */
        }

        // Form templates — get count and first few names
        try {
            const resp = await request.get(`${BASE_URL}${API_BASE}/formtemplates?fields=id,name,description,status`, {
                headers,
                failOnStatusCode: false,
            });
            if (resp.ok()) {
                const data = await resp.json();
                const templates = data.data || [];
                results.formTemplates = {
                    count: templates.length,
                    sample: templates.slice(0, 5).map((t) => ({ name: t.name, status: t.status })),
                };
            }
        } catch {
            /* skip */
        }

        // Custom queries
        try {
            const resp = await request.get(`${BASE_URL}${API_BASE}/customquery`, { headers, failOnStatusCode: false });
            if (resp.ok()) {
                const data = await resp.json();
                results.customQueries = { count: Array.isArray(data.data) ? data.data.length : 'n/a' };
            }
        } catch {
            /* skip */
        }

        // Groups
        try {
            const resp = await request.get(`${BASE_URL}${API_BASE}/groups`, { headers, failOnStatusCode: false });
            if (resp.ok()) {
                const data = await resp.json();
                const groups = data.data || [];
                results.groups = { count: groups.length, sample: groups.slice(0, 5).map((g) => g.name || g.id) };
            }
        } catch {
            /* skip */
        }

        // Scheduled processes
        try {
            const resp = await request.get(`${BASE_URL}${API_BASE}/scheduledProcess`, {
                headers,
                failOnStatusCode: false,
            });
            if (resp.ok()) {
                const data = await resp.json();
                results.scheduledProcesses = { count: Array.isArray(data.data) ? data.data.length : 'n/a' };
            }
        } catch {
            /* skip */
        }

        // Outside processes (microservices)
        try {
            const resp = await request.get(`${BASE_URL}${API_BASE}/outsideprocesses`, {
                headers,
                failOnStatusCode: false,
            });
            if (resp.ok()) {
                const data = await resp.json();
                results.outsideProcesses = { count: Array.isArray(data.data) ? data.data.length : 'n/a' };
            }
        } catch {
            /* skip */
        }

        // Projects
        try {
            const resp = await request.get(`${BASE_URL}${API_BASE}/projects`, { headers, failOnStatusCode: false });
            if (resp.ok()) {
                const data = await resp.json();
                const projects = data.data || [];
                results.projects = { count: projects.length, sample: projects.slice(0, 5).map((p) => p.name || p.id) };
            }
        } catch {
            /* skip */
        }

        const findings = [];
        for (const [key, value] of Object.entries(results)) {
            findings.push(`[${key}]`);
            if (typeof value === 'object') {
                for (const [k, v] of Object.entries(value)) {
                    if (k === 'sample' && Array.isArray(v)) {
                        findings.push(`  ${k}: ${JSON.stringify(v).substring(0, 200)}`);
                    } else if (typeof v === 'object') {
                        findings.push(`  ${k}: ${JSON.stringify(v).substring(0, 200)}`);
                    } else {
                        findings.push(`  ${k}: ${v}`);
                    }
                }
            }
            findings.push('');
        }

        console.log(formatReport('PROBE 9: API Deep Dive', [{ name: 'Resource Details', findings }]));
        await testInfo.attach('probe-9-api-deep', {
            body: JSON.stringify(results, null, 2),
            contentType: 'application/json',
        });
    });

    test('Probe 10: Full DOM and CSS framework analysis', async ({ page }, testInfo) => {
        await page.goto(adminUrl('FormDataAdmin'));
        await page.waitForLoadState('networkidle');

        const analysis = await page.evaluate(() => {
            const data = {
                cssFrameworks: [],
                jsLibraries: [],
                totalScripts: 0,
                totalStylesheets: 0,
                formElements: { inputs: 0, selects: 0, textareas: 0, buttons: 0 },
                telerikControls: [],
                kendoWidgets: [],
                hiddenElements: [],
                dataAttributes: {},
                viewstate: false,
                eventValidation: false,
            };

            // Script analysis
            const scripts = [...document.querySelectorAll('script[src]')];
            data.totalScripts = scripts.length;
            for (const s of scripts) {
                const src = s.src.toLowerCase();
                if (src.includes('jquery') && !src.includes('ui'))
                    data.jsLibraries.push('jQuery: ' + s.src.split('/').pop());
                if (src.includes('jquery-ui') || src.includes('jqueryui'))
                    data.jsLibraries.push('jQuery UI: ' + s.src.split('/').pop());
                if (src.includes('kendo')) data.jsLibraries.push('Kendo UI');
                if (src.includes('angular')) data.jsLibraries.push('Angular');
                if (src.includes('react')) data.jsLibraries.push('React');
                if (src.includes('vue')) data.jsLibraries.push('Vue');
                if (src.includes('bootstrap')) data.jsLibraries.push('Bootstrap JS');
                if (src.includes('telerik')) data.jsLibraries.push('Telerik: ' + s.src.split('/').pop());
                if (src.includes('require')) data.jsLibraries.push('RequireJS');
                if (src.includes('moment')) data.jsLibraries.push('Moment.js');
                if (src.includes('signalr')) data.jsLibraries.push('SignalR');
            }

            // Stylesheet analysis
            const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')];
            data.totalStylesheets = stylesheets.length;
            for (const s of stylesheets) {
                const href = s.href.toLowerCase();
                if (href.includes('bootstrap')) data.cssFrameworks.push('Bootstrap');
                if (href.includes('kendo')) data.cssFrameworks.push('Kendo UI CSS');
                if (href.includes('telerik')) data.cssFrameworks.push('Telerik CSS');
                if (href.includes('font-awesome') || href.includes('fontawesome'))
                    data.cssFrameworks.push('Font Awesome');
            }

            // ASP.NET ViewState
            data.viewstate = !!document.querySelector('input[name="__VIEWSTATE"]');
            data.eventValidation = !!document.querySelector('input[name="__EVENTVALIDATION"]');

            // Form element counts
            data.formElements.inputs = document.querySelectorAll('input').length;
            data.formElements.selects = document.querySelectorAll('select').length;
            data.formElements.textareas = document.querySelectorAll('textarea').length;
            data.formElements.buttons = document.querySelectorAll(
                'button, input[type="button"], input[type="submit"]'
            ).length;

            // Telerik controls
            document.querySelectorAll('[class*="Rad"]').forEach((el) => {
                const match = el.className.match(/\bRad\w+/);
                if (match && !data.telerikControls.includes(match[0])) {
                    data.telerikControls.push(match[0]);
                }
            });

            // Kendo widgets
            document.querySelectorAll('[class*="k-"]').forEach((el) => {
                const match = el.className.match(/\bk-\w+/);
                if (
                    match &&
                    !data.kendoWidgets.includes(match[0]) &&
                    !match[0].startsWith('k-in') &&
                    match[0].length > 3
                ) {
                    data.kendoWidgets.push(match[0]);
                }
            });

            // Hidden inputs with interesting names
            document.querySelectorAll('input[type="hidden"]').forEach((input) => {
                const name = input.name || input.id;
                if (name && !name.startsWith('__') && name.length < 80) {
                    data.hiddenElements.push({ name, value: (input.value || '').substring(0, 100) });
                }
            });

            return data;
        });

        const findings = [
            'UI Framework Stack:',
            `  JS libraries: ${analysis.jsLibraries.join(', ') || '(none detected)'}`,
            `  CSS frameworks: ${analysis.cssFrameworks.join(', ') || '(none detected)'}`,
            `  Total scripts: ${analysis.totalScripts}`,
            `  Total stylesheets: ${analysis.totalStylesheets}`,
            '',
            'ASP.NET:',
            `  ViewState: ${analysis.viewstate ? 'YES' : 'no'}`,
            `  EventValidation: ${analysis.eventValidation ? 'YES' : 'no'}`,
            '',
            `Telerik controls: ${analysis.telerikControls.length}`,
            `  ${analysis.telerikControls.sort().join(', ')}`,
            '',
            `Kendo widgets: ${analysis.kendoWidgets.length}`,
            `  ${analysis.kendoWidgets.sort().join(', ')}`,
            '',
            `Form elements: ${JSON.stringify(analysis.formElements)}`,
            '',
            `Hidden inputs: ${analysis.hiddenElements.length}`,
            ...analysis.hiddenElements.slice(0, 15).map((h) => `  ${h.name} = ${h.value}`),
        ];

        console.log(formatReport('PROBE 10: Framework Analysis', [{ name: 'UI Stack', findings }]));
        await testInfo.attach('probe-10-framework', {
            body: JSON.stringify(analysis, null, 2),
            contentType: 'application/json',
        });
    });
});
