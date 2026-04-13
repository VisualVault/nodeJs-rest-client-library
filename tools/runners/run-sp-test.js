#!/usr/bin/env node

/**
 * Direct Node.js runner for scheduled process test scripts.
 * Calls the script without going through VV's Microservice routing.
 * Analogous to run-ws-test.js but for the scheduled process signature.
 *
 * Usage:
 *   node run-sp-test.js
 *   node run-sp-test.js --script ScheduledProcessTestHarness
 *   node run-sp-test.js --token <real-scheduled-process-guid>
 *   node run-sp-test.js --skip-completion
 *   TZ=UTC node run-sp-test.js
 *   node --inspect-brk run-sp-test.js
 *
 * Credentials: Reads from root .env.json via testing/fixtures/env-config.js.
 */

const path = require('path');

const PLACEHOLDER_TOKEN = '00000000-0000-0000-0000-000000000000';

// ---------- Parse CLI args ----------

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
        script: 'ScheduledProcessTestHarness',
        token: PLACEHOLDER_TOKEN,
        skipCompletion: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--script':
                parsed.script = args[++i];
                break;
            case '--token':
                parsed.token = args[++i];
                break;
            case '--skip-completion':
                parsed.skipCompletion = true;
                break;
            case '--help':
                console.log(`
Scheduled Process Test Runner

Options:
  --script <name>         Script name in scripts/test-scripts/scheduled/ (default: ScheduledProcessTestHarness)
  --token <guid>          Scheduled process GUID for postCompletion (default: placeholder)
  --skip-completion       Monkey-patch postCompletion to a no-op
  --help                  Show this help

Environment:
  TZ=UTC node run-sp-test.js    Simulate cloud/AWS server timezone
`);
                process.exit(0);
                break;
            default:
                console.error(`Unknown argument: ${args[i]}. Use --help for usage.`);
                process.exit(1);
        }
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

    console.log('Authenticated.\n');

    // Optionally monkey-patch postCompletion
    if (args.skipCompletion) {
        console.log('[SKIP] postCompletion will be intercepted (no-op).\n');
        vvClient.scheduledProcess.postCompletion = function (id, action, result, message) {
            console.log(
                `[SKIP] postCompletion called: id=${id}, action=${action}, result=${result}, message=${message}`
            );
            return Promise.resolve({ meta: { status: 200 }, data: 'skipped' });
        };
    }

    // Mock response to capture output
    const capturedResponses = [];
    const mockResponse = {
        json: (status, data) => {
            capturedResponses.push({ status, data });
            if (capturedResponses.length === 1) {
                console.log(`[ACK] ${typeof data === 'string' ? data : JSON.stringify(data)}`);
            }
        },
    };

    // Load and run script
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'test-scripts', 'scheduled', args.script);
    let script;
    try {
        script = require(scriptPath);
    } catch (err) {
        console.error(`Failed to load script "${args.script}": ${err.message}`);
        process.exit(1);
    }

    console.log(`Running ${args.script}...\n`);

    try {
        await script.main(vvClient, mockResponse, args.token);
    } catch (err) {
        console.error(`Script threw an unhandled error: ${err.message}`);
        process.exit(1);
    }

    // Output results
    console.log('\n--- Results ---');
    for (let i = 0; i < capturedResponses.length; i++) {
        const label = i === 0 ? 'Acknowledgment' : `Response ${i + 1}`;
        const resp = capturedResponses[i];
        console.log(`${label}: ${JSON.stringify(resp, null, 2)}`);
    }

    // Exit with non-zero if the script reported Error status
    const lastResp = capturedResponses[capturedResponses.length - 1];
    if (lastResp && lastResp.data && lastResp.data.status === 'Error') {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(`Runner error: ${err.message}`);
    process.exit(1);
});
