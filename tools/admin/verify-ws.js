#!/usr/bin/env node
/**
 * Verify web service(s) exist and are callable via the VV REST API.
 *
 * Usage:
 *   node tools/admin/verify-ws.js --project emanueljofre --name "zzzTestUnderscore_Name"
 *   node tools/admin/verify-ws.js --project emanueljofre --name "zzzTest*"  # glob match
 *   node tools/admin/verify-ws.js --project emanueljofre --list             # list all WS
 */
const path = require('path');
const vvAdmin = require('../helpers/vv-admin');

const cliArgs = process.argv.slice(2);

function getArg(flag) {
    const i = cliArgs.indexOf(flag);
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : null;
}

const PROJECT_NAME = getArg('--project');
const WS_NAME = getArg('--name');
const LIST = cliArgs.includes('--list');
const INVOKE = cliArgs.includes('--invoke');

if (!PROJECT_NAME || (!WS_NAME && !LIST)) {
    console.error('Usage: node tools/admin/verify-ws.js --project <name> --name <wsName> [--invoke]');
    console.error('       node tools/admin/verify-ws.js --project <name> --list');
    process.exit(1);
}

async function main() {
    const match = vvAdmin.findCustomer(PROJECT_NAME);
    if (!match) {
        console.error(`No customer "${PROJECT_NAME}" in .env.json`);
        process.exit(1);
    }

    const config = vvAdmin.loadEnvConfig(match.server, match.customer);

    // Authenticate — authenticationUrl is the base URL, library appends /OAuth/Token
    const clientLibrary = require(path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi'));
    const vvAuthorize = new clientLibrary.authorize();
    vvAuthorize.readOnly = config.readOnly || false;

    console.log(`Authenticating with ${match.server}/${match.customer}...`);
    const vvClient = await vvAuthorize.getVaultApi(
        config.clientId,
        config.clientSecret,
        config.username,
        config.password,
        config.audience,
        config.baseUrl,
        config.customerAlias,
        config.databaseAlias
    );

    // Get all outside processes — VV client may return raw JSON string
    console.log('Fetching outside processes...');
    const raw = await vvClient.outsideProcesses.getOutsideProcesses();
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const processes = parsed.data || parsed;
    if (!Array.isArray(processes)) {
        console.error('Unexpected response format:', typeof processes);
        process.exit(1);
    }

    if (LIST) {
        console.log(`\nFound ${processes.length} web services:\n`);
        processes
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .forEach((p) => {
                console.log(`  ${p.name}  [${p.id || ''}]  cat=${p.processCategory || p.category || ''}`);
            });
        return;
    }

    // Filter by name (supports glob-like * matching)
    const pattern = WS_NAME.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`, 'i');
    const matched = processes.filter((p) => regex.test(p.name));

    if (matched.length === 0) {
        console.error(`\nNo web services found matching "${WS_NAME}"`);
        console.error(`Total web services: ${processes.length}`);
        // Show similar names
        const similar = processes.filter((p) =>
            (p.name || '').toLowerCase().includes(WS_NAME.toLowerCase().replace(/\*/g, ''))
        );
        if (similar.length > 0) {
            console.error(`\nSimilar names:`);
            similar.forEach((p) => console.error(`  ${p.name}`));
        }
        process.exit(1);
    }

    console.log(`\nFound ${matched.length} matching web service(s):\n`);

    for (const ws of matched) {
        console.log(`  Name:     ${ws.name}`);
        console.log(`  ID:       ${ws.id || 'N/A'}`);
        console.log(`  Category: ${ws.processCategory || ws.category || 'N/A'}`);
        console.log(`  Created:  ${ws.createDate || 'N/A'}`);
        console.log(`  Modified: ${ws.modifyDate || 'N/A'}`);

        if (INVOKE) {
            console.log(`  Invoking...`);
            try {
                const raw = await vvClient.scripts.runWebService(ws.name, {});
                const resp = typeof raw === 'string' ? JSON.parse(raw) : raw;
                const status = resp?.meta?.status || resp?.status || (resp ? 'ok (response received)' : 'empty');
                console.log(`  Result:   ${status}`);
                const preview = JSON.stringify(resp).substring(0, 300);
                console.log(`  Response: ${preview}`);
            } catch (err) {
                console.log(`  Error:    ${err.message}`);
            }
        }
        console.log();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
