/**
 * Web Services API helpers for VV date-handling tests.
 *
 * Provides reusable functions for authenticating with the VV REST API,
 * creating/reading/updating form records, and capturing field values.
 *
 * These helpers use Playwright's APIRequestContext for HTTP calls,
 * keeping tests within the Playwright runner for timezone matrix support.
 *
 * See tasks/date-handling/web-services/analysis/overview.md for API documentation.
 */
const { API_CONFIG, API_FIELD_KEY } = require('../../testing/fixtures/ws-config');

// VV API OAuth token endpoint
const AUTH_ENDPOINT = '/OAuth/Token';

// VV API base path
const API_BASE = `/api/v1/${API_CONFIG.customerAlias}/${API_CONFIG.databaseAlias}`;

/**
 * Authenticate with the VV REST API and return the access token.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API request context
 * @returns {Promise<{accessToken: string, tokenType: string, expiresIn: number}>}
 */
async function authenticate(request) {
    const resp = await request.post(`${API_CONFIG.baseUrl}${AUTH_ENDPOINT}`, {
        form: {
            client_id: API_CONFIG.clientId,
            client_secret: API_CONFIG.clientSecret,
            username: API_CONFIG.userId,
            password: API_CONFIG.password,
            grant_type: 'password',
        },
    });

    if (!resp.ok()) {
        throw new Error(`Authentication failed: ${resp.status()} ${resp.statusText()}`);
    }

    const data = await resp.json();
    return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
    };
}

/**
 * Create a new form instance via the VV REST API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} accessToken - Bearer token
 * @param {string} formTemplateId - Form template GUID
 * @param {Object} fieldData - Key-value pairs of field names and values (e.g., { Field7: '2026-03-15' })
 * @returns {Promise<Object>} - The created form record data from the API response
 */
async function createFormInstance(request, accessToken, formTemplateId, fieldData) {
    const url = `${API_CONFIG.baseUrl}${API_BASE}/formtemplates/${formTemplateId}/forms`;

    const resp = await request.post(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        data: fieldData,
    });

    if (!resp.ok()) {
        const body = await resp.text();
        throw new Error(`createFormInstance failed: ${resp.status()} ${resp.statusText()} — ${body}`);
    }

    const result = await resp.json();
    return result.data;
}

/**
 * Get a form instance by ID via the VV REST API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} accessToken
 * @param {string} formTemplateId
 * @param {string} formInstanceId - The specific form instance (DataID) GUID
 * @param {string} [fields] - Comma-separated field names to return (e.g., 'id,dataField7,dataField5')
 * @returns {Promise<Object>} - The form record data
 */
async function getFormInstance(request, accessToken, formTemplateId, formInstanceId, fields) {
    let url = `${API_CONFIG.baseUrl}${API_BASE}/formtemplates/${formTemplateId}/forms/${formInstanceId}`;

    const params = new URLSearchParams();
    if (fields) {
        params.set('fields', fields);
    }
    const qs = params.toString();
    if (qs) {
        url += `?${qs}`;
    }

    const resp = await request.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!resp.ok()) {
        const body = await resp.text();
        throw new Error(`getFormInstance failed: ${resp.status()} ${resp.statusText()} — ${body}`);
    }

    const result = await resp.json();
    return result.data;
}

/**
 * Query form instances by filter via the VV REST API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} accessToken
 * @param {string} formTemplateId
 * @param {Object} [queryParams] - Query parameters (fields, q, expand, etc.)
 * @returns {Promise<Array>} - Array of matching form records
 */
async function queryFormInstances(request, accessToken, formTemplateId, queryParams = {}) {
    let url = `${API_CONFIG.baseUrl}${API_BASE}/formtemplates/${formTemplateId}/forms`;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
        params.set(key, value);
    }
    const qs = params.toString();
    if (qs) {
        url += `?${qs}`;
    }

    const resp = await request.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!resp.ok()) {
        const body = await resp.text();
        throw new Error(`queryFormInstances failed: ${resp.status()} ${resp.statusText()} — ${body}`);
    }

    const result = await resp.json();
    return result.data;
}

/**
 * Update a form instance (create new revision) via the VV REST API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} accessToken
 * @param {string} formTemplateId
 * @param {string} formInstanceId
 * @param {Object} fieldData - Key-value pairs of fields to update
 * @returns {Promise<Object>} - The updated form record data
 */
async function updateFormInstance(request, accessToken, formTemplateId, formInstanceId, fieldData) {
    const url = `${API_CONFIG.baseUrl}${API_BASE}/formtemplates/${formTemplateId}/forms/${formInstanceId}`;

    const resp = await request.post(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        data: fieldData,
    });

    if (!resp.ok()) {
        const body = await resp.text();
        throw new Error(`updateFormInstance failed: ${resp.status()} ${resp.statusText()} — ${body}`);
    }

    const result = await resp.json();
    return result.data;
}

/**
 * Extract a field value from an API response record using the correct key casing.
 *
 * @param {Object} record - API response record
 * @param {string} fieldName - Field name as used in VV Forms (e.g., 'Field7')
 * @returns {*} - The field value from the API response
 */
function getFieldFromRecord(record, fieldName) {
    // API returns lowercase-first keys (Field7 → dataField7)
    const key = API_FIELD_KEY(fieldName);
    return record[key];
}

/**
 * Perform an API round-trip cycle: read field value, write it back, read again.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} accessToken
 * @param {string} formTemplateId
 * @param {string} formInstanceId
 * @param {string} fieldName
 * @param {number} cycles - Number of read→write cycles
 * @returns {Promise<Array<{cycle: number, readValue: *, writeValue: *, finalValue: *}>>}
 */
async function apiRoundTripCycle(request, accessToken, formTemplateId, formInstanceId, fieldName, cycles) {
    const results = [];

    for (let i = 1; i <= cycles; i++) {
        // Read current value
        const record = await getFormInstance(request, accessToken, formTemplateId, formInstanceId);
        const readValue = getFieldFromRecord(record, fieldName);

        // Write it back
        await updateFormInstance(request, accessToken, formTemplateId, formInstanceId, {
            [fieldName]: readValue,
        });

        // Read again to see what was stored
        const updated = await getFormInstance(request, accessToken, formTemplateId, formInstanceId);
        const finalValue = getFieldFromRecord(updated, fieldName);

        results.push({
            cycle: i,
            readValue,
            writeValue: readValue,
            finalValue,
        });
    }

    return results;
}

module.exports = {
    authenticate,
    createFormInstance,
    getFormInstance,
    queryFormInstances,
    updateFormInstance,
    getFieldFromRecord,
    apiRoundTripCycle,
};
