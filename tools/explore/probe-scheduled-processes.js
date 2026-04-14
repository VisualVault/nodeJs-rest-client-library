#!/usr/bin/env node

/**
 * Read-only probe: GET /scheduledProcess to inspect full API response fields.
 * Purpose: discover if the API returns creation/modify dates not visible in the scheduler admin grid.
 *
 * Usage:
 *   node tools/explore/probe-scheduled-processes.js
 */

async function main() {
    const { loadConfig } = require('../../testing/fixtures/env-config');
    let config;
    try {
        config = loadConfig();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    const BASE_URL = config.baseUrl;
    const API_BASE = `/api/v1/${config.customerAlias}/${config.databaseAlias}`;

    console.log(`Target: ${BASE_URL}${API_BASE}`);

    // Authenticate via OAuth (same pattern as platform-discovery)
    console.log('Authenticating...');
    const tokenResp = await fetch(`${BASE_URL}/OAuth/Token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            username: config.username,
            password: config.password,
            grant_type: 'password',
        }),
    });

    if (!tokenResp.ok) {
        console.error(`OAuth failed: ${tokenResp.status} ${tokenResp.statusText}`);
        process.exit(1);
    }

    const tokenData = await tokenResp.json();
    const token = tokenData.access_token;
    console.log('Authenticated.\n');

    // GET /scheduledProcess
    const url = `${BASE_URL}${API_BASE}/scheduledProcess`;
    console.log(`GET ${url}\n`);

    const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
        console.error(`API call failed: ${resp.status} ${resp.statusText}`);
        const body = await resp.text();
        console.error(body);
        process.exit(1);
    }

    const result = await resp.json();

    // Show meta
    if (result.meta) {
        console.log('=== META ===');
        console.log(JSON.stringify(result.meta, null, 2));
        console.log();
    }

    // Show full field set of first record
    const data = result.data;
    if (Array.isArray(data) && data.length > 0) {
        console.log(`=== TOTAL RECORDS: ${data.length} ===\n`);

        console.log('=== FIELDS ON FIRST RECORD ===');
        const first = data[0];
        const keys = Object.keys(first);
        console.log(`Fields (${keys.length}): ${keys.join(', ')}\n`);

        console.log('=== FIRST RECORD (full) ===');
        console.log(JSON.stringify(first, null, 2));
        console.log();

        // Dump all records — compact, one per line
        console.log('=== ALL RECORDS ===');
        for (const rec of data) {
            console.log(JSON.stringify(rec));
        }
    } else {
        console.log('=== RAW RESPONSE ===');
        console.log(JSON.stringify(result, null, 2));
    }
}

main();
