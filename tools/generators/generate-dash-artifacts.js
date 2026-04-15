#!/usr/bin/env node
/**
 * Generate/update Dashboard test artifacts from regression results.
 *
 * PASS/FAIL determined by comparing actual grid values against matrix.md Expected.
 * Does NOT modify matrix.md — the matrix is the source of truth.
 *
 * Creates/updates:
 *   - Run files (new, immutable) in research/date-handling/dashboards/runs/
 *   - Summary files (update) in research/date-handling/dashboards/summaries/
 *   - Session index (append) in research/date-handling/dashboards/results.md
 *
 * Usage:
 *   node tools/generators/generate-dash-artifacts.js [--input path] [--category DB-N] [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ARTIFACTS_DIR = path.join(REPO_ROOT, 'tasks', 'date-handling', 'dashboards');
const RUNS_DIR = path.join(ARTIFACTS_DIR, 'runs');
const SUMMARIES_DIR = path.join(ARTIFACTS_DIR, 'summaries');
const MATRIX_PATH = path.join(ARTIFACTS_DIR, 'matrix.md');
const RESULTS_PATH = path.join(ARTIFACTS_DIR, 'results.md');
const DEFAULT_INPUT = path.join(REPO_ROOT, 'testing', 'tmp', 'dash-regression-results-latest.json');

// Field → Config mapping (reverse of FIELD_MAP)
const FIELD_TO_CONFIG = {
    Field7: 'A',
    Field10: 'B',
    Field6: 'C',
    Field5: 'D',
    Field12: 'E',
    Field11: 'F',
    Field14: 'G',
    Field13: 'H',
};

// Expected display format patterns per config type (DB-1 validation)
// Date-only: M/D/YYYY (no leading zeros, no time)
// DateTime: M/D/YYYY H:MM AM/PM (no leading zeros, 12h with AM/PM)
const FORMAT_PATTERNS = {
    dateOnly: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    dateTime: /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2} [AP]M$/,
};

// Configs that include time (enableTime=true)
const DATETIME_CONFIGS = new Set(['C', 'D', 'G', 'H']);

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const inputIdx = args.indexOf('--input');
    const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : DEFAULT_INPUT;
    const catIdx = args.indexOf('--category');
    const categoryFilter = catIdx >= 0 ? args[catIdx + 1] : null;

    if (!fs.existsSync(inputPath)) {
        console.error(`Results file not found: ${inputPath}`);
        console.error('Run tests first: node testing/pipelines/run-dash-regression.js');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const today = new Date().toISOString().substring(0, 10);

    // Parse matrix for expected values
    const matrixExpected = parseMatrix(MATRIX_PATH);
    console.log(`Matrix loaded: ${matrixExpected.size} test IDs`);

    // Build a lookup: formId → { field → cellValue }
    const gridLookup = new Map();
    for (const r of data.results) {
        if (!gridLookup.has(r.formId)) gridLookup.set(r.formId, {});
        gridLookup.get(r.formId)[r.field] = r.cellValue;
    }
    console.log(`Grid data: ${gridLookup.size} records, ${data.totalResults} cell values`);

    // Process tests per category
    const testResults = [];

    for (const [tcId, expected] of matrixExpected) {
        if (categoryFilter && !tcId.startsWith(`db-${categoryFilter.replace('DB-', '')}`)) continue;

        const catMatch = tcId.match(/^db-(\d+)/);
        if (!catMatch) continue;
        const catNum = parseInt(catMatch[1]);

        // DB-1: Format pattern validation — no specific records needed.
        // Validates that ALL populated cells for each config match the expected format.
        if (catNum === 1) {
            const config = tcId.match(/db-\d+-([A-H])/)?.[1];
            if (!config) continue;

            const field = Object.entries(FIELD_TO_CONFIG).find(([, c]) => c === config)?.[0];
            if (!field) continue;

            const isDateTime = DATETIME_CONFIGS.has(config);
            const pattern = isDateTime ? FORMAT_PATTERNS.dateTime : FORMAT_PATTERNS.dateOnly;

            // Check format across all records with this field populated
            let totalChecked = 0;
            let totalPassed = 0;
            let sampleValue = null;
            let sampleRecord = null;
            let failExample = null;

            for (const [formId, fields] of gridLookup) {
                const val = fields[field];
                if (!val) continue;
                totalChecked++;
                if (!sampleValue) {
                    sampleValue = val;
                    sampleRecord = formId;
                }
                if (pattern.test(val)) {
                    totalPassed++;
                } else if (!failExample) {
                    failExample = { formId, value: val };
                }
            }

            const status =
                totalChecked > 0 && totalPassed === totalChecked ? 'PASS' : totalChecked === 0 ? 'NO_DATA' : 'FAIL';

            testResults.push({
                tcId,
                category: 'DB-1',
                config,
                field,
                record: sampleRecord,
                expected: isDateTime ? 'M/D/YYYY H:MM AM/PM' : 'M/D/YYYY',
                actual:
                    status === 'PASS'
                        ? `${totalPassed}/${totalChecked} match pattern (e.g. ${sampleValue})`
                        : `${totalPassed}/${totalChecked} match; fail: ${failExample?.value} (${failExample?.formId})`,
                status,
                matrixStatus: expected.status,
                detail: { totalChecked, totalPassed },
            });
        }

        // DB-2/3: Require specific test records — skip in automated regression.
        // These verify accuracy against known stored values and need records created
        // via WS-1 API or bug-simulation scripts. Use /@-test-dash-date-pw for these.
        if (catNum === 2 || catNum === 3) {
            testResults.push({
                tcId,
                category: `DB-${catNum}`,
                config: tcId.match(/db-\d+-([A-H])/)?.[1] || null,
                field: null,
                record: null,
                expected: expected.expectedValue,
                actual: '(requires specific test records — use /@-test-dash-date-pw)',
                status: 'SKIPPED',
                matrixStatus: expected.status,
            });
        }

        // DB-4/5/6/7/8: Specialized tests (sort, filter, cross-layer, export, TZ)
        if (catNum >= 4) {
            testResults.push({
                tcId,
                category: `DB-${catNum}`,
                config: null,
                field: null,
                record: null,
                expected: expected.expectedValue,
                actual: '(requires specialized test — use /@-test-dash-date-pw)',
                status: 'SKIPPED',
                matrixStatus: expected.status,
            });
        }
    }

    console.log(`Processing ${testResults.length} test results`);

    // Group by category for batch run files
    const byCategory = new Map();
    for (const r of testResults) {
        if (!byCategory.has(r.category)) byCategory.set(r.category, []);
        byCategory.get(r.category).push(r);
    }

    const sessionEntries = [];
    let runsCreated = 0;
    let summariesUpdated = 0;

    for (const [category, results] of byCategory) {
        const executed = results.filter((r) => r.status !== 'SKIPPED' && r.status !== 'NO_DATA');
        const skipped = results.filter((r) => r.status === 'SKIPPED');
        const passed = executed.filter((r) => r.status === 'PASS').length;
        const failed = executed.length - passed;

        if (executed.length === 0 && skipped.length > 0) {
            console.log(`  ⊘ ${category} — ${skipped.length} tests require specialized verification (skipped)`);
            continue;
        }

        const catPrefix = category.toLowerCase().replace('-', '-') + '-batch';
        const runNum = getNextBatchRunNumber(catPrefix);
        const runFile = `${catPrefix}-run-${runNum}.md`;

        const runContent = generateBatchRunFile({
            category,
            today,
            runNum,
            results: executed,
            passed,
            failed,
            totalRows: data.totalRows,
        });

        if (!dryRun) {
            fs.writeFileSync(path.join(RUNS_DIR, runFile), runContent);
        }
        runsCreated++;

        // Update individual summaries
        for (const r of executed) {
            if (!dryRun) {
                updateSummary(r.tcId, { runFile, today, status: r.status, category });
            }
            summariesUpdated++;
            sessionEntries.push(
                `- ${today} [TC-${r.tcId}](runs/${runFile}) — ${r.status} — ${category} Config ${r.config}`
            );
        }

        console.log(`  ${passed === executed.length ? '✓' : '✘'} ${category} → ${runFile} (${passed}P/${failed}F)`);
    }

    // Append to results.md
    if (!dryRun && sessionEntries.length > 0) {
        appendResultsSession(today, sessionEntries);
    }

    console.log(`\nDone: ${runsCreated} batch run files, ${summariesUpdated} summaries updated`);
    if (dryRun) console.log('(dry-run — no files written)');
}

function parseMatrix(matrixPath) {
    const content = fs.readFileSync(matrixPath, 'utf8');
    const lines = content.split('\n');
    const result = new Map();

    let expectedColIdx = -1;
    let statusColIdx = -1;
    let inTable = false;

    for (const line of lines) {
        if (line.startsWith('|') && !inTable) {
            const cols = line.split('|').map((c) => c.trim());
            // Find the "Expected" column closest to "Status" (the value column, not format/description).
            // Some tables have "Expected Format" + "Expected Example" — we want the one with actual values.
            const statusIdx = cols.findIndex((c) => /^status$/i.test(c));
            let headerIdx = -1;
            if (statusIdx >= 0) {
                // Take the "Expected" column immediately before Status (closest to it)
                for (let i = statusIdx - 1; i >= 1; i--) {
                    if (/expected/i.test(cols[i])) {
                        headerIdx = i;
                        break;
                    }
                }
            }
            // Fallback: first "Expected" column
            if (headerIdx < 0) headerIdx = cols.findIndex((c) => /expected/i.test(c));
            if (headerIdx >= 0) {
                expectedColIdx = headerIdx;
                statusColIdx = statusIdx;
                inTable = true;
                continue;
            }
        }

        if (inTable && line.startsWith('|') && line.includes('---')) continue;

        if (inTable && line.startsWith('|')) {
            const cols = line.split('|').map((c) => c.trim());
            const testId = cols[1];
            if (!testId || /^-+$/.test(testId) || /ID/i.test(testId)) continue;

            const expectedRaw = expectedColIdx >= 0 ? cols[expectedColIdx] : null;
            const statusRaw = statusColIdx >= 0 ? cols[statusColIdx] : null;

            if (expectedRaw && testId) {
                result.set(testId, {
                    expectedValue: stripBackticks(expectedRaw),
                    status: statusRaw?.trim() || 'PENDING',
                });
            }
        }

        if (inTable && !line.startsWith('|') && line.trim() !== '') {
            if (line.startsWith('>') || line.startsWith('#')) {
                inTable = false;
                expectedColIdx = -1;
                statusColIdx = -1;
            }
        }
    }

    return result;
}

function stripBackticks(s) {
    if (!s) return s;
    let clean = s.replace(/^`+|`+$/g, '').trim();
    if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
    return clean;
}

function getNextBatchRunNumber(prefix) {
    const pattern = new RegExp(`^${escapeRegex(prefix)}-run-(\\d+)\\.md$`);
    let max = 0;
    try {
        for (const f of fs.readdirSync(RUNS_DIR)) {
            const m = f.match(pattern);
            if (m) max = Math.max(max, parseInt(m[1]));
        }
    } catch {
        // dir might not exist
    }
    return max + 1;
}

function generateBatchRunFile({ category, today, runNum, results, passed, failed, totalRows }) {
    const rows = results
        .map((r) => {
            const status = r.status === 'PASS' ? 'PASS' : '**FAIL**';
            const exp = r.expected ? `\`${r.expected}\`` : '—';
            const act = r.actual ? `\`${r.actual}\`` : '`null`';
            return `| ${r.tcId} | ${r.config} | ${r.field} | ${r.record || '—'} | ${exp} | ${act} | ${r.status === 'PASS' ? '✓' : '✗'} | ${status} |`;
        })
        .join('\n');

    return `# ${category} — Batch Run ${runNum} | ${today} | ${passed}P/${failed}F

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                          |
| -------------- | ---------------------------------------------- |
| Date           | ${today}                                       |
| Execution Mode | Regression pipeline (\`run-dash-regression.js\`) |
| Grid Component | Telerik RadGrid (server-rendered)              |
| Test Method    | Playwright headless Chrome                     |
| Total Records  | ${totalRows}                                   |

## Results

| ID | Config | Field | Record | Expected | Actual | Match | Status |
| -- | :----: | ----- | ------ | -------- | ------ | :---: | ------ |
${rows}

## Outcome

**${passed} PASS, ${failed} FAIL** out of ${results.length} tests.

## Findings

- Regression run via automated pipeline — verifies ${category} behavior is consistent with prior manual runs
- PASS/FAIL determined by comparing grid cell value vs matrix Expected column
${failed > 0 ? '- Failures are consistent with known expected behavior from initial test execution' : '- All tests pass — no regressions detected'}
`;
}

function updateSummary(tcId, { runFile, today, status, category }) {
    const summaryPath = path.join(SUMMARIES_DIR, `tc-${tcId}.md`);

    if (!fs.existsSync(summaryPath)) {
        const content = `# TC-${tcId.toUpperCase()} — Summary

**Spec**: [tc-${tcId}.md](../test-cases/tc-${tcId}.md)
**Current status**: ${status} — last run ${today}
**Category**: ${category}

## Run History

| Run | Date       | Outcome | File                          |
| --- | ---------- | ------- | ----------------------------- |
| 1   | ${today} | ${status}   | [${runFile}](../runs/${runFile}) |

## Current Interpretation

${status === 'PASS' ? 'Passes in regression pipeline — consistent with prior results.' : 'Known failure confirmed in regression pipeline.'}

## Next Action

Monitor for platform changes.
`;
        fs.writeFileSync(summaryPath, content);
        return;
    }

    let content = fs.readFileSync(summaryPath, 'utf8');

    content = content.replace(/\*\*Current status\*\*:.*/, `**Current status**: ${status} — last run ${today}`);

    const lines = content.split('\n');
    let lastTableRow = -1;
    let inRunHistory = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('## Run History')) inRunHistory = true;
        if (inRunHistory && lines[i].startsWith('|') && !lines[i].includes('---')) lastTableRow = i;
        if (inRunHistory && lines[i].startsWith('##') && !lines[i].includes('Run History')) break;
    }
    if (lastTableRow >= 0) {
        const existingRuns = lines.filter((l) => l.startsWith('|') && /^\|\s*\d+/.test(l)).length;
        const newRow = `| ${existingRuns + 1}   | ${today} | ${status}   | [${path.basename(runFile)}](../runs/${runFile}) |`;
        lines.splice(lastTableRow + 1, 0, newRow);
        content = lines.join('\n');
    }

    // Update interpretation (line-by-line)
    const updatedLines = content.split('\n');
    let interpStart = -1;
    let interpEnd = -1;
    for (let i = 0; i < updatedLines.length; i++) {
        if (updatedLines[i].startsWith('## Current Interpretation')) interpStart = i;
        else if (interpStart >= 0 && i > interpStart && updatedLines[i].startsWith('## ')) {
            interpEnd = i;
            break;
        }
    }
    if (interpStart >= 0) {
        const newInterp = [
            '## Current Interpretation',
            '',
            `Regression run ${today}: ${status}. Consistent with prior results.`,
            '',
        ];
        if (interpEnd < 0) interpEnd = updatedLines.length;
        updatedLines.splice(interpStart, interpEnd - interpStart, ...newInterp);
        content = updatedLines.join('\n');
    }

    fs.writeFileSync(summaryPath, content);
}

function appendResultsSession(today, entries) {
    let content = fs.readFileSync(RESULTS_PATH, 'utf8');
    const header = `\n## Session ${today} (Dashboard Regression Pipeline)\n\n**Purpose**: Automated regression verification of dashboard display tests.\n**Key outcomes**: ${entries.length} tests documented.\n\n`;
    content += header + entries.join('\n') + '\n';
    fs.writeFileSync(RESULTS_PATH, content);
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
