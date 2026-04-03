#!/usr/bin/env node
/**
 * Run WS date-handling regression tests and generate/update test artifacts.
 *
 * Executes all (or scoped) WS test cases via run-ws-test.js, grouped by
 * (action, TZ) to minimize runner invocations. Captures structured JSON
 * results and generates artifacts (run files, summaries, matrix updates).
 *
 * Usage:
 *   node testing/scripts/run-ws-regression.js --tz BRT
 *   node testing/scripts/run-ws-regression.js --action WS-1
 *   node testing/scripts/run-ws-regression.js --action WS-1 --tz IST
 *   node testing/scripts/run-ws-regression.js --artifacts-only
 *   node testing/scripts/run-ws-regression.js --skip-artifacts --tz BRT
 *
 * npm script: npm run test:ws:regression -- --tz BRT
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUNNER_PATH = path.join(REPO_ROOT, 'tasks', 'date-handling', 'web-services', 'run-ws-test.js');
const RESULTS_DIR = path.join(REPO_ROOT, 'testing', 'tmp');
const RESULTS_PATH = path.join(RESULTS_DIR, 'ws-regression-results-latest.json');
const GENERATOR_PATH = path.join(REPO_ROOT, 'testing', 'scripts', 'generate-ws-artifacts.js');

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
    // WS-1: API Write Path — date-only configs use date string, DateTime configs use datetime string
    { action: 'WS-1', tz: 'BRT', configs: 'A,B,E,F', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'BRT', configs: 'C,D,G,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },
    { action: 'WS-1', tz: 'IST', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'IST', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },
    { action: 'WS-1', tz: 'UTC', configs: 'A', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-1', tz: 'UTC', configs: 'C,D,H', inputDate: '2026-03-15T14:30:00', extraArgs: '' },

    // WS-2: API Read — reads existing records (no TZ effect on read)
    { action: 'WS-2', tz: 'BRT', configs: 'ALL', inputDate: '', extraArgs: '--record-id DateTest-000080' },
    { action: 'WS-2', tz: 'IST', configs: 'ALL', inputDate: '', extraArgs: '--record-id DateTest-000084' },

    // WS-3: API Round-Trip — BRT only (TZ independent)
    { action: 'WS-3', tz: 'BRT', configs: 'A,C,D,H', inputDate: '2026-03-15', extraArgs: '' },

    // WS-5: Input Format Tolerance — BRT primary
    { action: 'WS-5', tz: 'BRT', configs: 'A,C,D,H', inputDate: '2026-03-15', extraArgs: '' },

    // WS-6: Empty/Null Handling — BRT primary
    { action: 'WS-6', tz: 'BRT', configs: 'A,C,D,H', inputDate: '', extraArgs: '' },

    // WS-7: API Update Path — BRT primary
    { action: 'WS-7', tz: 'BRT', configs: 'A,C,D,H', inputDate: '2026-03-15', extraArgs: '' },

    // WS-8: Query Date Filtering — BRT primary
    { action: 'WS-8', tz: 'BRT', configs: 'A,C,D,H', inputDate: '2026-03-15', extraArgs: '' },

    // WS-9: Date Computation — needs multiple TZs
    { action: 'WS-9', tz: 'BRT', configs: 'A,C,D,H', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-9', tz: 'IST', configs: 'A,C,D,H', inputDate: '2026-03-15', extraArgs: '' },
    { action: 'WS-9', tz: 'UTC', configs: 'A,C,D,H', inputDate: '2026-03-15', extraArgs: '' },
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
        fs.mkdirSync(RESULTS_DIR, { recursive: true });

        for (const inv of invocations) {
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
                console.log(`  → ${entries.length} results captured\n`);
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
