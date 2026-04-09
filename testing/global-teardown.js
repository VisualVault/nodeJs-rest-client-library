/**
 * Playwright global teardown — flushes write audit log after all tests complete.
 *
 * Writes the accumulated write-policy audit entries to testing/config/write-audit.json.
 * This file is gitignored and useful for post-run review of what writes occurred.
 */
const fs = require('fs');
const path = require('path');

const AUDIT_PATH = path.join(__dirname, 'config', 'write-audit.json');

module.exports = async function globalTeardown() {
    try {
        const { getWriteLog } = require('./fixtures/write-policy');
        const log = getWriteLog();

        if (log.length > 0) {
            fs.writeFileSync(AUDIT_PATH, JSON.stringify(log, null, 2));
            console.log(`\nWrite audit: ${log.length} entries written to ${AUDIT_PATH}`);
        }
    } catch {
        // write-policy may not have been loaded (e.g., config error) — skip silently
    }
};
