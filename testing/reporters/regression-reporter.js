/**
 * Custom Playwright reporter that captures regression test results
 * with actual values for artifact generation.
 *
 * For PASSED tests: actual values = expected values (by definition).
 * For FAILED tests: parses "Received:" from assertion errors.
 * For SKIPPED tests: recorded but excluded from artifact generation.
 *
 * Output: testing/tmp/regression-results-{timestamp}.json
 *
 * Usage in playwright.config.js or CLI:
 *   --reporter=./testing/reporters/regression-reporter.js,list
 */
const fs = require('fs');
const path = require('path');

const BUILD_CONTEXT_PATH = path.join(__dirname, '..', 'config', 'build-context.json');

class RegressionReporter {
    constructor(options = {}) {
        this.results = [];
        this.outputDir = options.outputDir || path.join(__dirname, '..', 'tmp');
        this.startTime = null;
        this.buildContext = null;
    }

    onBegin(config, suite) {
        this.startTime = new Date().toISOString();
        fs.mkdirSync(this.outputDir, { recursive: true });

        // Load build context captured by global-setup
        try {
            if (fs.existsSync(BUILD_CONTEXT_PATH)) {
                this.buildContext = JSON.parse(fs.readFileSync(BUILD_CONTEXT_PATH, 'utf8'));
            }
        } catch {
            // Non-fatal — report works without build context
        }
    }

    onTestEnd(test, result) {
        // Parse TC ID from test title chain: "TC-{id}: Category, Config X > action"
        const tcId = this._extractTcId(test);
        if (!tcId) return; // Skip tests without TC ID pattern

        const projectName = test.parent?.project()?.name || 'unknown';
        const [tz, browser] = projectName.includes('-') ? projectName.split('-') : [projectName, 'unknown'];

        const entry = {
            tcId,
            project: projectName,
            browser,
            tz,
            status: result.status, // 'passed', 'failed', 'skipped', 'timedOut'
            duration: result.duration,
            actualRaw: null,
            actualApi: null,
            errors: [],
        };

        if (result.status === 'passed') {
            // For passed tests, actual = expected. We'll look up expected from test-data.js
            // in the artifact generator. Mark as "from-pass" so generator knows.
            entry.actualRaw = '__PASS__';
            entry.actualApi = '__PASS__';
        } else if (result.status === 'failed') {
            // Parse actual values from assertion errors
            const parsed = this._parseAssertionErrors(result.errors || []);
            entry.actualRaw = parsed.raw;
            entry.actualApi = parsed.api;
            entry.errors = (result.errors || []).map((e) => e.message?.substring(0, 500));
        }

        // Check for annotations (if spec files add them)
        const annotations = result.annotations || [];
        for (const ann of annotations) {
            if (ann.type === 'actualRaw' && ann.description) {
                entry.actualRaw = ann.description;
            }
            if (ann.type === 'actualApi' && ann.description) {
                entry.actualApi = ann.description;
            }
        }

        this.results.push(entry);
    }

    onEnd(result) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const outputPath = path.join(this.outputDir, `regression-results-${timestamp}.json`);
        // Also write to a stable "latest" path for easy access
        const latestPath = path.join(this.outputDir, 'regression-results-latest.json');

        const output = {
            timestamp: this.startTime,
            completed: new Date().toISOString(),
            duration: result.duration,
            status: result.status,
            buildContext: this.buildContext,
            summary: {
                total: this.results.length,
                passed: this.results.filter((r) => r.status === 'passed').length,
                failed: this.results.filter((r) => r.status === 'failed').length,
                skipped: this.results.filter((r) => r.status === 'skipped').length,
                timedOut: this.results.filter((r) => r.status === 'timedOut').length,
            },
            results: this.results,
        };

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        fs.writeFileSync(latestPath, JSON.stringify(output, null, 2));
    }

    /**
     * Extract TC ID from the test's describe chain.
     * Pattern: "TC-{id}: ..." in the parent describe block.
     */
    _extractTcId(test) {
        let current = test.parent;
        while (current) {
            const match = current.title?.match(/^TC-(.+?):/);
            if (match) return match[1];
            current = current.parent;
        }
        // Fallback: check test title itself
        const titleMatch = test.title?.match(/TC-(.+?)[\s:]/);
        return titleMatch ? titleMatch[1] : null;
    }

    /**
     * Parse assertion errors to extract actual ("Received") values.
     *
     * Playwright's expect().toBe() produces errors like:
     *   Expected: "2026-03-15T00:00:00"
     *   Received: "2026-03-15T03:00:00.000Z"
     *
     * The first assertion in each spec is typically `expect(values.raw).toBe(tc.expectedRaw)`,
     * the second is `expect(values.api).toBe(tc.expectedApi)`.
     */
    _parseAssertionErrors(errors) {
        const result = { raw: null, api: null };
        if (!errors.length) return result;

        // Collect all "Received:" values from all errors
        const receivedValues = [];
        for (const err of errors) {
            const msg = err.message || '';
            // Clean ANSI codes first
            // eslint-disable-next-line no-control-regex
            const cleanMsg = msg.replace(/\x1b\[[0-9;]*m/g, '');
            // Match Received: "value" (with or without quotes)
            const matches = cleanMsg.match(/Received:\s*"(.*?)"\s*$/m);
            if (matches) {
                receivedValues.push(matches[1]);
            } else {
                // Fallback: unquoted value
                const fallback = cleanMsg.match(/Received:\s*(.+?)\s*$/m);
                if (fallback) receivedValues.push(fallback[1].trim());
            }
        }

        // First received value is typically raw, second is api
        if (receivedValues.length >= 1) result.raw = receivedValues[0];
        if (receivedValues.length >= 2) result.api = receivedValues[1];

        // If only one error (test stopped at first assertion), raw failed but api unknown
        // The artifact generator handles this case
        return result;
    }
}

module.exports = RegressionReporter;
