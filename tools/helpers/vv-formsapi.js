/**
 * PreformsAPI helper — fetches template data from preformsapi.visualvault.com.
 *
 * Used as fallback when ExportForm (XML export) fails. Obtains a JWT from the
 * VV API, discovers the preformsapi base URL from configuration, and retrieves
 * template pages, controls, scripts, and conditions as JSON.
 *
 * VV API calls use Playwright's page.request API (sends browser context cookies
 * regardless of page origin). PreformsAPI calls use page.evaluate with Bearer auth.
 */

const PREFORMS_AUDIENCE = 'e98f5a306fed4a279a2837dee47751b6';

/**
 * Discover the preformsapi base URL from the VV configuration endpoint.
 *
 * Uses Playwright's page.request API which sends browser context cookies
 * regardless of the page's current origin (avoids about:blank CORS issues).
 *
 * @param {import('playwright').Page} page - Logged-in browser page
 * @param {string} baseApi - e.g. "https://vv5dev.visualvault.com/api/v1/WADNR/fpOnline"
 * @returns {Promise<string>} e.g. "https://preformsapi.visualvault.com"
 */
async function discoverFormsApiUrl(page, baseApi) {
    const resp = await page.request.get(`${baseApi}/configuration/formsapi`);
    if (!resp.ok()) return 'https://preformsapi.visualvault.com';
    const json = await resp.json();
    return json?.data?.formsApiUrl || 'https://preformsapi.visualvault.com';
}

/**
 * Fetch a JWT for preformsapi authentication.
 *
 * Uses Playwright's page.request API which sends browser context cookies
 * regardless of the page's current origin (avoids about:blank CORS issues).
 *
 * @param {import('playwright').Page} page - Logged-in browser page
 * @param {string} baseApi - VV API base URL
 * @returns {Promise<string>} JWT token string
 */
async function getJwt(page, baseApi) {
    const resp = await page.request.get(`${baseApi}/Users/getJWT?audience=${PREFORMS_AUDIENCE}`);
    if (!resp.ok()) throw new Error(`Failed to get preformsapi JWT: ${resp.status()} ${resp.statusText()}`);
    const json = await resp.json();
    const token = json?.data?.token;
    if (!token) throw new Error(`Failed to get preformsapi JWT: no token in response`);
    return token;
}

/**
 * Fetch a single preformsapi endpoint with Bearer auth.
 * @param {import('playwright').Page} page
 * @param {string} url - Full preformsapi URL
 * @param {string} jwt - Bearer token
 * @returns {Promise<object>} Parsed JSON response
 */
async function preformsFetch(page, url, jwt) {
    return page.evaluate(
        async ({ u, token }) => {
            const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
            if (!r.ok) return { _error: `${r.status} ${r.statusText}`, _url: u };
            return r.json();
        },
        { u: url, token: jwt }
    );
}

/**
 * Fetch all 4 preformsapi endpoints for a template and merge into one object.
 *
 * @param {import('playwright').Page} page - Logged-in browser page
 * @param {string} formsApiUrl - Base URL (no trailing /api/v1)
 * @param {string} revisionId - Template revisionId (DhID)
 * @param {string} jwt - Bearer token
 * @returns {Promise<object>} Merged template JSON
 */
async function fetchTemplateJson(page, formsApiUrl, revisionId, jwt) {
    const base = `${formsApiUrl}/api/v1`;

    const [pages, controls, scripts, conditions] = await Promise.all([
        preformsFetch(page, `${base}/FormTemplate/${revisionId}?revisionType=0`, jwt),
        preformsFetch(
            page,
            `${base}/FormTemplate/Controls/${revisionId}?revisionType=0&fieldList=&bypassCache=false`,
            jwt
        ),
        preformsFetch(page, `${base}/FormTemplate/${revisionId}/scripts?revisionType=0&dataOnly=true`, jwt),
        preformsFetch(page, `${base}/FormTemplate/${revisionId}/conditions?revisionType=0`, jwt),
    ]);

    // Check for errors
    for (const [name, resp] of [
        ['pages', pages],
        ['controls', controls],
        ['scripts', scripts],
        ['conditions', conditions],
    ]) {
        if (resp._error) {
            throw new Error(`preformsapi ${name} failed for ${revisionId}: ${resp._error}`);
        }
    }

    return {
        pages: pages.data,
        controls: controls.data,
        scripts: scripts.data,
        conditions: conditions.data,
        _meta: {
            source: 'preformsapi',
            fetchedAt: new Date().toISOString(),
            revisionId,
        },
    };
}

module.exports = { discoverFormsApiUrl, getJwt, preformsFetch, fetchTemplateJson, PREFORMS_AUDIENCE };
