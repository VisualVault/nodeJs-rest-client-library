/**
 * Shared HTTP probe functions for VV platform environment capture.
 *
 * Pure HTTP — no browser, no Playwright. All probes accept explicit
 * parameters rather than reading module-level globals.
 *
 * Used by:
 *   - tools/explore/version-snapshot.js (timestamped snapshots)
 *   - tools/explore/environment-profile.js (customer environment profiles)
 */

// --- OAuth ---

/**
 * Acquire an OAuth access token for a VV environment.
 * @param {object} config - Must have: baseUrl, clientId, clientSecret, username, password
 * @returns {Promise<string>} access_token
 */
async function getToken(config) {
    const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        username: config.username,
        password: config.password,
        grant_type: 'password',
    });
    const resp = await fetch(`${config.baseUrl}/OAuth/Token`, { method: 'POST', body: params });
    if (!resp.ok) throw new Error(`OAuth failed: ${resp.status}`);
    const data = await resp.json();
    return data.access_token;
}

// --- API probes ---

async function captureApiVersion(baseUrl, customer, database, token) {
    const url = `${baseUrl}/api/v1/${customer}/${database}/version`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return { error: `${resp.status} ${resp.statusText}` };
    const json = await resp.json();
    return json.data || json;
}

async function captureConfigEndpoints(baseUrl, customer, database, token) {
    const components = ['docapi', 'formsapi', 'objectsapi', 'studioapi', 'notificationapi'];
    const results = {};
    for (const component of components) {
        const url = `${baseUrl}/api/v1/${customer}/${database}/configuration/${component}`;
        try {
            const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (resp.ok) {
                const json = await resp.json();
                results[component] = json.data || json;
            } else {
                results[component] = { error: `${resp.status}` };
            }
        } catch (e) {
            results[component] = { error: e.message };
        }
    }
    return results;
}

async function captureServerHeaders(baseUrl, customer, database, token) {
    const url = `${baseUrl}/api/v1/${customer}/${database}/version`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const headers = {};
    for (const [name, value] of resp.headers) {
        if (/server|version|powered|aspnet|mvc/i.test(name)) {
            headers[name] = value;
        }
    }
    return headers;
}

// --- FormViewer static files ---

async function captureFormViewerBuild(baseUrl) {
    try {
        const buildResp = await fetch(`${baseUrl}/FormViewer/assets/build.json`);
        if (!buildResp.ok) return { error: `build.json: ${buildResp.status}` };
        return await buildResp.json();
    } catch (e) {
        return { error: e.message };
    }
}

async function captureFormViewerConfig(baseUrl) {
    try {
        const configResp = await fetch(`${baseUrl}/FormViewer/assets/config.json`);
        if (!configResp.ok) return { error: `config.json: ${configResp.status}` };
        return await configResp.json();
    } catch (e) {
        return { error: e.message };
    }
}

// --- FormsAPI probe (requires JWT) ---

async function captureFormsApiInfo(baseUrl, customer, database, token, fvConfig) {
    try {
        // Get JWT for FormsAPI auth
        const jwtResp = await fetch(`${baseUrl}/api/v1/${customer}/${database}/users/getjwt`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!jwtResp.ok) return { error: `getjwt: ${jwtResp.status}` };
        const jwt = (await jwtResp.json()).data.token;

        // Hit FormsAPI to capture Stackify ID and other headers
        const formsApiUrl = fvConfig.formsApiUrl || 'https://preformsapi.visualvault.com/api/v1';
        const resp = await fetch(`${formsApiUrl}/FormSettings`, {
            headers: { Authorization: 'Bearer ' + jwt },
        });

        const headers = {};
        for (const [name, value] of resp.headers) {
            headers[name] = value;
        }

        return {
            stackifyId: headers['x-stackifyid'] || null,
            headers,
            formSettings: resp.ok ? await resp.json() : null,
        };
    } catch (e) {
        return { error: e.message };
    }
}

// --- /meta endpoint ---

async function captureApiMeta(baseUrl, customer, database, token) {
    try {
        const resp = await fetch(`${baseUrl}/api/v1/${customer}/${database}/meta`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return { error: `${resp.status}` };
        const json = await resp.json();
        const dataTypes = json.data?.dataTypes || [];
        return { dataTypeCount: dataTypes.length, dataTypes };
    } catch (e) {
        return { error: e.message };
    }
}

module.exports = {
    getToken,
    captureApiVersion,
    captureConfigEndpoints,
    captureServerHeaders,
    captureFormViewerBuild,
    captureFormViewerConfig,
    captureFormsApiInfo,
    captureApiMeta,
};
