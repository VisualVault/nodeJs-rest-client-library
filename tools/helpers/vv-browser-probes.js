/**
 * Browser-based probes for VV environment profiling.
 *
 * Requires Playwright — this module is only imported when --with-browser is used.
 * Captures front-end stack metadata from both the Admin app (ASP.NET WebForms)
 * and the FormViewer SPA (Angular + Kendo).
 *
 * Used by:
 *   - tools/explore/environment-profile.js (customer environment profiles)
 */
const vvAdmin = require('./vv-admin');

/**
 * Capture front-end stack metadata from the VV Admin app (FormDataAdmin page).
 *
 * Detects: jQuery, Kendo, Telerik, Angular versions; global objects; Telerik controls;
 * Kendo widgets; CSS frameworks; ASP.NET indicators (ViewState, EventValidation).
 *
 * @param {import('@playwright/test').Page} page - Authenticated page
 * @param {object} config - loadEnvConfig result
 * @returns {Promise<object>} adminApp profile section
 */
async function captureAdminApp(page, config) {
    const url = vvAdmin.adminUrl(config, 'FormDataAdmin');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const result = await page.evaluate(() => {
        const data = {
            jquery: null,
            kendo: null,
            telerik: null,
            angular: null,
            globalObjects: [],
            telerikControls: [],
            kendoWidgets: [],
            cssFrameworks: [],
            jsLibraries: [],
            viewState: false,
            eventValidation: false,
            scriptCount: 0,
            stylesheetCount: 0,
        };

        // Framework versions via window object
        try {
            data.jquery = window.jQuery?.fn?.jquery || null;
        } catch {
            /* */
        }
        try {
            data.kendo = window.kendo?.version || null;
        } catch {
            /* */
        }
        try {
            data.telerik = window.Telerik?.Web?.UI?.RadScriptManager?.Version || null;
        } catch {
            /* */
        }
        try {
            data.angular = window.angular?.version?.full || null;
        } catch {
            /* */
        }

        // Global objects
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
                if (window[name] !== undefined) data.globalObjects.push(name);
            } catch {
                /* */
            }
        }

        // Script analysis — detect JS libraries
        const scripts = [...document.querySelectorAll('script[src]')];
        data.scriptCount = scripts.length;
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

        // Stylesheet analysis — detect CSS frameworks
        const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')];
        data.stylesheetCount = stylesheets.length;
        for (const s of stylesheets) {
            const href = s.href.toLowerCase();
            if (href.includes('bootstrap')) data.cssFrameworks.push('Bootstrap');
            if (href.includes('kendo')) data.cssFrameworks.push('Kendo UI CSS');
            if (href.includes('telerik')) data.cssFrameworks.push('Telerik CSS');
            if (href.includes('font-awesome') || href.includes('fontawesome')) data.cssFrameworks.push('Font Awesome');
        }

        // ASP.NET indicators
        data.viewState = !!document.querySelector('input[name="__VIEWSTATE"]');
        data.eventValidation = !!document.querySelector('input[name="__EVENTVALIDATION"]');

        // Telerik controls (RadGrid, RadMenu, etc.)
        document.querySelectorAll('[class*="Rad"]').forEach((el) => {
            const match = el.className.match(/\bRad\w+/);
            if (match && !data.telerikControls.includes(match[0])) {
                data.telerikControls.push(match[0]);
            }
        });

        // Kendo widgets (k-grid, k-pager, etc.)
        document.querySelectorAll('[class*="k-"]').forEach((el) => {
            const match = el.className.match(/\bk-\w+/);
            if (match && !data.kendoWidgets.includes(match[0]) && !match[0].startsWith('k-in') && match[0].length > 3) {
                data.kendoWidgets.push(match[0]);
            }
        });

        // De-duplicate and sort
        data.jsLibraries = [...new Set(data.jsLibraries)].sort();
        data.cssFrameworks = [...new Set(data.cssFrameworks)].sort();
        data.telerikControls.sort();
        data.kendoWidgets.sort();

        return data;
    });

    return { captured: true, ...result };
}

/**
 * Capture front-end stack metadata from the VV FormViewer SPA.
 *
 * Detects: Angular version, Kendo version + variant (v1/v2), SignalR, Moment.js,
 * RequireJS presence, and VV.Form properties.
 *
 * @param {import('@playwright/test').Page} page - Authenticated page
 * @param {string} formViewerUrl - Full FormViewer URL (base + template path)
 * @returns {Promise<object>} formViewerApp profile section
 */
async function captureFormViewerApp(page, formViewerUrl) {
    await page.goto(formViewerUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for VV.Form to be available (FormViewer SPA bootstrap)
    try {
        await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form, { timeout: 30000 });
    } catch {
        // FormViewer may not have VV.Form on all pages — continue with partial capture
    }

    const result = await page.evaluate(() => {
        const data = {
            angular: null,
            kendo: null,
            kendoVariant: null,
            signalR: false,
            momentJs: false,
            requireJs: false,
            vvFormProperties: [],
        };

        // Framework versions
        try {
            data.angular = window.angular?.version?.full || null;
        } catch {
            /* */
        }
        try {
            data.kendo = window.kendo?.version || null;
        } catch {
            /* */
        }

        // Kendo variant detection via datepicker input role attribute
        // v1: input has role="spinbutton", v2: input has role="combobox"
        const picker = document.querySelector('kendo-datepicker, kendo-datetimepicker');
        if (picker) {
            const input = picker.querySelector('input');
            if (input) {
                const role = input.getAttribute('role');
                data.kendoVariant = role === 'spinbutton' ? 'v1' : role === 'combobox' ? 'v2' : null;
            }
        }
        // Fallback: if no picker found but kendo version is available, infer from version
        if (!data.kendoVariant && data.kendo) {
            // Kendo versions >= 2021 are considered v2 based on observed behavior
            const majorYear = parseInt(data.kendo.split('.')[0]);
            if (majorYear >= 2021) data.kendoVariant = 'v2';
            else if (majorYear > 0) data.kendoVariant = 'v1';
        }

        // Library presence via script src
        const scripts = [...document.querySelectorAll('script[src]')];
        for (const s of scripts) {
            const src = s.src.toLowerCase();
            if (src.includes('signalr')) data.signalR = true;
            if (src.includes('moment')) data.momentJs = true;
            if (src.includes('require')) data.requireJs = true;
        }

        // VV.Form property enumeration
        try {
            if (typeof VV !== 'undefined' && VV.Form) {
                const keys = Object.getOwnPropertyNames(VV.Form).filter((k) => typeof VV.Form[k] !== 'function');
                for (const key of keys) {
                    try {
                        const val = VV.Form[key];
                        if (val !== undefined && val !== null) {
                            data.vvFormProperties.push(`VV.Form.${key}`);
                        }
                    } catch {
                        /* skip */
                    }
                }
            }
        } catch {
            /* VV not available */
        }

        return data;
    });

    return { captured: true, ...result };
}

/**
 * Run all browser probes for a VV environment.
 *
 * Launches Playwright, logs in, captures both Admin app and FormViewer metadata,
 * then closes the browser.
 *
 * @param {object} config - loadEnvConfig result
 * @param {object} options
 * @param {string} [options.formViewerPath] - FormViewer template path (relative to baseUrl)
 * @param {boolean} [options.headed] - Show browser window
 * @returns {Promise<{ adminApp: object, formViewerApp: object }>}
 */
async function runBrowserProbes(config, options = {}) {
    const { chromium } = require('@playwright/test');

    const browser = await chromium.launch({ headless: !options.headed });
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];
    let adminApp = { captured: false };
    let formViewerApp = { captured: false };

    try {
        // Login
        await vvAdmin.login(page, config);

        // Capture Admin app
        try {
            adminApp = await captureAdminApp(page, config);
        } catch (e) {
            errors.push(`adminApp: ${e.message}`);
        }

        // Capture FormViewer app (if a URL is available)
        const fvPath = options.formViewerPath;
        if (fvPath) {
            try {
                const fvUrl = config.baseUrl + fvPath;
                formViewerApp = await captureFormViewerApp(page, fvUrl);
            } catch (e) {
                errors.push(`formViewerApp: ${e.message}`);
            }
        } else {
            errors.push('formViewerApp: no FormViewer URL configured for this customer');
        }
    } finally {
        await browser.close();
    }

    return { adminApp, formViewerApp, errors };
}

module.exports = {
    captureAdminApp,
    captureFormViewerApp,
    runBrowserProbes,
};
