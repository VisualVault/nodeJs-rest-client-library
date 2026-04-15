/**
 * DB-7 — Dashboard Export Verification Tests
 *
 * Downloads Excel, Word, and XML exports from the DateTest dashboard
 * and compares date values against the grid display.
 *
 * Converted from research/date-handling/dashboards/test-export-v1.js
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'config', 'auth-state-pw.json');
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

async function captureGridData(page, limit) {
    return await page.evaluate(
        ({ fields, limit }) => {
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
                    if (formId) {
                        rows.push({ formId, fields: cells });
                        count++;
                    }
                });

            return { headerCells, rows };
        },
        { fields: DATE_FIELDS, limit }
    );
}

async function triggerExport(page, format) {
    const postbackMap = {
        excel: 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockExport$C$btnExcelExport2',
        word: 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockExport$C$btnWordExport2',
        xml: 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockExport$C$btnXMLExport2',
    };

    const postbackTarget = postbackMap[format];

    // Make export dock visible
    await page.evaluate(() => {
        const dock = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockExport');
        if (dock) dock.style.display = '';
    });
    await page.waitForTimeout(500);

    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

    page.goto(`javascript:void(__doPostBack('${postbackTarget}',''))`).catch(() => {
        /* navigation to javascript: may reject but the postback still fires */
    });

    const download = await downloadPromise;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-export-'));
    const filename = download.suggestedFilename();
    const filePath = path.join(tempDir, filename);
    await download.saveAs(filePath);
    const size = fs.statSync(filePath).size;
    return { filePath, filename, size, format, tempDir };
}

function parseHtmlExport(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    const headers = [];
    const headerMatch = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (headerMatch) {
        const cellMatches = headerMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        for (const m of cellMatches) {
            headers.push(m[1].replace(/<[^>]+>/g, '').trim());
        }
    }

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
                if (DATE_FIELDS.includes(headers[idx])) fields[headers[idx]] = cell;
            });
            if (formId) records.push({ formId, fields });
        }
    }

    return { headers, totalRows: records.length, records };
}

function parseXmlExport(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = [];
    const rowMatches = content.matchAll(/<DateTest>([\s\S]*?)<\/DateTest>/gi);

    for (const rowMatch of rowMatches) {
        const rowXml = rowMatch[1];
        const fields = {};
        let formId = '';

        const fieldMatches = rowXml.matchAll(/<([\w_]+)>([\s\S]*?)<\/\1>/g);
        for (const match of fieldMatches) {
            const name = match[1];
            const value = match[2].trim();
            if (name === 'Form_x0020_ID') {
                formId = value;
                continue;
            }
            if (DATE_FIELDS.includes(name)) fields[name] = value;
        }

        if (formId) records.push({ formId, fields });
    }

    return { totalRows: records.length, records };
}

function compareRecords(gridRecords, exportRecords, format) {
    const results = { format, matches: 0, mismatches: 0, missing: 0, details: [] };

    for (const gridRow of gridRecords) {
        const exportRow = exportRecords.find((r) => r.formId === gridRow.formId);
        if (!exportRow) {
            results.missing++;
            continue;
        }

        const fieldDiffs = [];
        let hasDateFields = false;

        for (const field of DATE_FIELDS) {
            const gridValue = (gridRow.fields[field] || '').trim();
            const exportValue = (exportRow.fields[field] || '').trim();

            if (!gridValue && !exportValue) continue;
            hasDateFields = true;
            if (gridValue === exportValue) continue;

            const gridDate = new Date(gridValue);
            const exportDate = new Date(exportValue);
            let dateEquiv = false;
            if (!isNaN(gridDate) && !isNaN(exportDate)) {
                if (gridDate.getTime() === exportDate.getTime()) {
                    dateEquiv = true;
                } else {
                    const gridISO = gridValue.includes('T')
                        ? gridDate.toISOString().substring(0, 10)
                        : `${gridDate.getFullYear()}-${String(gridDate.getMonth() + 1).padStart(2, '0')}-${String(gridDate.getDate()).padStart(2, '0')}`;
                    const exportISO = exportValue.includes('T')
                        ? exportDate.toISOString().substring(0, 10)
                        : `${exportDate.getFullYear()}-${String(exportDate.getMonth() + 1).padStart(2, '0')}-${String(exportDate.getDate()).padStart(2, '0')}`;
                    dateEquiv = gridISO === exportISO;
                }
            }

            fieldDiffs.push({ field, grid: gridValue, export: exportValue, dateEquivalent: dateEquiv });
        }

        if (fieldDiffs.length === 0 && hasDateFields) {
            results.matches++;
        } else if (fieldDiffs.length > 0) {
            const hasTrueMismatch = fieldDiffs.some((d) => !d.dateEquivalent);
            if (hasTrueMismatch) results.mismatches++;
            else results.matches++;
            results.details.push({
                formId: gridRow.formId,
                status: hasTrueMismatch ? 'MISMATCH' : 'FORMAT_DIFF',
                fieldDiffs,
            });
        }
    }

    return results;
}

test.describe('DB-7: Dashboard Export Verification', () => {
    test.use({ storageState: AUTH_STATE_PATH });

    for (const format of ['excel', 'word', 'xml']) {
        test(`${format} export matches grid date values`, async ({ page }) => {
            test.setTimeout(120000);

            await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);

            // Capture baseline grid data (first 5 records)
            const gridData = await captureGridData(page, 5);
            expect(gridData.rows.length).toBeGreaterThan(0);

            const exportResult = await triggerExport(page, format);
            expect(exportResult.size).toBeGreaterThan(0);

            console.log(`${format}: Downloaded ${exportResult.filename} (${exportResult.size} bytes)`);

            // Parse
            let parsed;
            if (format === 'xml') {
                parsed = parseXmlExport(exportResult.filePath);
            } else {
                parsed = parseHtmlExport(exportResult.filePath);
            }

            console.log(`${format}: Parsed ${parsed.totalRows} records`);

            // Compare
            const comparison = compareRecords(gridData.rows, parsed.records, format);
            console.log(
                `${format}: Matches=${comparison.matches}, Mismatches=${comparison.mismatches}, Missing=${comparison.missing}`
            );

            for (const detail of comparison.details.slice(0, 3)) {
                console.log(`  ${detail.formId}: ${detail.status}`);
                for (const diff of detail.fieldDiffs.slice(0, 5)) {
                    console.log(
                        `    ${diff.field}: grid="${diff.grid}" ${format}="${diff.export}" (${diff.dateEquivalent ? 'date-equiv' : 'MISMATCH'})`
                    );
                }
            }

            expect(comparison.mismatches).toBe(0);
            expect(comparison.missing).toBe(0);

            // Clean up temp files
            try {
                fs.rmSync(exportResult.tempDir, { recursive: true });
            } catch {
                /* ignore */
            }
        });
    }
});
