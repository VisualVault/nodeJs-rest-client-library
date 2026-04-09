/**
 * Reusable exploration utilities for VV platform investigation.
 *
 * Five composable helpers for Playwright-based exploration specs:
 *   - createResponseCollector: intercept and analyze HTTP response headers/bodies
 *   - enumerateJSGlobals: recursively walk browser JS objects for version/config data
 *   - scanDOM: extract meta tags, asset URLs, and text pattern matches from pages
 *   - probeEndpoints: hit speculative API endpoints and capture responses
 *   - formatReport: format findings as structured console output
 *
 * Usage from exploration specs:
 *   const { createResponseCollector, scanDOM } = require('../../helpers/vv-explore');
 */

// Domains/patterns to exclude from response collection (CDN, analytics, noise)
const NOISE_PATTERNS = [
    /fonts\.(googleapis|gstatic)\.com/,
    /google-analytics\.com/,
    /googletagmanager\.com/,
    /cdn\.jsdelivr\.net/,
    /\.woff2?(\?|$)/,
    /\.ttf(\?|$)/,
    /\.(png|jpg|jpeg|gif|ico|svg|webp)(\?|$)/,
    /favicon/,
];

/**
 * Create an HTTP response collector that intercepts all responses during page navigation.
 *
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {Object} [options]
 * @param {number} [options.maxBodySize=51200] - Max body size to capture for JSON responses (bytes)
 * @param {RegExp[]} [options.excludePatterns] - Additional URL patterns to exclude
 * @returns {{ start: Function, stop: Function, getResults: Function, findHeaders: Function }}
 */
function createResponseCollector(page, options = {}) {
    const { maxBodySize = 51200, excludePatterns = [] } = options;
    const allPatterns = [...NOISE_PATTERNS, ...excludePatterns];
    const responses = [];
    let listening = false;

    const handler = async (response) => {
        const url = response.url();

        // Skip noise
        if (allPatterns.some((p) => p.test(url))) return;

        const entry = {
            url,
            status: response.status(),
            headers: response.headers(),
            contentType: response.headers()['content-type'] || '',
        };

        // Capture body for JSON responses within size limit
        if (entry.contentType.includes('json') || entry.contentType.includes('text')) {
            try {
                const body = await response.text();
                if (body.length <= maxBodySize) {
                    entry.body = body;
                } else {
                    entry.bodyTruncated = true;
                    entry.body = body.substring(0, maxBodySize);
                }
            } catch {
                // Response body may be unavailable (e.g., redirects)
            }
        }

        responses.push(entry);
    };

    return {
        /** Start collecting responses. */
        start() {
            if (!listening) {
                page.on('response', handler);
                listening = true;
            }
        },

        /** Stop collecting responses. */
        stop() {
            if (listening) {
                page.off('response', handler);
                listening = false;
            }
        },

        /** Get all collected responses. */
        getResults() {
            return [...responses];
        },

        /**
         * Find responses with headers matching a pattern.
         * Returns array of { url, headerName, headerValue } for each match.
         *
         * @param {RegExp} pattern - Regex to match against header names
         * @returns {Array<{ url: string, headerName: string, headerValue: string }>}
         */
        findHeaders(pattern) {
            const matches = [];
            for (const resp of responses) {
                for (const [name, value] of Object.entries(resp.headers)) {
                    if (pattern.test(name)) {
                        matches.push({ url: resp.url, headerName: name, headerValue: value });
                    }
                }
            }
            return matches;
        },

        /**
         * Get all unique header names across all collected responses.
         * @returns {string[]}
         */
        getUniqueHeaderNames() {
            const names = new Set();
            for (const resp of responses) {
                for (const name of Object.keys(resp.headers)) {
                    names.add(name);
                }
            }
            return [...names].sort();
        },
    };
}

/**
 * Recursively enumerate properties of a browser JS object tree.
 *
 * Runs inside page.evaluate() — returns serializable results only.
 *
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} rootPath - Dot-separated path to the root object (e.g., 'VV', 'VV.Form')
 * @param {Object} [options]
 * @param {number} [options.maxDepth=3] - Maximum recursion depth
 * @param {RegExp[]} [options.valuePatterns=[]] - Regexes to flag matching string/number values
 * @returns {Promise<Array<{ path: string, type: string, value: string, matched: boolean }>>}
 */
async function enumerateJSGlobals(page, rootPath, options = {}) {
    const { maxDepth = 3, valuePatterns = [] } = options;
    const patternStrings = valuePatterns.map((p) => p.source);
    const patternFlags = valuePatterns.map((p) => p.flags);

    return page.evaluate(
        ({ rootPath, maxDepth, patternStrings, patternFlags }) => {
            const patterns = patternStrings.map((src, i) => new RegExp(src, patternFlags[i]));
            const results = [];
            const seen = new WeakSet();

            function walk(obj, path, depth) {
                if (depth > maxDepth || obj == null) return;
                if (typeof obj === 'object') {
                    if (seen.has(obj)) {
                        results.push({ path, type: 'circular', value: '[circular]', matched: false });
                        return;
                    }
                    seen.add(obj);
                }

                let keys;
                try {
                    keys = Object.getOwnPropertyNames(obj);
                } catch {
                    return;
                }

                for (const key of keys) {
                    const fullPath = `${path}.${key}`;
                    try {
                        const val = obj[key];
                        const type = typeof val;

                        if (type === 'string' || type === 'number' || type === 'boolean') {
                            const strVal = String(val);
                            const matched = patterns.some((p) => p.test(strVal));
                            results.push({ path: fullPath, type, value: strVal.substring(0, 200), matched });
                        } else if (type === 'function') {
                            results.push({
                                path: fullPath,
                                type: 'function',
                                value: `[function ${key}]`,
                                matched: false,
                            });
                        } else if (type === 'object' && val !== null) {
                            // Skip DOM elements and Window
                            if (val instanceof HTMLElement || val instanceof Window || val instanceof Document) {
                                results.push({
                                    path: fullPath,
                                    type: 'dom',
                                    value: `[${val.constructor.name}]`,
                                    matched: false,
                                });
                                return;
                            }
                            const label = Array.isArray(val) ? `array[${val.length}]` : 'object';
                            results.push({ path: fullPath, type: label, value: `[${label}]`, matched: false });
                            walk(val, fullPath, depth + 1);
                        }
                    } catch {
                        results.push({ path: fullPath, type: 'error', value: '[inaccessible]', matched: false });
                    }
                }
            }

            // Resolve root path (e.g., 'VV.Form' → window.VV.Form)
            const root = rootPath.split('.').reduce((o, k) => o?.[k], window);
            if (!root) {
                return [{ path: rootPath, type: 'undefined', value: '[not found]', matched: false }];
            }
            walk(root, rootPath, 0);
            return results;
        },
        { rootPath, maxDepth, patternStrings, patternFlags }
    );
}

/**
 * Scan the current page DOM for version/build information.
 *
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {Object} [options]
 * @param {RegExp[]} [options.textPatterns=[]] - Regexes to search for in visible text nodes
 * @returns {Promise<{ title: string, meta: Array, scripts: string[], links: Array, dataAttrs: Object, textMatches: Array }>}
 */
async function scanDOM(page, options = {}) {
    const { textPatterns = [] } = options;
    const patternStrings = textPatterns.map((p) => p.source);
    const patternFlags = textPatterns.map((p) => p.flags);

    return page.evaluate(
        ({ patternStrings, patternFlags }) => {
            const patterns = patternStrings.map((src, i) => new RegExp(src, patternFlags[i]));

            // Meta tags
            const meta = [...document.querySelectorAll('meta')]
                .map((m) => ({
                    name: m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('http-equiv') || null,
                    content: m.getAttribute('content'),
                }))
                .filter((m) => m.name || m.content);

            // Script sources
            const scripts = [...document.querySelectorAll('script[src]')].map((s) => s.src);

            // Link hrefs
            const links = [...document.querySelectorAll('link[href]')].map((l) => ({
                rel: l.rel,
                href: l.href,
            }));

            // Data attributes on html and body
            const dataAttrs = {};
            for (const el of [document.documentElement, document.body]) {
                if (!el) continue;
                for (const attr of el.attributes) {
                    if (attr.name.startsWith('data-')) {
                        dataAttrs[attr.name] = attr.value;
                    }
                }
            }

            // Text node search for patterns
            const textMatches = [];
            if (patterns.length > 0) {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                while (walker.nextNode()) {
                    const text = walker.currentNode.textContent.trim();
                    if (!text) continue;
                    for (const p of patterns) {
                        const match = text.match(p);
                        if (match) {
                            const parent = walker.currentNode.parentElement;
                            const tag = parent ? parent.tagName.toLowerCase() : 'unknown';
                            const id = parent?.id ? `#${parent.id}` : '';
                            const cls = parent?.className
                                ? `.${String(parent.className).split(' ').filter(Boolean).join('.')}`
                                : '';
                            textMatches.push({
                                text: match[0],
                                context: text.substring(0, 150),
                                selector: `${tag}${id}${cls}`,
                                pattern: p.source,
                            });
                        }
                    }
                }
            }

            return { title: document.title, meta, scripts, links, dataAttrs, textMatches };
        },
        { patternStrings, patternFlags }
    );
}

/**
 * Probe a list of API endpoints and capture responses.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API request context
 * @param {string[]} endpoints - Array of full URLs to probe
 * @param {Object} [options]
 * @param {string} [options.token] - Bearer token for authenticated requests
 * @param {number} [options.timeout=15000] - Per-request timeout in ms
 * @param {number} [options.maxBodySize=5000] - Max response body to capture (chars)
 * @returns {Promise<Array<{ url: string, status: number|string, headers?: Object, contentType?: string, body?: string, bodyTruncated?: boolean, error?: string }>>}
 */
async function probeEndpoints(request, endpoints, options = {}) {
    const { token, timeout = 15000, maxBodySize = 5000 } = options;
    const results = [];

    for (const url of endpoints) {
        try {
            const headers = {};
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await request.get(url, {
                headers,
                timeout,
                failOnStatusCode: false,
            });

            const entry = {
                url,
                status: response.status(),
                headers: response.headers(),
                contentType: response.headers()['content-type'] || '',
            };

            try {
                const body = await response.text();
                if (body.length <= maxBodySize) {
                    entry.body = body;
                } else {
                    entry.body = body.substring(0, maxBodySize);
                    entry.bodyTruncated = true;
                }
            } catch {
                entry.body = null;
            }

            results.push(entry);
        } catch (e) {
            results.push({ url, status: 'error', error: e.message });
        }
    }

    return results;
}

/**
 * Format exploration findings as structured console output.
 *
 * @param {string} title - Report title
 * @param {Array<{ name: string, findings: string[] }>} sections - Report sections
 * @returns {string} Formatted report string
 */
function formatReport(title, sections) {
    const divider = '='.repeat(70);
    const lines = ['', divider, `  ${title}`, divider];

    for (const section of sections) {
        lines.push(`\n--- ${section.name} ---`);
        if (!section.findings || section.findings.length === 0) {
            lines.push('  (no findings)');
        } else {
            for (const f of section.findings) {
                lines.push(`  ${f}`);
            }
        }
    }

    lines.push('', divider, '');
    return lines.join('\n');
}

module.exports = {
    createResponseCollector,
    enumerateJSGlobals,
    scanDOM,
    probeEndpoints,
    formatReport,
};
