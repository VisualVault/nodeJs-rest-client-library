/**
 * Audit: Bug #1 — Timezone Marker Stripping in parseDateString()
 *
 * Independent Playwright verification of every claim in bug-1-timezone-stripping.md.
 * This is NOT a regression test — it is a one-time audit to verify analysis accuracy
 * before reporting to the product team.
 *
 * Key finding under investigation: parseDateString() is only called in V2, not V1.
 * V1 has equivalent inline Z-handling but through different code paths.
 *
 * Note on Z origin: The database (SQL Server datetime) stores no Z. The Z tested
 * in Phase 1 comes from API response serialization (postForms → FormInstance/Controls
 * adds Z, see CB-29) and browser-side toISOString() (preset/CurrentDate defaults).
 * Saved user data arrives WITHOUT Z (getSaveValue strips it before storage).
 *
 * 5 phases:
 *   Phase 1 — Direct parseDateString() invocation (function-level verification)
 *   Phase 2 — V1 call trace via monkey-patch (proves parseDateString is NOT called in V1)
 *   Phase 3 — V1 inline Z-stripping equivalence (shows V1 has same conceptual defect)
 *   Phase 4 — V2 flag flip (proves parseDateString IS called when V2 is active)
 *   Phase 5 — Cross-TZ saved record reload (V1 init path real-world impact)
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL, SAVED_RECORDS } = require('../../fixtures/vv-config');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    getBrowserTimezone,
    captureFieldValues,
    setFieldValue,
} = require('../../helpers/vv-form');
const { typeDateInField, selectDateViaPopup } = require('../../helpers/vv-calendar');

// ─────────────────────────────────────────────────────────────────────
// Phase 1: Direct parseDateString() Invocation
// ─────────────────────────────────────────────────────────────────────
// Calls parseDateString() directly via page.evaluate() to record actual outputs.
// This bypasses V1/V2 gating — we are testing the function itself.

const PHASE1_CASES = [
    // ISO with Z — the primary Bug #1 scenario
    { input: '2026-03-15T00:00:00.000Z', enableTime: true, ignoreTZ: true, label: 'ISO+Z, DateTime, ignoreTZ=true' },
    {
        input: '2026-03-15T00:00:00.000Z',
        enableTime: true,
        ignoreTZ: false,
        label: 'ISO+Z, DateTime, ignoreTZ=false (recovery branch)',
    },
    { input: '2026-03-15T00:00:00.000Z', enableTime: false, ignoreTZ: true, label: 'ISO+Z, DateOnly, ignoreTZ=true' },
    { input: '2026-03-15T00:00:00.000Z', enableTime: false, ignoreTZ: false, label: 'ISO+Z, DateOnly, ignoreTZ=false' },
    // ISO without Z — should have no Z to strip
    { input: '2026-03-15T00:00:00', enableTime: true, ignoreTZ: true, label: 'ISO noZ, DateTime, ignoreTZ=true' },
    { input: '2026-03-15T00:00:00', enableTime: false, ignoreTZ: true, label: 'ISO noZ, DateOnly, ignoreTZ=true' },
    // Date-only string
    { input: '2026-03-15', enableTime: false, ignoreTZ: false, label: 'DateOnly string, ignoreTZ=false' },
    { input: '2026-03-15', enableTime: false, ignoreTZ: true, label: 'DateOnly string, ignoreTZ=true' },
    // Noon time — tests whether startOf("day") correctly collapses non-midnight
    { input: '2026-03-15T12:00:00.000Z', enableTime: true, ignoreTZ: true, label: 'Noon+Z, DateTime, ignoreTZ=true' },
    {
        input: '2026-03-15T12:00:00.000Z',
        enableTime: false,
        ignoreTZ: true,
        label: 'Noon+Z, DateOnly, ignoreTZ=true (collapse to midnight)',
    },
];

for (const tc of PHASE1_CASES) {
    test.describe(`Phase 1: parseDateString() — ${tc.label}`, () => {
        test(`input="${tc.input}" enableTime=${tc.enableTime} ignoreTZ=${tc.ignoreTZ}`, async ({ page }, testInfo) => {
            const tzPrefix = testInfo.project.name.split('-')[0];
            // Only run on chromium projects (pure JS logic — browser irrelevant)
            test.skip(!testInfo.project.name.endsWith('-chromium'), 'Audit runs on chromium only');
            // Only run in BRT, IST, UTC0
            test.skip(!['BRT', 'IST', 'UTC0'].includes(tzPrefix), 'Audit runs in BRT, IST, UTC0');

            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            // Confirm TZ and V1
            const browserTZ = await getBrowserTimezone(page);
            const isV2 = await getCodePath(page);
            expect(isV2).toBe(false);

            // Call parseDateString directly
            const result = await page.evaluate(
                ({ input, enableTime, ignoreTZ }) => {
                    return VV.Form.calendarValueService.parseDateString(input, enableTime, ignoreTZ);
                },
                { input: tc.input, enableTime: tc.enableTime, ignoreTZ: tc.ignoreTZ }
            );

            // Also compute what the CORRECT output should be (no Z-stripping)
            const correct = await page.evaluate(
                ({ input, enableTime }) => {
                    // Correct behavior: parse input as-is (preserving Z), then format
                    const d = new Date(input);
                    if (!enableTime) {
                        // Date-only: extract UTC date, anchor to UTC midnight
                        const dateStr = input.includes('T') ? input.substring(0, input.indexOf('T')) : input;
                        return new Date(dateStr + 'T00:00:00.000Z').toISOString();
                    }
                    return d.toISOString();
                },
                { input: tc.input, enableTime: tc.enableTime }
            );

            // Record all values as test annotations for the audit report
            test.info().annotations.push(
                { type: 'tz', description: `Browser TZ: ${browserTZ}` },
                { type: 'input', description: `Input: ${tc.input}` },
                { type: 'params', description: `enableTime=${tc.enableTime}, ignoreTZ=${tc.ignoreTZ}` },
                { type: 'actual', description: `parseDateString returned: ${result}` },
                { type: 'correct', description: `Correct (no Z-strip): ${correct}` },
                { type: 'match', description: `Match: ${result === correct}` },
                {
                    type: 'shift',
                    description: `Shift: ${new Date(result).getTime() - new Date(correct).getTime()}ms = ${(new Date(result).getTime() - new Date(correct).getTime()) / 3600000}h`,
                }
            );

            // The assertion: we EXPECT the function to be buggy (Z-stripped).
            // At UTC0, the bug is invisible (0 offset). At BRT/IST, expect a shift.
            if (tzPrefix === 'UTC0') {
                // UTC0: Z-stripping produces no shift (local == UTC)
                expect(result).toBe(correct);
            } else {
                // BRT/IST: record whether output matches correct or is shifted
                // We do NOT assert PASS/FAIL here — we record the actual value.
                // The audit's job is to OBSERVE, not to enforce expected failures.
                // Use a soft check: log the deviation, always pass for data collection.
                if (result !== correct) {
                    test.info().annotations.push({
                        type: 'bug-confirmed',
                        description: `BUG CONFIRMED: parseDateString returns shifted value. Got ${result}, correct is ${correct}`,
                    });
                } else {
                    test.info().annotations.push({
                        type: 'no-bug',
                        description: `No shift detected — recovery branch or no Z to strip`,
                    });
                }
                // Always pass — this is an observation test
                expect(true).toBe(true);
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────────────
// Phase 2: V1 Call Trace (Monkey-Patch)
// ─────────────────────────────────────────────────────────────────────
// Instruments parseDateString to log calls, then performs V1 operations.
// Expected: zero calls (parseDateString is V2-only).

test.describe('Phase 2: V1 Call Trace — parseDateString invocation during V1 operations', () => {
    test('typed input on Config A (date-only) does NOT call parseDateString', async ({ page }, testInfo) => {
        test.skip(!testInfo.project.name.startsWith('BRT-chromium'), 'V1 trace runs in BRT-chromium only');
        await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);
        expect(await getCodePath(page)).toBe(false);

        // Instrument parseDateString
        await page.evaluate(() => {
            const svc = VV.Form.calendarValueService;
            svc._auditCallLog = [];
            const orig = svc.parseDateString.bind(svc);
            svc.parseDateString = function (input, enableTime, ignoreTZ) {
                svc._auditCallLog.push({
                    input,
                    enableTime,
                    ignoreTZ,
                    stack: new Error().stack.split('\n').slice(0, 5),
                });
                return orig(input, enableTime, ignoreTZ);
            };
        });

        // Type a date in Config A (Field7, date-only, !ignoreTZ, !legacy)
        await typeDateInField(page, FIELD_MAP.A.field, '03/15/2026');

        const callLog = await page.evaluate(() => VV.Form.calendarValueService._auditCallLog);
        test.info().annotations.push({
            type: 'call-log',
            description: `parseDateString calls after typed input: ${JSON.stringify(callLog)}`,
        });
        expect(callLog.length).toBe(0);
    });

    test('typed input on Config D (datetime, ignoreTZ) does NOT call parseDateString', async ({ page }, testInfo) => {
        test.skip(!testInfo.project.name.startsWith('BRT-chromium'), 'V1 trace runs in BRT-chromium only');
        await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);
        expect(await getCodePath(page)).toBe(false);

        await page.evaluate(() => {
            const svc = VV.Form.calendarValueService;
            svc._auditCallLog = [];
            const orig = svc.parseDateString.bind(svc);
            svc.parseDateString = function (input, enableTime, ignoreTZ) {
                svc._auditCallLog.push({
                    input,
                    enableTime,
                    ignoreTZ,
                    stack: new Error().stack.split('\n').slice(0, 5),
                });
                return orig(input, enableTime, ignoreTZ);
            };
        });

        await typeDateInField(page, FIELD_MAP.D.field, '03/15/2026 12:00 AM');

        const callLog = await page.evaluate(() => VV.Form.calendarValueService._auditCallLog);
        test.info().annotations.push({
            type: 'call-log',
            description: `parseDateString calls after Config D typed input: ${JSON.stringify(callLog)}`,
        });
        expect(callLog.length).toBe(0);
    });

    test('SetFieldValue on Config A does NOT call parseDateString', async ({ page }, testInfo) => {
        test.skip(!testInfo.project.name.startsWith('BRT-chromium'), 'V1 trace runs in BRT-chromium only');
        await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);
        expect(await getCodePath(page)).toBe(false);

        await page.evaluate(() => {
            const svc = VV.Form.calendarValueService;
            svc._auditCallLog = [];
            const orig = svc.parseDateString.bind(svc);
            svc.parseDateString = function (input, enableTime, ignoreTZ) {
                svc._auditCallLog.push({
                    input,
                    enableTime,
                    ignoreTZ,
                    stack: new Error().stack.split('\n').slice(0, 5),
                });
                return orig(input, enableTime, ignoreTZ);
            };
        });

        await setFieldValue(page, FIELD_MAP.A.field, '2026-03-15');

        const callLog = await page.evaluate(() => VV.Form.calendarValueService._auditCallLog);
        test.info().annotations.push({
            type: 'call-log',
            description: `parseDateString calls after SetFieldValue: ${JSON.stringify(callLog)}`,
        });
        expect(callLog.length).toBe(0);
    });

    test('calendar popup on Config C does NOT call parseDateString', async ({ page }, testInfo) => {
        test.skip(!testInfo.project.name.startsWith('BRT-chromium'), 'V1 trace runs in BRT-chromium only');
        await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);
        expect(await getCodePath(page)).toBe(false);

        await page.evaluate(() => {
            const svc = VV.Form.calendarValueService;
            svc._auditCallLog = [];
            const orig = svc.parseDateString.bind(svc);
            svc.parseDateString = function (input, enableTime, ignoreTZ) {
                svc._auditCallLog.push({
                    input,
                    enableTime,
                    ignoreTZ,
                    stack: new Error().stack.split('\n').slice(0, 5),
                });
                return orig(input, enableTime, ignoreTZ);
            };
        });

        await selectDateViaPopup(page, FIELD_MAP.C.field, 2026, 3, 15);

        const callLog = await page.evaluate(() => VV.Form.calendarValueService._auditCallLog);
        test.info().annotations.push({
            type: 'call-log',
            description: `parseDateString calls after popup: ${JSON.stringify(callLog)}`,
        });
        expect(callLog.length).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// Phase 3: V1 Inline Z-Stripping Equivalence
// ─────────────────────────────────────────────────────────────────────
// Tests the V1 inline code paths to show they produce equivalent defects
// through different code than parseDateString.

test.describe('Phase 3a: V1 inline Z-strip — DateTime + ignoreTimezone (line 102893 equivalent)', () => {
    test('inline replace("Z","") + new Date() vs parseDateString()', async ({ page }, testInfo) => {
        const tzPrefix = testInfo.project.name.split('-')[0];
        test.skip(!testInfo.project.name.endsWith('-chromium'), 'Audit runs on chromium only');
        test.skip(!['BRT', 'IST'].includes(tzPrefix), 'Runs in BRT and IST');

        await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

        const result = await page.evaluate(() => {
            const input = '2026-03-15T00:00:00.000Z';

            // V1 inline code (initCalendarValueV1 line 102893)
            const stripped = input.replace('Z', '');
            const v1Date = new Date(stripped);

            // parseDateString equivalent (enableTime=true, ignoreTimezone=true)
            const pdsResult = VV.Form.calendarValueService.parseDateString(input, true, true);

            // Correct parse (no Z-stripping)
            const correctDate = new Date(input);

            return {
                v1_inline: { iso: v1Date.toISOString(), local: v1Date.toString() },
                parseDateString: pdsResult,
                correct: { iso: correctDate.toISOString(), local: correctDate.toString() },
                v1_matches_pds: v1Date.toISOString() === new Date(pdsResult).toISOString(),
                v1_matches_correct: v1Date.toISOString() === correctDate.toISOString(),
            };
        });

        test.info().annotations.push(
            { type: 'v1-inline', description: `V1 inline (replace+new Date): ${result.v1_inline.iso}` },
            { type: 'parseDateString', description: `parseDateString(input,true,true): ${result.parseDateString}` },
            { type: 'correct', description: `Correct (no strip): ${result.correct.iso}` },
            { type: 'v1-matches-pds', description: `V1 inline == parseDateString: ${result.v1_matches_pds}` },
            { type: 'v1-matches-correct', description: `V1 inline == correct: ${result.v1_matches_correct}` }
        );

        // V1 inline and parseDateString should produce equivalent results
        // (both strip Z and parse as local) — but through different code
        expect(result.v1_matches_pds).toBe(true);
    });
});

test.describe('Phase 3b: V1 inline T-truncation — DateOnly (line 102912 equivalent)', () => {
    test('T-truncation + moment().toDate() vs parseDateString()', async ({ page }, testInfo) => {
        const tzPrefix = testInfo.project.name.split('-')[0];
        test.skip(!testInfo.project.name.endsWith('-chromium'), 'Audit runs on chromium only');
        test.skip(!['BRT', 'IST'].includes(tzPrefix), 'Runs in BRT and IST');

        await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

        const result = await page.evaluate(() => {
            const input = '2026-03-15T00:00:00.000Z';

            // V1 inline code (initCalendarValueV1 line 102912)
            // First truncates at T, THEN parses — Z is gone via T-truncation, not Z-stripping
            let e = input;
            e.indexOf('T') > 0 && (e = e.substring(0, e.indexOf('T')));
            // moment is not global — use VV's internal moment via a date parse workaround
            // VV bundles moment internally; we access it through the calendarValueService
            // by calling parseDateString and comparing, or use native Date for the V1 simulation.
            // V1 actually calls `o(e).toDate()` where o = moment. Since moment is not exposed globally,
            // simulate the same behavior: moment("2026-03-15") parses as local midnight,
            // which is equivalent to new Date("2026-03-15T00:00:00") (no Z = local).
            const v1Date = new Date(e + 'T00:00:00');

            // parseDateString equivalent (enableTime=false, ignoreTimezone=true)
            const pdsResult = VV.Form.calendarValueService.parseDateString(input, false, true);

            // Correct: extract date portion, anchor to UTC midnight
            const correctISO = '2026-03-15T00:00:00.000Z';

            return {
                truncated: e,
                v1_inline: { iso: v1Date.toISOString(), local: v1Date.toString() },
                parseDateString: pdsResult,
                correct: correctISO,
                v1_matches_pds: v1Date.toISOString() === new Date(pdsResult).toISOString(),
                v1_matches_correct: v1Date.toISOString() === correctISO,
                pds_matches_correct: pdsResult === correctISO,
            };
        });

        test.info().annotations.push(
            { type: 'truncated', description: `After T-truncation: "${result.truncated}"` },
            { type: 'v1-inline', description: `V1 inline (moment(dateOnly).toDate()): ${result.v1_inline.iso}` },
            { type: 'v1-local', description: `V1 inline local: ${result.v1_inline.local}` },
            { type: 'parseDateString', description: `parseDateString(input,false,true): ${result.parseDateString}` },
            { type: 'correct', description: `Correct (UTC midnight): ${result.correct}` },
            { type: 'v1-matches-pds', description: `V1 inline == parseDateString: ${result.v1_matches_pds}` },
            { type: 'v1-matches-correct', description: `V1 inline == correct: ${result.v1_matches_correct}` },
            { type: 'pds-matches-correct', description: `parseDateString == correct: ${result.pds_matches_correct}` }
        );

        // Key audit question: does V1 inline produce the SAME result as parseDateString?
        // If not, Bug #1 (parseDateString) and Bug #7 (V1 inline) are distinct mechanisms.
        // Record but don't assert — let the data speak.
        if (!result.v1_matches_pds) {
            test.info().annotations.push({
                type: 'finding',
                description:
                    'FINDING: V1 inline and parseDateString produce DIFFERENT results for date-only. ' +
                    'This confirms they are distinct mechanisms — Bug #1 is NOT the root enabler of Bug #7 in V1.',
            });
        }
        expect(true).toBe(true); // Observation test — always passes
    });
});

// ─────────────────────────────────────────────────────────────────────
// Phase 4: V2 Flag Flip
// ─────────────────────────────────────────────────────────────────────
// Flips useUpdatedCalendarValueLogic = true, then checks if parseDateString
// IS called during SetFieldValue (confirming it's V2-gated).

test.describe('Phase 4: V2 flag flip — parseDateString called under V2', () => {
    test('SetFieldValue on Config A calls parseDateString when V2 is active', async ({ page }, testInfo) => {
        test.skip(!testInfo.project.name.startsWith('BRT-chromium'), 'V2 flip runs in BRT-chromium only');
        await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

        // Confirm V1 is default
        expect(await getCodePath(page)).toBe(false);

        // Flip to V2
        await page.evaluate(() => {
            VV.Form.calendarValueService.useUpdatedCalendarValueLogic = true;
        });
        expect(await getCodePath(page)).toBe(true);

        // Instrument parseDateString
        await page.evaluate(() => {
            const svc = VV.Form.calendarValueService;
            svc._auditCallLog = [];
            const orig = svc.parseDateString.bind(svc);
            svc.parseDateString = function (input, enableTime, ignoreTZ) {
                svc._auditCallLog.push({ input, enableTime, ignoreTZ });
                return orig(input, enableTime, ignoreTZ);
            };
        });

        // SetFieldValue on Config A
        await setFieldValue(page, FIELD_MAP.A.field, '2026-03-15');

        const callLog = await page.evaluate(() => VV.Form.calendarValueService._auditCallLog);
        test.info().annotations.push({
            type: 'v2-call-log',
            description: `parseDateString calls under V2: ${JSON.stringify(callLog)}`,
        });

        // Under V2, normalizeCalValue should route through parseDateString
        expect(callLog.length).toBeGreaterThan(0);

        // Flip back to V1 (cleanup)
        await page.evaluate(() => {
            VV.Form.calendarValueService.useUpdatedCalendarValueLogic = false;
        });
    });
});

// ─────────────────────────────────────────────────────────────────────
// Phase 5: Cross-TZ Saved Record Reload (V1 Init Path)
// ─────────────────────────────────────────────────────────────────────
// Loads saved records in different TZs to show V1 init path TZ-dependent shifts.
// Uses cat3-A-BRT record (saved from BRT with Config A=03/15/2026, Config D=03/15/2026).

test.describe('Phase 5: Cross-TZ saved record reload — V1 init path real impact', () => {
    test('load BRT-saved record — capture Config A and D raw values', async ({ page }, testInfo) => {
        const tzPrefix = testInfo.project.name.split('-')[0];
        test.skip(!testInfo.project.name.endsWith('-chromium'), 'Audit runs on chromium only');
        test.skip(!['BRT', 'IST', 'UTC0'].includes(tzPrefix), 'Runs in BRT, IST, UTC0');

        const recordUrl = SAVED_RECORDS['cat3-A-BRT'];
        test.skip(!recordUrl, 'No saved record URL for cat3-A-BRT');

        await gotoAndWaitForVVForm(page, recordUrl);
        expect(await getCodePath(page)).toBe(false);

        const browserTZ = await getBrowserTimezone(page);

        // Config A (Field7) — date-only, !ignoreTZ
        // V1 init: T-truncation + moment(e).toDate() → Bug #7 mechanism
        const configA = await captureFieldValues(page, FIELD_MAP.A.field);

        // Config D (Field5) — DateTime, ignoreTZ=true
        // V1 init: replace("Z","") + new Date(e) → Bug #1 equivalent mechanism
        const configD = await captureFieldValues(page, FIELD_MAP.D.field);

        test.info().annotations.push(
            { type: 'tz', description: `Browser TZ: ${browserTZ}` },
            { type: 'config-A-raw', description: `Config A raw (date-only): ${configA.raw}` },
            { type: 'config-A-api', description: `Config A API: ${configA.api}` },
            { type: 'config-D-raw', description: `Config D raw (DateTime+ignoreTZ): ${configD.raw}` },
            { type: 'config-D-api', description: `Config D API: ${configD.api}` }
        );

        // At BRT: both should show March 15 values (same TZ as save)
        // At IST: Config A may show March 14 (Bug #7 via V1 T-truncation + moment local parse)
        //         Config D may show shifted time (Bug #1 equivalent via inline Z-strip)
        // At UTC0: both should be correct (no offset)
        // We record observations — assertions are TZ-dependent.
        if (tzPrefix === 'BRT') {
            // Same TZ as save — expect no shift
            expect(configA.raw).toContain('2026-03-15');
            expect(configD.raw).toContain('2026-03-15');
        } else {
            // Cross-TZ: record what happens
            test.info().annotations.push({
                type: 'cross-tz-observation',
                description:
                    `Cross-TZ reload from BRT to ${tzPrefix}. ` +
                    `Config A raw=${configA.raw}, Config D raw=${configD.raw}. ` +
                    `Check for date shifts.`,
            });
            expect(true).toBe(true);
        }
    });

    // Also load IST-saved record to compare
    test('load IST-saved record — capture Config A and D raw values', async ({ page }, testInfo) => {
        const tzPrefix = testInfo.project.name.split('-')[0];
        test.skip(!testInfo.project.name.endsWith('-chromium'), 'Audit runs on chromium only');
        test.skip(!['BRT', 'IST', 'UTC0'].includes(tzPrefix), 'Runs in BRT, IST, UTC0');

        const recordUrl = SAVED_RECORDS['cat3-AD-IST'];
        test.skip(!recordUrl, 'No saved record URL for cat3-AD-IST');

        await gotoAndWaitForVVForm(page, recordUrl);
        expect(await getCodePath(page)).toBe(false);

        const browserTZ = await getBrowserTimezone(page);

        const configA = await captureFieldValues(page, FIELD_MAP.A.field);
        const configD = await captureFieldValues(page, FIELD_MAP.D.field);

        test.info().annotations.push(
            { type: 'tz', description: `Browser TZ: ${browserTZ}` },
            { type: 'config-A-raw', description: `Config A raw (date-only, IST-saved): ${configA.raw}` },
            { type: 'config-A-api', description: `Config A API (IST-saved): ${configA.api}` },
            { type: 'config-D-raw', description: `Config D raw (DateTime+ignoreTZ, IST-saved): ${configD.raw}` },
            { type: 'config-D-api', description: `Config D API (IST-saved): ${configD.api}` }
        );

        // IST-saved Config A should already have Bug #7 baked in (stored March 14)
        // Loading from IST: March 14 → T-truncation → moment("2026-03-14").toDate() → March 14 (same)
        // Loading from BRT: March 14 → same process → March 14 (date-only is TZ-invariant on reload)
        expect(true).toBe(true); // Observation test
    });
});
