#!/usr/bin/env node
/**
 * Quick probe: what does getOutsideProcesses() return for WADNR?
 * Checks if script source code is available via the API.
 */
const path = require('path');
const fs = require('fs');

async function main() {
    // Load WADNR credentials
    const envPath = path.resolve(__dirname, '..', '..', '.env.json');
    const raw = JSON.parse(fs.readFileSync(envPath, 'utf8'));
    const server = raw.servers['vv5dev'];
    const wadnr = server.customers['WADNR'];

    const clientLibrary = require(path.join(
        __dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi'
    ));

    const vvAuthorize = new clientLibrary.authorize();
    vvAuthorize.readOnly = true;

    console.log('Authenticating to vv5dev/WADNR...');
    const vvClient = await vvAuthorize.getVaultApi(
        wadnr.clientId,
        wadnr.clientSecret,
        wadnr.username,
        wadnr.loginPassword,
        wadnr.audience || '',
        server.baseUrl,
        wadnr.customerAlias,
        wadnr.databaseAlias
    );

    console.log('Authenticated. Calling getOutsideProcesses()...\n');

    const result = await vvClient.outsideProcesses.getOutsideProcesses();

    // Parse if string
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    const dataRoot = parsed.data || parsed;

    // Inspect the response shape
    if (dataRoot && Array.isArray(dataRoot)) {
        const items = dataRoot;
        console.log(`Total items: ${items.length}\n`);

        if (items.length > 0) {
            // Show all keys from first item
            const first = items[0];
            console.log('=== First item keys ===');
            const keys = Object.keys(first);
            console.log(keys.join(', '));
            console.log(`\nTotal keys: ${keys.length}\n`);

            // Show first item with truncated values
            console.log('=== First item values ===');
            for (const key of keys) {
                let val = first[key];
                const valStr = typeof val === 'string' ? val : JSON.stringify(val);
                const display = valStr && valStr.length > 200 ? valStr.substring(0, 200) + '...' : valStr;
                console.log(`  ${key}: ${display}`);
            }

            // Check specifically for script-related fields
            console.log('\n=== Script-related field check ===');
            const scriptFields = keys.filter(k =>
                /script|code|body|source|content|text|js|function/i.test(k)
            );
            console.log(`Fields matching script/code/body/source: ${scriptFields.length > 0 ? scriptFields.join(', ') : 'NONE'}`);

            // Show all service names
            console.log('\n=== All service names ===');
            const nameKey = keys.find(k => /name/i.test(k) && !/desc/i.test(k));
            const catKey = keys.find(k => /cat/i.test(k));
            for (const item of items) {
                const name = nameKey ? item[nameKey] : '?';
                const cat = catKey ? item[catKey] : '?';
                console.log(`  [${cat}] ${name}`);
            }
        }
    } else {
        console.log('Raw result:', JSON.stringify(result, null, 2).substring(0, 3000));
    }

    // Try fetching a single outside process by ID to see if it has more fields
    if (dataRoot && Array.isArray(dataRoot) && dataRoot.length > 0) {
        const firstId = dataRoot[0].id;
        const firstName = dataRoot[0].name;
        console.log(`\n=== Probing individual resource: ${firstName} (${firstId}) ===`);

        // Build the URL manually since there's no method for individual fetch
        const httpHelper = vvClient.outsideProcesses._httpHelper;
        const url = httpHelper.getUrl(`/outsideprocesses/${firstId}`);
        console.log(`URL: ${url}`);

        try {
            const singleResult = await httpHelper.doVvClientRequest(url, { method: 'GET' }, null, null);
            const singleData = typeof singleResult === 'string' ? JSON.parse(singleResult) : singleResult;
            console.log('\nSingle resource response:');
            console.log(JSON.stringify(singleData, null, 2).substring(0, 5000));
        } catch (err) {
            console.log(`Individual fetch failed: ${err.message}`);
        }
    }
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
