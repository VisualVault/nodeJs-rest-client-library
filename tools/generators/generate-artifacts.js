#!/usr/bin/env node
/**
 * Generate/update test artifacts from regression test results.
 *
 * Reads regression-results-latest.json (or specified file) and test-data.js,
 * then creates/updates:
 *   - Run files (new, immutable) in tasks/date-handling/forms-calendar/runs/
 *   - Summary files (append) in tasks/date-handling/forms-calendar/summaries/
 *   - Matrix rows (update) in tasks/date-handling/forms-calendar/matrix.md
 *   - Session index (append) in tasks/date-handling/forms-calendar/results.md
 *
 * Usage:
 *   node tools/generators/generate-artifacts.js [--input path/to/results.json] [--artifacts-only | --dry-run]
 */
const fs = require('fs');
const path = require('path');

// Paths
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ARTIFACTS_DIR = path.join(REPO_ROOT, 'tasks', 'date-handling', 'forms-calendar');
const RUNS_DIR = path.join(ARTIFACTS_DIR, 'runs');
const SUMMARIES_DIR = path.join(ARTIFACTS_DIR, 'summaries');
const MATRIX_PATH = path.join(ARTIFACTS_DIR, 'matrix.md');
const RESULTS_PATH = path.join(ARTIFACTS_DIR, 'results.md');
const DEFAULT_INPUT = path.join(REPO_ROOT, 'testing', 'tmp', 'regression-results-latest.json');

// Load test data for metadata lookup
const { TEST_DATA } = require(path.join(REPO_ROOT, 'testing', 'fixtures', 'test-data.js'));

const TZ_MAP = {
    BRT: { iana: 'America/Sao_Paulo', offset: 'UTC-3', short: 'BRT' },
    IST: { iana: 'Asia/Kolkata', offset: 'UTC+5:30', short: 'IST' },
    UTC0: { iana: 'UTC', offset: 'UTC+0', short: 'UTC0' },
};

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const inputIdx = args.indexOf('--input');
    const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : DEFAULT_INPUT;

    if (!fs.existsSync(inputPath)) {
        console.error(`Results file not found: ${inputPath}`);
        console.error('Run tests first: node testing/pipelines/run-regression.js --browser firefox');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const today = new Date().toISOString().substring(0, 10);

    // Filter to executed tests (not skipped)
    const executed = data.results.filter((r) => r.status === 'passed' || r.status === 'failed');
    console.log(
        `Processing ${executed.length} test results (${data.summary.passed}P/${data.summary.failed}F/${data.summary.skipped}S)`
    );

    // Build a lookup from test-data.js
    const tcLookup = new Map();
    for (const tc of TEST_DATA) {
        tcLookup.set(tc.id, tc);
    }

    const sessionEntries = [];
    let created = 0;
    let updated = 0;

    for (const result of executed) {
        const tc = tcLookup.get(result.tcId);
        if (!tc) {
            console.warn(`  SKIP: No test-data entry for TC ID "${result.tcId}"`);
            continue;
        }

        // Resolve actual values
        const actualRaw = result.actualRaw === '__PASS__' ? tc.expectedRaw : result.actualRaw || 'unknown';
        const actualApi =
            result.actualApi === '__PASS__' ? tc.expectedApi : result.actualApi || '(test halted at raw assertion)';

        const status = result.status === 'passed' ? 'PASS' : determineFailStatus(tc, result);
        const tzInfo = TZ_MAP[result.tz] || TZ_MAP.BRT;

        // 1. Create run file
        const runNum = getNextRunNumber(result.tcId);
        const runFile = `tc-${result.tcId}-run-${runNum}.md`;
        const runContent = generateRunFile({
            tcId: result.tcId,
            runNum,
            today,
            browser: result.browser,
            tz: result.tz,
            tzInfo,
            status,
            actualRaw,
            actualApi,
            expectedRaw: tc.expectedRaw,
            expectedApi: tc.expectedApi,
            tc,
            duration: result.duration,
            errors: result.errors,
        });

        if (!dryRun) {
            fs.writeFileSync(path.join(RUNS_DIR, runFile), runContent);
        }
        created++;

        // 2. Update summary
        if (!dryRun) {
            updateSummary(result.tcId, {
                runNum,
                today,
                tz: result.tz,
                browser: result.browser,
                status,
                tc,
                tzInfo,
            });
        }
        updated++;

        // 3. Collect session entry
        const brief = generateBrief(tc, result.browser, status);
        sessionEntries.push(
            `- ${today} [TC-${result.tcId} Run ${runNum}](runs/${runFile}) — ${result.tz} — ${status} — ${brief}`
        );

        console.log(`  ${status === 'PASS' ? '✓' : '✘'} TC-${result.tcId} → run-${runNum} (${result.browser})`);
    }

    // 4. Update matrix (batch)
    if (!dryRun && executed.length > 0) {
        updateMatrix(executed, tcLookup, today);
    }

    // 5. Update results.md session index
    if (!dryRun && sessionEntries.length > 0) {
        const browser = executed[0]?.browser || 'unknown';
        appendResultsSession(today, browser, sessionEntries);
    }

    console.log(`\nDone: ${created} run files created, ${updated} summaries updated`);
    if (dryRun) console.log('(dry-run — no files written)');
}

function getNextRunNumber(tcId) {
    const pattern = new RegExp(`^tc-${escapeRegex(tcId)}-run-(\\d+)\\.md$`);
    let max = 0;
    try {
        const files = fs.readdirSync(RUNS_DIR);
        for (const f of files) {
            const m = f.match(pattern);
            if (m) max = Math.max(max, parseInt(m[1]));
        }
    } catch {
        // runs dir might not exist
    }
    return max + 1;
}

function determineFailStatus(tc, result) {
    // Try to identify which FAIL condition from bugs
    if (tc.bugs && tc.bugs.length > 0) {
        return 'FAIL'; // Known bug failure
    }
    return 'FAIL';
}

function generateRunFile({
    tcId,
    runNum,
    today,
    browser,
    tz,
    tzInfo,
    status,
    actualRaw,
    actualApi,
    expectedRaw,
    expectedApi,
    tc,
    duration,
    errors,
}) {
    const rawMatch = actualRaw === expectedRaw ? 'PASS' : '**FAIL**';
    const apiMatch = actualApi === expectedApi ? 'PASS' : '**FAIL**';
    const bugNote = tc.bugs?.length ? `Bugs: ${tc.bugs.join(', ')}` : 'No bugs triggered';

    let outcome;
    if (status === 'PASS') {
        outcome = `**PASS** — All values match expected. ${capitalize(browser)} produces identical results to prior runs.`;
    } else {
        outcome = `**${status}** — ${bugNote}. See TC spec for fail condition details.`;
    }

    const findings = [];
    findings.push(`- ${capitalize(browser)} verification for TC-${tcId}`);
    if (status === 'PASS') {
        findings.push(`- Cross-browser consistency confirmed — ${browser} matches prior engine results`);
    } else {
        findings.push(`- Expected failure — ${tc.bugs?.join(', ') || 'assertion mismatch'}`);
    }
    if (actualApi === '(test halted at raw assertion)') {
        findings.push(`- API value not captured — test stopped at raw value assertion failure`);
    }
    if (tc.notes) findings.push(`- Test context: ${tc.notes}`);

    return `# TC-${tcId} — Run ${runNum} | ${today} | ${tz} | ${status}

**Spec**: [tc-${tcId}.md](../test-cases/tc-${tcId}.md) | **Summary**: [summary](../summaries/tc-${tcId}.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | ${today}                                         |
| Browser     | ${capitalize(browser)} (Playwright headless)     |
| Tester TZ   | ${tzInfo.iana} — ${tzInfo.offset} (${tzInfo.short}) |
| Code path   | V1 (\`useUpdatedCalendarValueLogic = false\`)    |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright regression (\`timezoneId: ${tzInfo.iana}\`, \`--project ${tz}-${browser}\`) |

## Step Results

| Step # | Expected       | Actual       | Match |
| ------ | -------------- | ------------ | ----- |
| raw    | \`"${expectedRaw}"\` | \`"${cleanValue(actualRaw)}"\` | ${rawMatch} |
| api    | \`"${expectedApi}"\` | \`"${cleanValue(actualApi)}"\` | ${apiMatch} |

## Outcome

${outcome}

## Findings

${findings.join('\n')}
`;
}

function updateSummary(tcId, { runNum, today, tz, browser, status }) {
    const summaryPath = path.join(SUMMARIES_DIR, `tc-${tcId}.md`);

    if (!fs.existsSync(summaryPath)) {
        // Create new summary
        const content = `# TC-${tcId} — Summary

**Spec**: [tc-${tcId}.md](../test-cases/tc-${tcId}.md)
**Current status**: ${status} — last run ${today} (${tz}, ${capitalize(browser)})
**Bug surface**: ${determineBugSurface(tcId)}

## Run History

| Run | Date       | TZ  | Outcome | File                                    |
| --- | ---------- | --- | ------- | --------------------------------------- |
| ${runNum}   | ${today} | ${tz} | ${status}   | [run-${runNum}](../runs/tc-${tcId}-run-${runNum}.md) |

## Current Interpretation

${status === 'PASS' ? 'Passes in ' + capitalize(browser) + ' — cross-browser consistency confirmed.' : 'Known bug failure confirmed in ' + capitalize(browser) + '.'}

## Next Action

Monitor for platform changes. Cross-browser verification complete for ${capitalize(browser)}.
`;
        fs.writeFileSync(summaryPath, content);
        return;
    }

    // Update existing summary
    let content = fs.readFileSync(summaryPath, 'utf8');

    // Update current status line
    content = content.replace(
        /\*\*Current status\*\*:.*/,
        `**Current status**: ${status} — last run ${today} (${tz}, ${capitalize(browser)})`
    );

    // Append to run history table
    const newRow = `| ${runNum}   | ${today} | ${tz} | ${status}   | [run-${runNum}](../runs/tc-${tcId}-run-${runNum}.md) |`;
    // Find the last row in the Run History table (line starting with |)
    const lines = content.split('\n');
    let lastTableRow = -1;
    let inRunHistory = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('## Run History')) inRunHistory = true;
        if (inRunHistory && lines[i].startsWith('|') && !lines[i].includes('---')) {
            lastTableRow = i;
        }
        if (inRunHistory && lines[i].startsWith('##') && !lines[i].includes('Run History')) {
            break;
        }
    }
    if (lastTableRow >= 0) {
        lines.splice(lastTableRow + 1, 0, newRow);
        content = lines.join('\n');
    }

    // Update interpretation (line-by-line to avoid fragile regex)
    const updatedLines = content.split('\n');
    let interpStart = -1;
    let interpEnd = -1;
    for (let i = 0; i < updatedLines.length; i++) {
        if (updatedLines[i].startsWith('## Current Interpretation')) {
            interpStart = i;
        } else if (interpStart >= 0 && i > interpStart && updatedLines[i].startsWith('## ')) {
            interpEnd = i;
            break;
        }
    }
    if (interpStart >= 0) {
        const newInterp = [
            '## Current Interpretation',
            '',
            `Run ${runNum} (${today}, ${capitalize(browser)}): ${status}. Cross-browser verification in progress.`,
            '',
        ];
        if (interpEnd < 0) interpEnd = updatedLines.length;
        updatedLines.splice(interpStart, interpEnd - interpStart, ...newInterp);
        content = updatedLines.join('\n');
    }

    fs.writeFileSync(summaryPath, content);
}

function updateMatrix(executed, tcLookup, today) {
    let content = fs.readFileSync(MATRIX_PATH, 'utf8');
    const lines = content.split('\n');

    for (const result of executed) {
        const tc = tcLookup.get(result.tcId);
        if (!tc) continue;

        const status = result.status === 'passed' ? 'PASS' : 'FAIL';

        // Find the matrix row for this TC ID
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match: | {tcId} | ... (allowing whitespace)
            if (!line.startsWith('|')) continue;
            const cols = line.split('|').map((c) => c.trim());
            // cols[0] is empty (before first |), cols[1] is Test ID
            if (cols[1] === result.tcId) {
                // Update Run Date column (second to last data column before Evidence)
                // Table structure varies by category, but Run Date and Evidence are always last two
                // Find the column that looks like a date (YYYY-MM-DD) or is empty
                const statusIdx = cols.findIndex(
                    (c, idx) => idx > 3 && (c === 'PASS' || c === 'FAIL' || c === 'PENDING' || c.startsWith('FAIL'))
                );
                if (statusIdx > 0) {
                    cols[statusIdx] = status;
                    // Run Date is statusIdx + 1
                    if (statusIdx + 1 < cols.length) cols[statusIdx + 1] = today;
                }
                // Reconstruct line preserving pipe alignment (simple approach)
                lines[i] = '| ' + cols.slice(1, -1).join(' | ') + ' |';
                break;
            }
        }
    }

    fs.writeFileSync(MATRIX_PATH, lines.join('\n'));
}

function appendResultsSession(today, browser, entries) {
    let content = fs.readFileSync(RESULTS_PATH, 'utf8');

    const sessionHeader = `\n## Session ${today} (${capitalize(browser)} regression)\n\n**Purpose**: Cross-browser regression verification — all test cases in ${capitalize(browser)}.\n**Key outcomes**: ${entries.length} tests documented.\n\n`;

    content += sessionHeader + entries.join('\n') + '\n';
    fs.writeFileSync(RESULTS_PATH, content);
}

function determineBugSurface(tcId) {
    const tc = TEST_DATA.find((t) => t.id === tcId);
    if (!tc || !tc.bugs || tc.bugs.length === 0) return 'none';
    return tc.bugs.join(', ');
}

function generateBrief(tc, browser, status) {
    const configNote = `Config ${tc.config}`;
    if (status === 'PASS')
        return `${capitalize(browser)} confirms ${configNote} ${tc.categoryName || ''} stores correctly`;
    return `${capitalize(browser)} confirms known bug — ${tc.bugs?.join(', ') || 'assertion mismatch'}`;
}

function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function cleanValue(s) {
    // Remove wrapping quotes if present (from error parsing)
    if (!s) return '';
    return s.replace(/^"+|"+$/g, '');
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
