/* global document */
/**
 * Dashboard export test v1 — Downloads Excel, Word, and XML exports
 * and compares date values against the grid display.
 *
 * Usage:
 *   node tasks/date-handling/dashboards/test-export-v1.js [--format excel|word|xml|all] [--record DateTest-NNNNNN]
 *
 * Options:
 *   --format   Export format to test (default: all)
 *   --record   Specific record to compare (default: first 5 records with date data)
 *
 * Prerequisites:
 *   - testing/config/auth-state-pw.json must exist (run any Playwright test or global-setup first)
 *
 * How exports work:
 *   - VV dashboard uses Telerik RadGrid. Export buttons are inside a collapsible dock panel.
 *   - The dock panel (dockExport) starts with display:none — script forces it visible.
 *   - Excel export: .xls file but actually HTML table (common Telerik pattern)
 *   - Word export: .doc file but actually HTML table
 *   - XML export: proper XML with <VisualVault><DateTest> elements, field names use _x0020_ for spaces
 *   - All exports use __doPostBack server round-trip → Content-Disposition attachment → browser download
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', '..', 'testing', 'config', 'auth-state-pw.json');
const DASHBOARD_URL =
    'https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';

const DATE_FIELDS = [
    'Field1',
    'Field2',
    'Field5',
    'Field6',
    'Field7',
    'Field10',
    'Field11',
    'Field12',
    'Field13',
    'Field14',
    'Field15',
    'Field16',
    'Field17',
    'Field18',
    'Field19',
    'Field20',
    'Field21',
    'Field22',
    'Field23',
    'Field24',
    'Field25',
    'Field26',
    'Field27',
    'Field28',
];

// --- Grid capture ---

async function captureGridData(page, filterRecord, limit) {
    return await page.evaluate(
        ({ fields, filterRecord, limit }) => {
            const headerCells = [];
            document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
                const link = th.querySelector('a');
                headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
            });

            const rows = [];
            let count = 0;
            document
                .querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow')
                .forEach((tr) => {
                    if (limit && count >= limit) return;
                    const cells = {};
                    let formId = '';
                    tr.querySelectorAll('td').forEach((td, j) => {
                        const header = headerCells[j];
                        const text = td.textContent.trim();
                        if (header === 'Form ID') formId = text;
                        if (fields.includes(header)) cells[header] = text || '';
                    });
                    if (filterRecord && formId !== filterRecord) return;
                    if (formId) {
                        rows.push({ formId, fields: cells });
                        count++;
                    }
                });

            return { headerCells, rows };
        },
        { fields: DATE_FIELDS, filterRecord, limit }
    );
}

// --- Export helpers ---

async function showExportDock(page) {
    await page.evaluate(() => {
        const dock = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockExport');
        if (dock) dock.style.display = '';
    });
    await page.waitForTimeout(500);
}

async function triggerExport(page, format) {
    const postbackMap = {
        excel: 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockExport$C$btnExcelExport2',
        word: 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockExport$C$btnWordExport2',
        xml: 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockExport$C$btnXMLExport2',
    };

    const postbackTarget = postbackMap[format];
    if (!postbackTarget) return { error: `Unknown format: ${format}` };

    // Set up download handler BEFORE triggering postback
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

    // Trigger export via javascript: URL (avoids strict mode issues with __doPostBack)
    // Same pattern used in test-sort-v4.js for postback triggers
    page.goto(`javascript:void(__doPostBack('${postbackTarget}',''))`).catch(() => {
        /* navigation to javascript: may reject but the postback still fires */
    });

    try {
        const download = await downloadPromise;
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-export-'));
        const filename = download.suggestedFilename();
        const filePath = path.join(tempDir, filename);
        await download.saveAs(filePath);
        const size = fs.statSync(filePath).size;
        return { filePath, filename, size, format };
    } catch (err) {
        return { error: `Download failed for ${format}: ${err.message}` };
    }
}

// --- Parsers ---

function parseHtmlExport(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract headers from first row
    const headers = [];
    const headerMatch = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (headerMatch) {
        const cellMatches = headerMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        for (const m of cellMatches) {
            headers.push(m[1].replace(/<[^>]+>/g, '').trim());
        }
    }

    // Extract data rows (skip the first header row)
    const records = [];
    const allRows = [...content.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (let i = 1; i < allRows.length; i++) {
        const cells = [];
        const cellMatches = allRows[i][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        for (const cm of cellMatches) {
            cells.push(
                cm[1]
                    .replace(/<[^>]+>/g, '')
                    .replace(/&nbsp;/g, '')
                    .trim()
            );
        }

        if (cells.length > 0 && headers.length > 0) {
            const fields = {};
            let formId = '';
            cells.forEach((cell, idx) => {
                if (headers[idx] === 'Form ID') formId = cell;
                if (DATE_FIELDS.includes(headers[idx])) {
                    fields[headers[idx]] = cell;
                }
            });
            if (formId) {
                records.push({ formId, fields });
            }
        }
    }

    return { headers, totalRows: records.length, records };
}

function parseXmlExport(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    const records = [];
    // XML elements use <DateTest> wrapper and _x0020_ for spaces in names
    const rowMatches = content.matchAll(/<DateTest>([\s\S]*?)<\/DateTest>/gi);

    for (const rowMatch of rowMatches) {
        const rowXml = rowMatch[1];
        const fields = {};
        let formId = '';

        // Extract field values
        const fieldMatches = rowXml.matchAll(/<([\w_]+)>([\s\S]*?)<\/\1>/g);
        for (const match of fieldMatches) {
            let name = match[1];
            const value = match[2].trim();

            // Decode _x0020_ → space → remove space (VisualVault field names have no spaces)
            if (name === 'Form_x0020_ID') {
                formId = value;
                continue;
            }

            // Check if this is a date field
            if (DATE_FIELDS.includes(name)) {
                fields[name] = value;
            }
        }

        if (formId) {
            records.push({ formId, fields });
        }
    }

    return { totalRows: records.length, records };
}

// --- Comparison ---

function compareRecords(gridRecords, exportRecords, format) {
    const results = { format, matches: 0, mismatches: 0, missing: 0, details: [] };

    for (const gridRow of gridRecords) {
        const exportRow = exportRecords.find((r) => r.formId === gridRow.formId);
        if (!exportRow) {
            results.missing++;
            results.details.push({
                formId: gridRow.formId,
                status: 'MISSING',
                note: `Not found in ${format} export`,
            });
            continue;
        }

        const fieldDiffs = [];
        let hasDateFields = false;

        for (const field of DATE_FIELDS) {
            const gridValue = (gridRow.fields[field] || '').trim();
            const exportValue = (exportRow.fields[field] || '').trim();

            // Skip if both empty
            if (!gridValue && !exportValue) continue;
            hasDateFields = true;

            if (gridValue === exportValue) continue;

            // Check for date-equivalent values (handles format differences)
            // Strategy: compare calendar dates (YYYY-MM-DD) to handle:
            //   - Grid "3/15/2026" vs Export "3/15/2026 12:00:00 AM" (Excel/Word add time)
            //   - Grid "3/15/2026" vs Export "2026-03-15T00:00:00+00:00" (XML uses ISO 8601)
            const gridDate = new Date(gridValue);
            const exportDate = new Date(exportValue);
            let dateEquiv = false;
            if (!isNaN(gridDate) && !isNaN(exportDate)) {
                // Compare full timestamps first
                if (gridDate.getTime() === exportDate.getTime()) {
                    dateEquiv = true;
                } else {
                    // Fall back to calendar date comparison (YYYY-MM-DD)
                    // Use UTC for ISO strings, local for display strings
                    const gridISO = gridValue.includes('T')
                        ? gridDate.toISOString().substring(0, 10)
                        : `${gridDate.getFullYear()}-${String(gridDate.getMonth() + 1).padStart(2, '0')}-${String(gridDate.getDate()).padStart(2, '0')}`;
                    const exportISO = exportValue.includes('T')
                        ? exportDate.toISOString().substring(0, 10)
                        : `${exportDate.getFullYear()}-${String(exportDate.getMonth() + 1).padStart(2, '0')}-${String(exportDate.getDate()).padStart(2, '0')}`;
                    dateEquiv = gridISO === exportISO;
                }
            }

            fieldDiffs.push({
                field,
                grid: gridValue,
                export: exportValue,
                dateEquivalent: dateEquiv,
            });
        }

        if (fieldDiffs.length === 0 && hasDateFields) {
            results.matches++;
        } else if (fieldDiffs.length > 0) {
            const hasTrueMismatch = fieldDiffs.some((d) => !d.dateEquivalent);
            if (hasTrueMismatch) {
                results.mismatches++;
            } else {
                results.matches++; // Format differs but dates equivalent
            }
            results.details.push({
                formId: gridRow.formId,
                status: hasTrueMismatch ? 'MISMATCH' : 'FORMAT_DIFF',
                fieldDiffs,
            });
        }
    }

    return results;
}

// --- Main ---

(async () => {
    const args = process.argv.slice(2);
    const formatArg = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'all';
    const recordArg = args.includes('--record') ? args[args.indexOf('--record') + 1] : null;

    const formats = formatArg === 'all' ? ['excel', 'word', 'xml'] : [formatArg];

    console.log('=== DB-7 Export Verification Test v1 ===\n');
    console.log(`Formats: ${formats.join(', ')}`);
    if (recordArg) console.log(`Filter record: ${recordArg}`);
    console.log('');

    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
        timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();

    // Load dashboard
    console.log('Loading dashboard...');
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const rowCount = await page.evaluate(
        () => document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').length
    );
    console.log(`Grid loaded: ${rowCount} rows\n`);

    // Capture baseline grid data
    console.log('Capturing baseline grid data...');
    const gridData = await captureGridData(page, recordArg, recordArg ? null : 5);
    console.log(`Baseline: ${gridData.rows.length} records captured\n`);

    if (gridData.rows.length === 0) {
        console.log('ERROR: No records found in grid');
        await browser.close();
        process.exit(1);
    }

    // Show reference
    const ref = gridData.rows[0];
    console.log(`Reference record: ${ref.formId}`);
    const refFields = Object.entries(ref.fields).filter(([, v]) => v);
    for (const [field, value] of refFields.slice(0, 8)) {
        console.log(`  ${field}: "${value}"`);
    }
    console.log(`  (${refFields.length} fields with values)\n`);

    // Test each format
    const allResults = {};
    const tempFiles = [];

    for (const format of formats) {
        console.log(`--- ${format.toUpperCase()} export ---\n`);

        const exportResult = await triggerExport(page, format);

        if (exportResult.error) {
            console.log(`  ERROR: ${exportResult.error}\n`);
            allResults[format] = { status: 'ERROR', error: exportResult.error };

            // Reload for next test
            await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);
            continue;
        }

        console.log(`  Downloaded: ${exportResult.filename} (${exportResult.size} bytes)`);
        tempFiles.push(exportResult.filePath);

        // Parse
        let parsed;
        try {
            if (format === 'xml') {
                parsed = parseXmlExport(exportResult.filePath);
            } else {
                // Both Excel and Word are HTML tables
                parsed = parseHtmlExport(exportResult.filePath);
            }
            console.log(`  Parsed: ${parsed.totalRows} records\n`);
        } catch (err) {
            console.log(`  Parse error: ${err.message}\n`);
            allResults[format] = { status: 'PARSE_ERROR', error: err.message };
            await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);
            continue;
        }

        // Compare
        const comparison = compareRecords(gridData.rows, parsed.records, format);
        console.log(
            `  Matches: ${comparison.matches}, Mismatches: ${comparison.mismatches}, Missing: ${comparison.missing}`
        );

        if (comparison.details.length > 0) {
            for (const detail of comparison.details.slice(0, 3)) {
                console.log(`  ${detail.formId}: ${detail.status}`);
                if (detail.fieldDiffs) {
                    for (const diff of detail.fieldDiffs.slice(0, 5)) {
                        console.log(
                            `    ${diff.field}: grid="${diff.grid}" ${format}="${diff.export}" (${diff.dateEquivalent ? 'date-equiv' : 'MISMATCH'})`
                        );
                    }
                }
            }
        }
        console.log('');

        allResults[format] = {
            status: comparison.mismatches === 0 && comparison.missing === 0 ? 'PASS' : 'FAIL',
            matches: comparison.matches,
            mismatches: comparison.mismatches,
            missing: comparison.missing,
            exportRecords: parsed.totalRows,
            filename: exportResult.filename,
            fileSize: exportResult.size,
            details: comparison.details,
        };

        // Reload for next format (postback changes page state)
        if (formats.indexOf(format) < formats.length - 1) {
            await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);
        }
    }

    await browser.close();

    // Clean up temp files
    for (const fp of tempFiles) {
        try {
            fs.rmSync(path.dirname(fp), { recursive: true });
        } catch {
            /* ignore */
        }
    }

    // Summary
    console.log('\n=== SUMMARY ===\n');
    console.log('| Format | Status | Export Records | Matches | Mismatches | Missing |');
    console.log('|--------|--------|----------------|---------|------------|---------|');
    for (const [format, result] of Object.entries(allResults)) {
        console.log(
            `| ${format.padEnd(6)} | ${(result.status || 'N/A').padEnd(6)} | ${String(result.exportRecords || '-').padEnd(14)} | ${String(result.matches || '-').padEnd(7)} | ${String(result.mismatches || '-').padEnd(10)} | ${String(result.missing || '-').padEnd(7)} |`
        );
    }

    // Exit code: 0 if all pass, 1 if any fail
    const allPass = Object.values(allResults).every((r) => r.status === 'PASS');
    console.log(`\nOverall: ${allPass ? 'ALL PASS' : 'SOME FAILED'}`);
    process.exit(allPass ? 0 : 1);
})();
