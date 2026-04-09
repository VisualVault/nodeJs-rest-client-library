/**
 * Captures VV platform build context via HTTP.
 *
 * Pure HTTP — no browser, no Playwright. Takes ~2 seconds.
 * Used by global-setup.js (testing + explore) and regression pipelines
 * to tag every test run with the platform version it ran against.
 *
 * Data sources:
 *   - /FormViewer/assets/build.json  (static, no auth)
 *   - /api/v1/{customer}/{db}/version (OAuth)
 *
 * Usage:
 *   const { captureBuildContext } = require('../tools/helpers/build-context');
 *   const ctx = await captureBuildContext(config);
 *   // → { formViewerBuild, formViewerCode, progVersion, dbVersion, production, timestamp }
 */
const { loadConfig } = require('../../testing/fixtures/env-config');

/**
 * Capture platform build context.
 *
 * @param {Object} [configOverride] - Override loadConfig() (for testing)
 * @returns {Promise<Object>} Build context object
 */
async function captureBuildContext(configOverride) {
    const config = configOverride || loadConfig();
    const baseUrl = config.baseUrl;
    const apiBase = `/api/v1/${config.customerAlias}/${config.databaseAlias}`;

    // Run all probes in parallel (~2 seconds total)
    const [buildJson, versionData] = await Promise.all([
        fetchBuildJson(baseUrl),
        fetchApiVersion(baseUrl, apiBase, config),
    ]);

    return {
        formViewerBuild: buildJson.build ? String(buildJson.build) : null,
        formViewerCode: buildJson.code || null,
        progVersion: versionData.progVersion || null,
        dbVersion: versionData.dbVersion || null,
        production: buildJson.production ?? null,
        environment: baseUrl,
        instance: config.instance,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Fetch FormViewer build.json (static file, no auth).
 */
async function fetchBuildJson(baseUrl) {
    try {
        const [buildResp, configResp] = await Promise.all([
            fetch(`${baseUrl}/FormViewer/assets/build.json`),
            fetch(`${baseUrl}/FormViewer/assets/config.json`),
        ]);

        const build = buildResp.ok ? await buildResp.json() : {};
        const config = configResp.ok ? await configResp.json() : {};

        return {
            build: build.build || null,
            code: build.code || null,
            production: config.production ?? null,
        };
    } catch {
        return { build: null, code: null, production: null };
    }
}

/**
 * Fetch /version from the core API (requires OAuth).
 */
async function fetchApiVersion(baseUrl, apiBase, config) {
    try {
        const params = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            username: config.username,
            password: config.password,
            grant_type: 'password',
        });
        const authResp = await fetch(`${baseUrl}/OAuth/Token`, { method: 'POST', body: params });
        if (!authResp.ok) return {};

        const token = (await authResp.json()).access_token;
        const versionResp = await fetch(`${baseUrl}${apiBase}/version`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!versionResp.ok) return {};

        const data = await versionResp.json();
        return data.data || {};
    } catch {
        return {};
    }
}

module.exports = { captureBuildContext };
