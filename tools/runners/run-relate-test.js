#!/usr/bin/env node

/**
 * Relate/Unrelate API Round-Trip Verification
 *
 * Tests the full lifecycle: create 2 form records → relate → verify → unrelate → verify.
 * Part of research/unrelate-forms/ investigation.
 *
 * Usage:
 *   node tools/runners/run-relate-test.js
 *   node tools/runners/run-relate-test.js --template-name DateTest
 *   node tools/runners/run-relate-test.js --debug
 *
 * Credentials: Reads from root .env.json via testing/fixtures/env-config.js.
 */

const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = { templateName: 'DateTest', debug: false };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--template-name':
                parsed.templateName = args[++i];
                break;
            case '--debug':
                parsed.debug = true;
                break;
            case '--help':
                console.log(`
Relate/Unrelate Round-Trip Test

Options:
  --template-name <name>   Form template to create records on (default: DateTest)
  --debug                  Show full API responses
  --help                   Show this help
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

function parseResponse(res) {
    if (typeof res === 'string') {
        try {
            return JSON.parse(res);
        } catch (e) {
            return res;
        }
    }
    if (res && typeof res === 'object' && typeof res.toJSON === 'function') {
        return JSON.parse(res.toJSON());
    }
    return res;
}

async function main() {
    const args = parseArgs();

    // Load credentials
    const { loadConfig } = require('../../testing/fixtures/env-config');
    let config;
    try {
        config = loadConfig();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    if (config.readOnly) {
        console.error('ERROR: This test requires write access. Current environment is readOnly.');
        process.exit(1);
    }

    // Authenticate
    const clientLibrary = require(path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi'));
    const vvAuthorize = new clientLibrary.authorize();

    console.log(`Authenticating with ${config.instance}...`);

    let vvClient;
    try {
        vvClient = await vvAuthorize.getVaultApi(
            config.clientId,
            config.clientSecret,
            config.username,
            config.password,
            null,
            config.loginUrl,
            config.customerAlias,
            config.databaseAlias
        );
    } catch (err) {
        console.error(`Authentication failed: ${err.message}`);
        process.exit(1);
    }

    console.log('Authenticated.\n');

    const results = {
        steps: [],
        success: false,
    };

    function step(name, data) {
        results.steps.push({ name, ...data });
        const icon = data.ok ? '\u2705' : '\u274C';
        console.log(`${icon} ${name}`);
        if (args.debug && data.response) {
            console.log('   Response:', JSON.stringify(data.response, null, 2));
        }
        if (!data.ok && data.error) {
            console.log(`   Error: ${data.error}`);
        }
    }

    try {
        // Step 1: Create form A
        console.log(`Creating two ${args.templateName} records...\n`);

        const resA = parseResponse(await vvClient.forms.postForms(null, {}, args.templateName));
        const formA = resA?.data?.instanceName;
        const formAId = resA?.data?.revisionId;
        step('Create Form A', {
            ok: !!formAId,
            formName: formA,
            formId: formAId,
            response: args.debug ? resA : undefined,
            error: !formAId ? 'No revisionId in response' : undefined,
        });
        if (!formAId) throw new Error('Cannot continue without Form A');

        // Step 2: Create form B
        const resB = parseResponse(await vvClient.forms.postForms(null, {}, args.templateName));
        const formB = resB?.data?.instanceName;
        const formBId = resB?.data?.revisionId;
        step('Create Form B', {
            ok: !!formBId,
            formName: formB,
            formId: formBId,
            response: args.debug ? resB : undefined,
            error: !formBId ? 'No revisionId in response' : undefined,
        });
        if (!formBId) throw new Error('Cannot continue without Form B');

        console.log(`\nForm A: ${formA} (${formAId})`);
        console.log(`Form B: ${formB} (${formBId})\n`);

        // Step 3: Relate A → B
        const relateRes = parseResponse(await vvClient.forms.relateForm(formAId, formBId));
        const relateOk = relateRes?.meta?.status === '200' || relateRes?.meta?.status === 200;
        step('Relate Form A → Form B', {
            ok: relateOk,
            response: relateRes,
            error: !relateOk ? `Status: ${relateRes?.meta?.status}` : undefined,
        });

        // Step 4: Verify relationship exists
        const relatedBefore = parseResponse(await vvClient.forms.getFormRelatedForms(formAId));
        const relatedIds = (relatedBefore?.data || []).map((f) => f.revisionId || f.id);
        const isRelated = relatedIds.some((id) => id === formBId);
        step('Verify relationship exists', {
            ok: isRelated,
            relatedCount: relatedBefore?.data?.length || 0,
            relatedIds,
            response: args.debug ? relatedBefore : undefined,
            error: !isRelated
                ? `Form B (${formBId}) not found in related forms: [${relatedIds.join(', ')}]`
                : undefined,
        });

        // Step 5: Unrelate A → B
        const unrelateRes = parseResponse(await vvClient.forms.unrelateForm(formAId, formBId));
        const unrelateOk = unrelateRes?.meta?.status === '200' || unrelateRes?.meta?.status === 200;
        step('Unrelate Form A → Form B', {
            ok: unrelateOk,
            response: unrelateRes,
            error: !unrelateOk ? `Status: ${unrelateRes?.meta?.status}` : undefined,
        });

        // Step 6: Verify relationship is gone
        const relatedAfter = parseResponse(await vvClient.forms.getFormRelatedForms(formAId));
        const relatedIdsAfter = (relatedAfter?.data || []).map((f) => f.revisionId || f.id);
        const isUnrelated = !relatedIdsAfter.some((id) => id === formBId);
        step('Verify relationship removed', {
            ok: isUnrelated,
            relatedCount: relatedAfter?.data?.length || 0,
            relatedIdsAfter,
            response: args.debug ? relatedAfter : undefined,
            error: !isUnrelated ? `Form B (${formBId}) still found in related forms after unrelate` : undefined,
        });

        results.success = results.steps.every((s) => s.ok);
    } catch (err) {
        step('Unexpected error', { ok: false, error: err.message });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    const passed = results.steps.filter((s) => s.ok).length;
    const total = results.steps.length;
    console.log(`Result: ${passed}/${total} steps passed — ${results.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log('='.repeat(60));

    process.exit(results.success ? 0 : 1);
}

main();
