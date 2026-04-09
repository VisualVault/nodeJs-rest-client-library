#!/usr/bin/env node

/**
 * Direct Node.js runner for the WS test harness.
 * Calls the harness without going through VV's Microservice routing.
 * Supports debugger attachment (--inspect-brk) and TZ simulation (TZ= env var).
 *
 * Usage:
 *   node run-ws-test.js --action WS-1 --configs A,D --input-date 2026-03-15
 *   node run-ws-test.js --action WS-2 --configs ALL --record-id DateTest-000080
 *   node run-ws-test.js --action WS-1 --configs A --debug
 *   TZ=UTC node run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15
 *   node --inspect-brk run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15
 *
 * Credentials: Reads from testing/config/vv-config.json.
 *   Required fields: loginUrl, customerAlias, databaseAlias, clientId, clientSecret, username, password
 */

const path = require('path');

// ---------- Parse CLI args ----------

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--action':
                parsed.action = args[++i];
                break;
            case '--configs':
                parsed.configs = args[++i];
                break;
            case '--record-id':
                parsed.recordId = args[++i];
                break;
            case '--input-date':
                parsed.inputDate = args[++i];
                break;
            case '--input-formats':
                parsed.inputFormats = args[++i];
                break;
            case '--debug':
                parsed.debug = true;
                break;
            case '--help':
                console.log(`
WS Test Harness Runner

Options:
  --action <WS-1..WS-9>     Required. Test category to run.
  --configs <A,C,D|ALL>      Target configs. Default: ALL.
  --record-id <name>         Record instance name (for WS-2, WS-3).
  --input-date <date>        Date string to write (for WS-1, WS-3).
  --input-formats <fmts>     Format keys (for WS-5).
  --debug                    Include raw API responses in output.
  --help                     Show this help.

Environment:
  TZ=UTC node run-ws-test.js ...    Simulate cloud/AWS server timezone.
`);
                process.exit(0);
                break;
            default:
                console.error(`Unknown argument: ${args[i]}. Use --help for usage.`);
                process.exit(1);
        }
    }

    if (!parsed.action) {
        console.error('Error: --action is required. Use --help for usage.');
        process.exit(1);
    }

    return parsed;
}

// ---------- Main ----------

async function main() {
    const args = parseArgs();

    // Load credentials from root .env.json (single source of truth)
    const { loadConfig } = require('../../testing/fixtures/env-config');
    let config;
    try {
        config = loadConfig();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    const requiredFields = [
        'loginUrl',
        'customerAlias',
        'databaseAlias',
        'clientId',
        'clientSecret',
        'username',
        'password',
    ];
    const missing = requiredFields.filter((f) => !config[f]);
    if (missing.length > 0) {
        console.error(`Missing fields in .env.json: ${missing.join(', ')}`);
        process.exit(1);
    }

    // Authenticate with VV
    const clientLibrary = require(path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi'));
    const vvAuthorize = new clientLibrary.authorize();
    vvAuthorize.readOnly = config.readOnly || false;
    vvAuthorize.writePolicy = config.writePolicy || null;

    console.log(`Authenticating with ${config.loginUrl} as ${config.customerAlias}/${config.databaseAlias}...`);

    let vvClient;
    try {
        vvClient = await vvAuthorize.getVaultApi(
            config.clientId,
            config.clientSecret,
            config.username,
            config.password,
            null, // audience
            config.loginUrl,
            config.customerAlias,
            config.databaseAlias
        );
    } catch (err) {
        console.error(`Authentication failed: ${err.message}`);
        process.exit(1);
    }

    console.log('Authenticated. Running harness...\n');

    // Build ffCollection
    const fields = [
        { name: 'Action', value: args.action },
        { name: 'TargetConfigs', value: args.configs || 'ALL' },
        { name: 'RecordID', value: args.recordId || '' },
        { name: 'InputDate', value: args.inputDate || '' },
        { name: 'InputFormats', value: args.inputFormats || '' },
        { name: 'Debug', value: args.debug ? 'true' : 'false' },
    ];
    const ffCollection = new clientLibrary.forms.formFieldCollection(fields);

    // Mock response object to capture output
    let capturedOutput = null;
    const mockResponse = {
        json: (status, data) => {
            capturedOutput = data;
        },
    };

    // Load and run harness
    const harness = require(path.join(__dirname, '..', '..', 'scripts', 'server-scripts', 'webservice-test-harness'));
    await harness.main(ffCollection, vvClient, mockResponse);

    // Output results
    if (capturedOutput) {
        console.log(JSON.stringify(capturedOutput, null, 2));

        // Exit with non-zero if errors
        if (capturedOutput.status === 'Error') {
            process.exit(1);
        }
    } else {
        console.error('No output captured from harness.');
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(`Runner error: ${err.message}`);
    process.exit(1);
});
