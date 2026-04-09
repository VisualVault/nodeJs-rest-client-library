/**
 * Write Policy — central enforcement for environment write protection.
 *
 * Validates write operations against the active customer's writePolicy config.
 * All write guards (Playwright form saves, Playwright API requests, Node.js
 * REST client) call through this single module.
 *
 * Config modes:
 *   - "unrestricted" (or absent): all writes allowed
 *   - "allowlist": only writes to listed forms/webServices/documents allowed
 *   - "blocked": all writes blocked (equivalent to legacy readOnly: true)
 *
 * If writePolicy is absent, falls back to the boolean readOnly field:
 *   - readOnly: false → unrestricted
 *   - readOnly: true  → blocked
 */
const { loadConfig } = require('./env-config');

let _policy = null;
let _instance = null;

function getPolicy() {
    if (_policy !== null) return _policy;

    const config = loadConfig();
    _instance = config.instance;

    if (config.writePolicy) {
        _policy = config.writePolicy;
    } else {
        // Backward compat: derive from boolean readOnly
        _policy = { mode: config.readOnly ? 'blocked' : 'unrestricted' };
    }

    return _policy;
}

function getInstance() {
    if (_instance === null) getPolicy();
    return _instance;
}

// --- Audit log ---

const writeLog = [];

function logWrite(layer, operation, resourceId, allowed, details) {
    writeLog.push({
        timestamp: new Date().toISOString(),
        instance: getInstance(),
        layer,
        operation,
        resourceId,
        allowed,
        details: details || '',
    });
}

function getWriteLog() {
    return writeLog;
}

// --- Assertions ---

/**
 * Assert that a form save is allowed for the given template ID.
 * Call this BEFORE clicking the Save button in Playwright.
 *
 * @param {string} templateId - form template GUID (lowercase)
 * @param {string} [operation='create'] - 'create' or 'update'
 * @throws {Error} if the write is blocked by policy
 */
function assertFormWriteAllowed(templateId, operation = 'create') {
    if (process.env.VV_FORCE_WRITE) {
        logWrite('form', operation, templateId, true, 'VV_FORCE_WRITE override');
        return;
    }

    const policy = getPolicy();

    if (policy.mode === 'unrestricted') {
        logWrite('form', operation, templateId, true, 'unrestricted');
        return;
    }

    if (policy.mode === 'blocked') {
        logWrite('form', operation, templateId, false, 'blocked mode');
        throw new Error(
            `WritePolicy: ${operation} on form template ${templateId} blocked.\n` +
                `Environment ${getInstance()} has writePolicy.mode = "blocked".\n` +
                'No form writes are allowed on this environment.'
        );
    }

    // mode === 'allowlist'
    const normalizedId = (templateId || '').toLowerCase();
    const forms = policy.forms || [];
    const match = forms.find((f) => f.templateId.toLowerCase() === normalizedId);

    if (!match) {
        logWrite('form', operation, templateId, false, 'template not in allowlist');
        throw new Error(
            `WritePolicy: ${operation} on form template ${templateId} blocked.\n` +
                `Environment ${getInstance()} allows writes only to:\n` +
                forms.map((f) => `  - ${f.name || f.templateId} (${f.templateId})`).join('\n') +
                '\nThis template is not in the allowlist.'
        );
    }

    if (match.operations && !match.operations.includes(operation)) {
        logWrite('form', operation, templateId, false, `operation "${operation}" not allowed`);
        throw new Error(
            `WritePolicy: "${operation}" not allowed on form ${match.name || templateId}.\n` +
                `Allowed operations: ${match.operations.join(', ')}`
        );
    }

    logWrite('form', operation, templateId, true, `allowlist match: ${match.name || templateId}`);
}

/**
 * Assert that an API write (PUT/POST/DELETE) is allowed for the given URL.
 * Used by both Playwright request wrappers and the Node.js REST client.
 *
 * @param {string} method - HTTP method (PUT, POST, DELETE)
 * @param {string} url - full or partial request URL
 * @throws {Error} if the write is blocked by policy
 */
function assertApiWriteAllowed(method, url) {
    if (process.env.VV_FORCE_WRITE) {
        logWrite('api', method, url, true, 'VV_FORCE_WRITE override');
        return;
    }

    const policy = getPolicy();

    if (policy.mode === 'unrestricted') {
        logWrite('api', method, url, true, 'unrestricted');
        return;
    }

    if (policy.mode === 'blocked') {
        logWrite('api', method, url, false, 'blocked mode');
        throw new Error(
            `WritePolicy: ${method} ${url} blocked.\n` +
                `Environment ${getInstance()} has writePolicy.mode = "blocked".`
        );
    }

    // mode === 'allowlist' — check if the URL matches an allowed form template or document
    const normalizedUrl = url.toLowerCase();

    // Check form template allowlist
    const forms = policy.forms || [];
    for (const form of forms) {
        if (normalizedUrl.includes(form.templateId.toLowerCase())) {
            logWrite('api', method, url, true, `allowlist match: ${form.name || form.templateId}`);
            return;
        }
    }

    // Check document allowlist
    const documents = policy.documents || [];
    for (const doc of documents) {
        const docId = (doc.documentId || doc.folderId || '').toLowerCase();
        if (docId && normalizedUrl.includes(docId)) {
            logWrite('api', method, url, true, `document allowlist match: ${doc.name || docId}`);
            return;
        }
    }

    // Check web services allowlist
    const webServices = policy.webServices || [];
    for (const ws of webServices) {
        const wsId = (ws.scriptId || '').toLowerCase();
        if (wsId && normalizedUrl.includes(wsId)) {
            logWrite('api', method, url, true, `webService allowlist match: ${ws.name || wsId}`);
            return;
        }
    }

    logWrite('api', method, url, false, 'not in any allowlist');
    throw new Error(
        `WritePolicy: ${method} ${url} blocked.\n` +
            `Environment ${getInstance()} allows writes only to allowlisted resources.\n` +
            'Add the resource to writePolicy in .env.json if this write is intentional.'
    );
}

/**
 * Check if the environment is unrestricted (no write guards needed).
 * @returns {boolean}
 */
function isUnrestricted() {
    return getPolicy().mode === 'unrestricted';
}

/**
 * Reset cached policy (for testing or config reload).
 */
function reset() {
    _policy = null;
    _instance = null;
    writeLog.length = 0;
}

module.exports = {
    assertFormWriteAllowed,
    assertApiWriteAllowed,
    isUnrestricted,
    getWriteLog,
    reset,
};
