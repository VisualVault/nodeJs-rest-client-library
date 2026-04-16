/**
 * Form template metadata and export helper.
 *
 * Provides a pure-API approach to listing form templates and building
 * export URLs. Eliminates the need for Playwright grid scraping when
 * only metadata (names, GUIDs, revisions) is required.
 *
 * The VV platform has two relevant identifiers per template:
 *   - `id`         — stable template GUID (does not change across revisions)
 *   - `revisionId` — current revision GUID (changes with each new revision)
 *
 * The ExportForm endpoint uses the `revisionId` to download template XML.
 *
 * Usage:
 *   const vvTemplates = require('./vv-templates');
 *   const config = vvAdmin.loadEnvConfig('vv5dev', 'WADNR');
 *   const templates = await vvTemplates.getTemplates(config);
 *   const url = vvTemplates.getExportUrl(config, templates[0].revisionId);
 */
const path = require('path');

const VV_API_PATH = path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi');

/**
 * Create an authenticated, read-only VV API client.
 *
 * @param {object} config - Result of vvAdmin.loadEnvConfig()
 * @returns {Promise<object>} Authenticated vvClient instance
 */
async function createClient(config) {
    const clientLib = require(VV_API_PATH);
    const auth = new clientLib.authorize();
    auth.readOnly = true;

    return auth.getVaultApi(
        config.clientId,
        config.clientSecret,
        config.username,
        config.password,
        config.audience || '',
        config.baseUrl,
        config.customerAlias,
        config.databaseAlias
    );
}

/**
 * Normalize the raw API response into a consistent array of template objects.
 *
 * The VV API may return data as a JSON string or object, with the template
 * array nested under a `data` key or at the top level.
 *
 * @param {string|object} raw - Raw response from vv.forms.getFormTemplates()
 * @returns {Array<object>} Array of template objects
 * @throws {Error} If the response cannot be parsed or contains no array
 */
function normalizeResponse(raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const items = parsed.data || parsed;
    if (!Array.isArray(items)) {
        throw new Error('Unexpected API response: expected array of templates');
    }
    return items;
}

/**
 * Shape a raw API template object into the canonical form used by all tools.
 *
 * @param {object} raw - Single template object from the API
 * @returns {object} Normalized template with consistent field names
 */
function shapeTemplate(raw) {
    return {
        id: raw.id,
        revisionId: raw.revisionId,
        name: raw.name,
        description: raw.description || '',
        revision: raw.revision,
        templateRevision: raw.templateRevision || '',
        status: raw.status,
        modifyDate: raw.modifyDate || null,
        createDate: raw.createDate || null,
        modifyBy: raw.modifyBy || '',
        createBy: raw.createBy || '',
    };
}

/**
 * Filter templates by options (prefix exclusion, name pattern, status).
 *
 * @param {Array<object>} templates - Array of shaped template objects
 * @param {object} opts
 * @param {string} [opts.excludePrefix='z'] - Exclude templates whose name starts with this (case-insensitive). Pass null to disable.
 * @param {string} [opts.filter] - Glob-style name filter (e.g., 'Appendix*')
 * @param {number} [opts.status] - Filter by release status (1 = released)
 * @returns {Array<object>} Filtered templates, sorted by name
 */
function filterTemplates(templates, opts = {}) {
    const { excludePrefix = 'z', filter = null, status = null } = opts;

    let result = templates;

    if (excludePrefix) {
        const prefix = excludePrefix.toLowerCase();
        result = result.filter((t) => !t.name.toLowerCase().startsWith(prefix));
    }

    if (filter) {
        const pattern = filter.replace(/\*/g, '.*').replace(/\?/g, '.');
        const regex = new RegExp(`^${pattern}$`, 'i');
        result = result.filter((t) => regex.test(t.name));
    }

    if (status !== null) {
        result = result.filter((t) => t.status === status);
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch all form templates from the VV REST API.
 *
 * @param {object} config - Result of vvAdmin.loadEnvConfig()
 * @param {object} [opts]
 * @param {string} [opts.excludePrefix='z'] - Exclude templates whose name starts with this. Pass null to disable.
 * @param {string} [opts.filter] - Glob-style name filter (e.g., 'Appendix*')
 * @param {number} [opts.status] - Filter by release status (1 = released)
 * @param {object} [opts.vvClient] - Pre-authenticated VV client (skips auth if provided)
 * @returns {Promise<Array<object>>} Filtered, sorted template objects
 */
async function getTemplates(config, opts = {}) {
    const vv = opts.vvClient || (await createClient(config));

    const raw = await vv.forms.getFormTemplates();
    const items = normalizeResponse(raw);
    const shaped = items.map(shapeTemplate);

    return filterTemplates(shaped, opts);
}

/**
 * Find a single template by exact name.
 *
 * @param {object} config - Result of vvAdmin.loadEnvConfig()
 * @param {string} name - Exact template name (case-insensitive)
 * @param {object} [opts]
 * @param {object} [opts.vvClient] - Pre-authenticated VV client
 * @returns {Promise<object|null>} Template object or null if not found
 */
async function getTemplateByName(config, name, opts = {}) {
    const vv = opts.vvClient || (await createClient(config));

    const raw = await vv.forms.getFormTemplates();
    const items = normalizeResponse(raw);
    const needle = name.toLowerCase();
    const match = items.find((t) => (t.name || '').toLowerCase() === needle);

    return match ? shapeTemplate(match) : null;
}

/**
 * Build the direct ExportForm URL for downloading a template's XML.
 *
 * @param {object} config - Result of vvAdmin.loadEnvConfig()
 * @param {string} revisionId - The template's revisionId (DhID)
 * @returns {string} Full URL to the ExportForm endpoint
 */
function getExportUrl(config, revisionId) {
    return `${config.baseUrl}/app/${config.customerAlias}/${config.databaseAlias}/ExportForm?FormID=${revisionId}`;
}

module.exports = {
    createClient,
    normalizeResponse,
    shapeTemplate,
    filterTemplates,
    getTemplates,
    getTemplateByName,
    getExportUrl,
};
