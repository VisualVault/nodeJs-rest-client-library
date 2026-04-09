#!/usr/bin/env node
/**
 * Run WS date-handling regression tests and generate/update test artifacts.
 *
 * Executes all (or scoped) WS test cases via run-ws-test.js, grouped by
 * (action, TZ) to minimize runner invocations. Captures structured JSON
 * results and generates artifacts (run files, summaries, matrix updates).
 *
 * Usage:
 *   node testing/pipelines/run-ws-regression.js --tz BRT
 *   node testing/pipelines/run-ws-regression.js --action WS-1
 *   node testing/pipelines/run-ws-regression.js --action WS-1 --tz IST
 *   node testing/pipelines/run-ws-regression.js --artifacts-only
 *   node testing/pipelines/run-ws-regression.js --skip-artifacts --tz BRT
 *
 * npm script: npm run test:ws:regression -- --tz BRT
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUNNER_PATH = path.join(REPO_ROOT, 'tools', 'runners', 'run-ws-test.js');
const RESULTS_DIR = path.join(REPO_ROOT, 'testing', 'tmp');
const RESULTS_PATH = path.join(RESULTS_DIR, 'ws-regression-results-latest.json');
const GENERATOR_PATH = path.join(REPO_ROOT, 'tools', 'generators', 'generate-ws-artifacts.js');

// TZ mapping
const TZ_ENV = {
    BRT: 'America/Sao_Paulo',
    IST: 'Asia/Calcutta',
    UTC: 'UTC',
    UTC0: 'UTC',
};

/**
 * Define all regression test invocations.
 * Each entry is one call to run-ws-test.js with specific args.
 * Multiple test slots may be covered by one invocation (--configs ALL).
 */
const TEST_INVOCATIONS = [
    // ═══════════════════════════════════════════════════════════════
    // WS-1: API Write Path (Create) — 16 slots
    // Date-only configs (A,B,E,F) use date string, DateTime (C,D,G,H) use datetime
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-1', tz: 'BRT', configs: 'A,B,E,F', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'BRT', configs: 'C,D,G,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },
    { action: 'WS-1', tz: 'IST', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'IST', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },
    { action: 'WS-1', tz: 'UTC', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'UTC', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-2: API Read + Cross-Layer — 16 slots
    // Reads records created by WS-1 in this run. If WS-1 didn't run,
    // WS-2 is skipped (no record ID available).
    // Record IDs are injected dynamically — see resolveRecordIds().
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-2', tz: 'BRT', configs: 'ALL', inputDate: '', extraArgs: '', needsRecordId: true },
    { action: 'WS-2', tz: 'IST', configs: 'ALL', inputDate: '', extraArgs: '', needsRecordId: true },

    // ═══════════════════════════════════════════════════════════════
    // WS-3: API Round-Trip — 4 slots
    // Write, read back, write read-back, read again. BRT only (TZ independent).
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-3', tz: 'BRT', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-3', tz: 'BRT', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-4: API→Forms Cross-Layer — 10 slots — SKIPPED
    // Requires browser verification (Playwright/Chrome MCP). Not runnable
    // via run-ws-test.js alone. Use /@-test-ws-date-pw for these.
    // ═══════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════
    // WS-5: Input Format Tolerance — 35 slots
    // Harness iterates format variants internally. Configs A and C.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-5', tz: 'BRT', configs: 'A,C', inputDate: '2026-03-15', extraArgs: '' },
    // Config D tested separately for .NET and epoch formats
    { action: 'WS-5', tz: 'BRT', configs: 'D', inputDate: '2026-03-15', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-6: Empty/Null Handling — 12 slots
    // Tests empty, null, "null", "Invalid Date", field omission, clear-via-update.
    // Configs A and D.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-6', tz: 'BRT', configs: 'A,D', inputDate: '', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-7: API Update Path — 12 slots
    // Change, preserve, and add scenarios. Configs A,C,D,H.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-7', tz: 'BRT', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-7', tz: 'BRT', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-8: Query Date Filtering — 10 slots
    // OData q= parameter tests. Requires WS-1 records to exist.
    // Configs A and C.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-8', tz: 'BRT', configs: 'A,C', inputDate: '2026-03-15', extraArgs: '' },

    // ═══════════════════════════════════════════════════════════════
    // WS-9: Date Computation in Scripts — 23 slots
    // Tests JS Date patterns across server TZs. Config A primary + one C.
    // Harness iterates computation patterns internally per TZ.
    // ═══════════════════════════════════════════════════════════════
    { action: 'WS-9', tz: 'BRT', configs: 'A,C', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-9', tz: 'IST', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-9', tz: 'UTC', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
];

function main() {
    const args = process.argv.slice(2);
    const artifactsOnly = args.includes('--artifacts-only');
    const skipArtifacts = args.includes('--skip-artifacts');

    // Scope filters
    const actionIdx = args.indexOf('--action');
    const actionFilter = actionIdx >= 0 ? args[actionIdx + 1] : null;
    const tzIdx = args.indexOf('--tz');
    const tzFilter = tzIdx >= 0 ? args[tzIdx + 1]?.toUpperCase() : null;

    if (!artifactsOnly) {
        // Filter invocations by scope
        let invocations = TEST_INVOCATIONS;
        if (actionFilter) {
            invocations = invocations.filter((i) => i.action === actionFilter);
        }
        if (tzFilter) {
            invocations = invocations.filter((i) => i.tz === tzFilter || i.tz === tzFilter.replace('0', ''));
        }

        if (invocations.length === 0) {
            console.error('No matching test invocations. Check --action and --tz filters.');
            console.error('Available actions: WS-1 through WS-9');
            console.error('Available TZs: BRT, IST, UTC');
            process.exit(1);
        }

        console.log(`\n=== Phase 1: Running ${invocations.length} WS test invocations ===\n`);

        const allResults = [];
        // Track record IDs created by WS-1 for use by WS-2 (dynamic, no hardcoded IDs)
        const createdRecords = {}; // { BRT: 'DateTest-NNNNNN', IST: '...', UTC: '...' }
        fs.mkdirSync(RESULTS_DIR, { recursive: true });

        for (const inv of invocations) {
            // WS-2 needs a record ID from a prior WS-1 run
            if (inv.needsRecordId) {
                const recordId = createdRecords[inv.tz];
                if (!recordId) {
                    console.log(
                        `  SKIP ${inv.action} ${inv.tz} — no record ID available (WS-1 for ${inv.tz} did not run or failed)\n`
                    );
                    continue;
                }
                inv.extraArgs = `--record-id ${recordId}`;
            }

            const tzEnv = TZ_ENV[inv.tz] || 'UTC';
            const cmdParts = [`TZ=${tzEnv}`, 'node', RUNNER_PATH, `--action ${inv.action}`, `--configs ${inv.configs}`];
            if (inv.inputDate) cmdParts.push(`--input-date ${inv.inputDate}`);
            if (inv.extraArgs) cmdParts.push(inv.extraArgs);

            const cmd = cmdParts.join(' ');
            console.log(`> ${cmd}`);

            try {
                const output = execSync(cmd, {
                    cwd: REPO_ROOT,
                    encoding: 'utf8',
                    timeout: 60_000,
                    env: { ...process.env, TZ: tzEnv },
                });

                // Extract JSON from output (runner prints auth logs before JSON)
                // Find the outermost { ... } that starts a valid JSON object
                const firstBrace = output.indexOf('\n{');
                if (firstBrace < 0) {
                    console.error(`  No JSON found in output: ${output.substring(0, 200)}`);
                    allResults.push({
                        action: inv.action,
                        tz: inv.tz,
                        config: 'ALL',
                        status: 'error',
                        error: 'No JSON in output',
                    });
                    continue;
                }
                const jsonStr = output.substring(firstBrace).trim();
                const result = JSON.parse(jsonStr);
                const entries = (result.data?.results || []).map((r) => ({
                    action: inv.action,
                    tz: inv.tz,
                    config: r.config,
                    fieldName: r.fieldName,
                    sent: r.sent,
                    stored: r.stored,
                    returned: r.returned,
                    // Harness match is strict (sent vs stored); for regression we
                    // record the actual stored value — status is determined by the
                    // artifact generator comparing against matrix Expected values.
                    // For now, mark as 'executed' and let stored be the actual.
                    match: r.match,
                    status: 'executed',
                    serverTime: result.data?.serverTime,
                    serverTimezone: result.data?.serverTimezone,
                    // WS-5/9 may have extra fields
                    format: r.format,
                    variant: r.variant || r.pattern,
                    error: r.error,
                }));

                allResults.push(...entries);

                // Track record IDs created by WS-1 for downstream WS-2 use
                if (inv.action === 'WS-1' && result.data?.recordID) {
                    createdRecords[inv.tz] = result.data.recordID;
                    console.log(`  → ${entries.length} results captured (record: ${result.data.recordID})\n`);
                } else {
                    console.log(`  → ${entries.length} results captured\n`);
                }
            } catch (err) {
                console.error(`  ERROR: ${err.message?.substring(0, 200)}\n`);
                allResults.push({
                    action: inv.action,
                    tz: inv.tz,
                    config: 'ALL',
                    status: 'error',
                    error: err.message?.substring(0, 500),
                });
            }
        }

        // Save results
        const output = {
            timestamp: new Date().toISOString(),
            summary: {
                total: allResults.length,
                executed: allResults.filter((r) => r.status === 'executed').length,
                errors: allResults.filter((r) => r.status === 'error').length,
            },
            results: allResults,
        };

        fs.writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));
        console.log(`Results saved: ${RESULTS_PATH}`);
        console.log(
            `Summary: ${output.summary.total} total — ${output.summary.executed} executed / ${output.summary.errors} errors`
        );
    }

    if (skipArtifacts) {
        console.log('\n--skip-artifacts: skipping artifact generation');
        return;
    }

    // Phase 2: Generate artifacts
    console.log('\n=== Phase 2: Generating artifacts ===\n');

    try {
        execSync(`node ${GENERATOR_PATH}`, {
            cwd: REPO_ROOT,
            stdio: 'inherit',
        });
    } catch (err) {
        console.error('Artifact generation failed:', err.message);
        process.exit(1);
    }

    console.log('\n=== Done ===');
}

main();
