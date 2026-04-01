/**
 * Centralized test case definitions for VV date-handling Playwright tests.
 *
 * Each entry is a complete, self-documenting test case definition. Category spec files
 * (e.g., cat-1-calendar-popup.spec.js) filter this array by category and loop over
 * matching entries to generate parameterized tests.
 *
 * To add a new test case:
 *   1. Append an entry to the TEST_DATA array below
 *   2. If the category spec file doesn't exist yet, create it in date-handling/
 *   3. Run `npm run test:pw` to execute
 *
 * The @-create-pw-date-test command appends entries here after live verification.
 *
 * Field reference:
 *   id            — Unique test ID: "{category}-{config}-{tz}" (e.g., "1-A-BRT")
 *   category      — Category number (1-13), determines which spec file runs this test
 *   categoryName  — Human-readable category name
 *   config        — Config letter (A-H), maps to FIELD_MAP in vv-config.js
 *   tz            — Playwright project name: "BRT", "IST", or "UTC0"
 *   tzOffset      — Expected GMT offset string in Date.toString() output
 *   action        — Test action type: "popup", "typed", "setFieldValue", "reload", etc.
 *   inputDate     — Date to select/type: { year, month (1-indexed), day }
 *   inputDateStr  — Formatted date string for typed input tests (MM/dd/yyyy[ hh:mm AM])
 *   expectedRaw   — Expected raw stored value (getValueObjectValue)
 *   expectedApi   — Expected GetFieldValue() return
 *   bugs          — Array of bug IDs this test exercises (e.g., ["Bug #5", "Bug #7"])
 *   notes         — Why this test case exists and what it proves
 *   tcRef         — Path to the markdown TC spec in tasks/date-handling/
 */

const TEST_DATA = [
    // ═══════════════════════════════════════════════════════════════════════
    // Category 1 — Calendar Popup
    // User selects a date via the calendar popup widget.
    // Tests how VV stores and returns the value after popup selection.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: '1-A-BRT',
        category: 1,
        categoryName: 'Calendar Popup',
        config: 'A',
        tz: 'BRT',
        tzOffset: 'GMT-0300',
        action: 'popup',
        inputDate: { year: 2026, month: 3, day: 15 },
        inputDateStr: '03/15/2026',
        expectedRaw: '2026-03-15',
        expectedApi: '2026-03-15',
        bugs: [],
        notes: 'Date-only baseline. No TZ shift expected in BRT (UTC-). Bug #7 only affects UTC+.',
        tcRef: 'tasks/date-handling/forms-calendar/test-cases/tc-1-A-BRT.md',
    },
];

module.exports = { TEST_DATA };
