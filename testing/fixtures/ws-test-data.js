/**
 * Centralized test case definitions for VV web services date-handling tests.
 *
 * Each entry is a complete, self-documenting test case definition. Category spec files
 * (e.g., ws-1-api-set.spec.js) filter this array by category and loop over matching
 * entries to generate parameterized tests.
 *
 * Field reference:
 *   id            — Unique test ID: "ws-{category}-{config}-{tz}" (e.g., "ws-1-A-BRT")
 *   category      — Category number (1-7), determines which spec file runs this test
 *   categoryName  — Human-readable category name
 *   config        — Config letter (A-H), maps to FIELD_MAP in vv-config.js
 *   tz            — Playwright project name: "BRT", "IST", or "UTC0"
 *   tzOffset      — Expected GMT offset string (for reference, may not apply to API tests)
 *   action        — Test action type: "apiSet", "apiGet", "apiRoundTrip", "apiToForms", "formsToApi"
 *   inputValue    — Value to send via API (string)
 *   expectedStored — Expected raw stored value after API set
 *   expectedApiReturn — Expected value returned by API get
 *   bugs          — Array of bug IDs this test exercises
 *   notes         — Why this test case exists and what it proves
 *   tcRef         — Path to the markdown TC spec in tasks/date-handling/web-services/
 */

const WS_TEST_DATA = [
    // ═══════════════════════════════════════════════════════════════════════
    // WS Category 1 — API Set Date
    // Create a new form record via postForms() with date values.
    // Verifies that the API stores dates correctly without client-side bugs.
    // ═══════════════════════════════════════════════════════════════════════

    // --- Config A: date-only, no flags ---
    {
        id: 'ws-1-A-BRT',
        category: 1,
        categoryName: 'API Set Date',
        config: 'A',
        tz: 'BRT',
        tzOffset: 'GMT-0300',
        action: 'apiSet',
        inputValue: '2026-03-15',
        expectedStored: '2026-03-15',
        expectedApiReturn: '2026-03-15',
        bugs: [],
        notes: 'Date-only baseline via API. No client-side normalizeCalValue() — Bug #7 should not apply.',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-1-A-BRT.md',
    },
    {
        id: 'ws-1-A-IST',
        category: 1,
        categoryName: 'API Set Date',
        config: 'A',
        tz: 'IST',
        tzOffset: 'GMT+0530',
        action: 'apiSet',
        inputValue: '2026-03-15',
        expectedStored: '2026-03-15',
        expectedApiReturn: '2026-03-15',
        bugs: [],
        notes: 'Key test: Forms UI Bug #7 shifts date in IST. API should bypass client-side JS.',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-1-A-IST.md',
    },
    {
        id: 'ws-1-A-UTC0',
        category: 1,
        categoryName: 'API Set Date',
        config: 'A',
        tz: 'UTC0',
        tzOffset: 'GMT+0000',
        action: 'apiSet',
        inputValue: '2026-03-15',
        expectedStored: '2026-03-15',
        expectedApiReturn: '2026-03-15',
        bugs: [],
        notes: 'UTC control for date-only API set.',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-1-A-UTC0.md',
    },

    // --- Config C: DateTime, no ignoreTZ ---
    {
        id: 'ws-1-C-BRT',
        category: 1,
        categoryName: 'API Set Date',
        config: 'C',
        tz: 'BRT',
        tzOffset: 'GMT-0300',
        action: 'apiSet',
        inputValue: '2026-03-15T00:00:00',
        expectedStored: null, // TBD — discover actual API storage format
        expectedApiReturn: null, // TBD
        bugs: [],
        notes: 'DateTime via API. Discover how server stores datetime without offset.',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-1-C-BRT.md',
    },
    {
        id: 'ws-1-C-IST',
        category: 1,
        categoryName: 'API Set Date',
        config: 'C',
        tz: 'IST',
        tzOffset: 'GMT+0530',
        action: 'apiSet',
        inputValue: '2026-03-15T00:00:00',
        expectedStored: null, // TBD
        expectedApiReturn: null, // TBD
        bugs: [],
        notes: 'DateTime in UTC+ via API. Does server convert to UTC?',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-1-C-IST.md',
    },

    // --- Config D: DateTime + ignoreTZ (primary bug surface in Forms) ---
    {
        id: 'ws-1-D-BRT',
        category: 1,
        categoryName: 'API Set Date',
        config: 'D',
        tz: 'BRT',
        tzOffset: 'GMT-0300',
        action: 'apiSet',
        inputValue: '2026-03-15T00:00:00',
        expectedStored: null, // TBD
        expectedApiReturn: null, // TBD
        bugs: [],
        notes: 'Bug #5/#6 surface in Forms. Does API bypass getCalendarFieldValue() on return?',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-1-D-BRT.md',
    },
    {
        id: 'ws-1-D-IST',
        category: 1,
        categoryName: 'API Set Date',
        config: 'D',
        tz: 'IST',
        tzOffset: 'GMT+0530',
        action: 'apiSet',
        inputValue: '2026-03-15T00:00:00',
        expectedStored: null, // TBD
        expectedApiReturn: null, // TBD
        bugs: [],
        notes: 'DateTime + ignoreTZ in IST via API.',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-1-D-IST.md',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // WS Category 2 — API Get Date
    // Read existing form records (created via Forms UI) via API.
    // Compares API return value against known stored value.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'ws-2-A-BRT',
        category: 2,
        categoryName: 'API Get Date',
        config: 'A',
        tz: 'BRT',
        tzOffset: 'GMT-0300',
        action: 'apiGet',
        inputValue: null, // reads existing record
        expectedStored: '2026-03-15', // known from Forms UI tests
        expectedApiReturn: '2026-03-15',
        bugs: [],
        notes: 'Read date-only field from UI-created record. API should return raw stored value.',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-2-A-BRT.md',
        savedRecord: 'cat3-A-BRT', // key into SAVED_RECORDS from vv-config.js
    },
    {
        id: 'ws-2-D-BRT',
        category: 2,
        categoryName: 'API Get Date',
        config: 'D',
        tz: 'BRT',
        tzOffset: 'GMT-0300',
        action: 'apiGet',
        inputValue: null,
        expectedStored: null, // TBD — what does API return for Config D?
        expectedApiReturn: null, // TBD — does API add fake Z like GetFieldValue?
        bugs: [],
        notes: 'Key test: Forms GetFieldValue adds fake Z (Bug #5). Does API do the same?',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-2-D-BRT.md',
        savedRecord: 'cat3-A-BRT', // same record has Config D populated
    },

    // ═══════════════════════════════════════════════════════════════════════
    // WS Category 3 — API Round-Trip
    // Set via API → get via API → set via API. Detect cumulative drift.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'ws-3-A-BRT',
        category: 3,
        categoryName: 'API Round-Trip',
        config: 'A',
        tz: 'BRT',
        tzOffset: 'GMT-0300',
        action: 'apiRoundTrip',
        inputValue: '2026-03-15',
        expectedStored: '2026-03-15',
        expectedApiReturn: '2026-03-15',
        bugs: [],
        notes: 'Date-only API round-trip. No client-side drift expected.',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-3-A-BRT.md',
        roundTripCycles: 5,
    },
    {
        id: 'ws-3-D-BRT',
        category: 3,
        categoryName: 'API Round-Trip',
        config: 'D',
        tz: 'BRT',
        tzOffset: 'GMT-0300',
        action: 'apiRoundTrip',
        inputValue: '2026-03-15T00:00:00',
        expectedStored: null, // TBD
        expectedApiReturn: null, // TBD
        bugs: [],
        notes: 'DateTime + ignoreTZ round-trip. Forms Bug #5 causes -3h/trip drift. API should be stable.',
        tcRef: 'tasks/date-handling/web-services/test-cases/tc-ws-3-D-BRT.md',
        roundTripCycles: 5,
    },
];

module.exports = { WS_TEST_DATA };
