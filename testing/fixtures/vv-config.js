/**
 * Shared configuration for VV date-handling Playwright tests.
 *
 * Provides constants used by all test files and global-setup.js:
 * - VV instance credentials (loaded from testing/config/vv-config.json)
 * - DateTest form template URL (creates a fresh form instance on each load)
 * - Field configuration map (8 configs A-H mapping to VV calendar field boolean flags)
 * - Saved record URLs for reload/cross-TZ tests
 *
 * See testing/specs/date-handling/README.md for field configuration documentation.
 */
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('./env-config');

// Auth state for @playwright/test (Layer 2 — test runner).
// Separate from testing/config/auth-state.json which is used by playwright-cli (Layer 1 — command).
// Both are gitignored. See README.md "Auth Flow" section for details.
const AUTH_STATE_PATH = path.join(__dirname, '..', 'config', 'auth-state-pw.json');

const vvConfig = loadConfig();

// Per-customer form template URLs.
// Each customer has its own test harness forms with different GUIDs.
// xcid/xcdid accept alias strings (e.g., "EmanuelJofre"/"Main") as well as GUIDs.
const CUSTOMER_TEMPLATES = {
    EmanuelJofre: {
        dateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
            '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
            '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
        targetDateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=203734a0-5433-f111-ba23-0afff212cc87' +
            '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
            '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    },
    WADNR: {
        dateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d' +
            '&xcid=WADNR' +
            '&xcdid=fpOnline',
        targetDateTest:
            '/FormViewer/app?hidemenu=true' +
            '&formid=3f3a0b1a-4834-f111-8310-f323cafecf11' +
            '&xcid=WADNR' +
            '&xcdid=fpOnline',
    },
};

const customerTemplates = CUSTOMER_TEMPLATES[vvConfig.customerAlias] || CUSTOMER_TEMPLATES.EmanuelJofre;

// Per-customer document library test assets.
// Each customer needs a test folder with a Date index field and at least one test document.
const CUSTOMER_DOC_CONFIG = {
    EmanuelJofre: {
        testDocumentId: '5c4c9e8c-25ca-eb11-8202-d7701a6d4070', // Test1003 in /TestFolder
        dateFieldLabel: 'Date', // Date index field (fieldType 4) assigned to /TestFolder
        testFolderPath: '/TestFolder',
    },
    // WADNR: TBD — create zzz-prefixed test folder + document, add to writePolicy.documents[]
};

const customerDocConfig = CUSTOMER_DOC_CONFIG[vvConfig.customerAlias] || CUSTOMER_DOC_CONFIG.EmanuelJofre;

// DateTest form template URL — navigating here creates a fresh form instance with all fields empty.
// Never use a saved record URL (DataID=) for tests that need a clean state.
const FORM_TEMPLATE_URL = customerTemplates.dateTest;

// TargetDateTest form template URL — identical to DateTest except all fields have enableQListener=true.
// Used for Category 4 (URL parameter input) tests. May not be available for all customers.
const TARGET_FORM_TEMPLATE_URL = customerTemplates.targetDateTest || null;

// Field configuration map: Config letter -> VV calendar field names and boolean flags.
//
// The DateTest form has 26 fields: 8 configs (A-H) × 3 initial-value modes.
// Each config is a unique combination of three VV calendar field settings:
//   - enableTime:      false = date-only (stores "2026-03-15"), true = datetime (stores "2026-03-15T00:00:00")
//   - ignoreTimezone:  when true + enableTime, triggers Bug #5 (GetFieldValue appends fake "Z" to local times)
//   - useLegacy:       uses V1 legacy code path; legacy popup stores raw toISOString() (UTC datetime)
//
// Each config has three field variants:
//   - base (enableInitialValue=false): empty on form load — used for user-input tests (Cat 1-4, 7-12)
//   - preset (enableInitialValue=true): pre-populated with a configured date — used for Cat 5
//   - currentDate (enableInitialValue=true): auto-filled with today's date — used for Cat 6
//
// Field3/4 are duplicates of Field1/2 (not used in formal tests).
// Field8/9 do not exist (naming gap).
const FIELD_MAP = {
    A: {
        field: 'Field7',
        enableTime: false,
        ignoreTimezone: false,
        useLegacy: false,
        preset: 'Field2',
        currentDate: 'Field1',
    },
    B: {
        field: 'Field10',
        enableTime: false,
        ignoreTimezone: true,
        useLegacy: false,
        preset: 'Field27',
        currentDate: 'Field28',
    },
    C: {
        field: 'Field6',
        enableTime: true,
        ignoreTimezone: false,
        useLegacy: false,
        preset: 'Field15',
        currentDate: 'Field17',
    },
    D: {
        field: 'Field5',
        enableTime: true,
        ignoreTimezone: true,
        useLegacy: false,
        preset: 'Field16',
        currentDate: 'Field18',
    },
    E: {
        field: 'Field12',
        enableTime: false,
        ignoreTimezone: false,
        useLegacy: true,
        preset: 'Field19',
        currentDate: 'Field23',
    },
    F: {
        field: 'Field11',
        enableTime: false,
        ignoreTimezone: true,
        useLegacy: true,
        preset: 'Field20',
        currentDate: 'Field24',
    },
    G: {
        field: 'Field14',
        enableTime: true,
        ignoreTimezone: false,
        useLegacy: true,
        preset: 'Field21',
        currentDate: 'Field25',
    },
    H: {
        field: 'Field13',
        enableTime: true,
        ignoreTimezone: true,
        useLegacy: true,
        preset: 'Field22',
        currentDate: 'Field26',
    },
};

// Record definitions for global-setup.js to create before tests run.
// Each entry describes a form record to be saved via the browser UI, using the specified
// input method per field. The global setup creates these records, extracts DataIDs via
// VV.Form.DataID, and writes them to testing/config/saved-records.json.
//
// Supported methods:
//   'popup'         — selectDateViaPopup() from vv-calendar.js
//   'typed'         — typeDateInField() from vv-calendar.js
//   'setFieldValue' — setFieldValue() from vv-form.js
const RECORD_DEFINITIONS = [
    {
        key: 'cat3-A-BRT',
        tz: 'America/Sao_Paulo',
        fields: [
            { name: 'Field7', value: '03/15/2026', method: 'typed', input: { year: 2026, month: 3, day: 15 } },
            {
                name: 'Field5',
                value: '03/15/2026 12:00 AM',
                method: 'typed',
                input: { year: 2026, month: 3, day: 15 },
            },
        ],
        description: 'BRT save, Config A + D = 03/15/2026 via typed input',
    },
    {
        key: 'cat3-AD-IST',
        tz: 'Asia/Calcutta',
        fields: [
            { name: 'Field7', value: '03/15/2026', method: 'typed', input: { year: 2026, month: 3, day: 15 } },
            {
                name: 'Field5',
                value: '03/15/2026 12:00 AM',
                method: 'typed',
                input: { year: 2026, month: 3, day: 15 },
            },
        ],
        description: 'IST save, Config A + D = 03/15/2026 via typed input',
    },
    {
        key: 'cat3-C-BRT',
        tz: 'America/Sao_Paulo',
        fields: [
            {
                name: 'Field6',
                value: '03/15/2026 12:00 AM',
                method: 'popup',
                input: { year: 2026, month: 3, day: 15 },
            },
        ],
        description: 'BRT save, Config C = 03/15/2026 12:00 AM via popup',
    },
    {
        key: 'cat3-B-BRT',
        tz: 'America/Sao_Paulo',
        fields: [{ name: 'Field10', value: '03/15/2026', method: 'typed', input: { year: 2026, month: 3, day: 15 } }],
        description: 'BRT save, Config B = 03/15/2026 via typed input',
    },
    {
        key: 'cat3-G-BRT',
        tz: 'America/Sao_Paulo',
        fields: [
            {
                name: 'Field14',
                value: '03/15/2026 12:00 AM',
                method: 'typed',
                input: { year: 2026, month: 3, day: 15 },
            },
        ],
        description: 'BRT save, Config G (legacy DateTime) = 03/15/2026 12:00 AM via typed input',
    },
    {
        key: 'cat3-EF-BRT',
        tz: 'America/Sao_Paulo',
        fields: [
            { name: 'Field12', value: '03/15/2026', method: 'typed', input: { year: 2026, month: 3, day: 15 } },
            { name: 'Field11', value: '03/15/2026', method: 'typed', input: { year: 2026, month: 3, day: 15 } },
        ],
        description: 'BRT save, Config E + F (legacy date-only) = 03/15/2026 via typed input',
    },
    {
        key: 'cat3-H-BRT',
        tz: 'America/Sao_Paulo',
        fields: [
            {
                name: 'Field13',
                value: '03/15/2026 12:00 AM',
                method: 'typed',
                input: { year: 2026, month: 3, day: 15 },
            },
        ],
        description: 'BRT save, Config H (legacy DateTime + ignoreTZ) = 03/15/2026 12:00 AM via typed input',
    },
    {
        key: 'cat3-B-IST',
        tz: 'Asia/Calcutta',
        fields: [{ name: 'Field10', value: '03/15/2026', method: 'typed', input: { year: 2026, month: 3, day: 15 } }],
        description: 'IST save, Config B (date-only + ignoreTZ) = 03/15/2026 via typed input',
    },
];

// Fallback saved records for backward compatibility — used when saved-records.json
// doesn't exist (e.g., running a single test without full setup). These are hardcoded
// to the vvdemo EmanuelJofre/Main database and won't work in other environments.
// Other customers (WADNR) must run global-setup.js to create their own records.
const HARDCODED_SAVED_RECORDS = {
    'cat3-A-BRT':
        '/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-AD-IST':
        '/FormViewer/app?DataID=28e371b7-e4e2-456a-94ab-95105ad97d0e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-C-BRT':
        '/FormViewer/app?DataID=6d2f720d-8621-4a97-a751-90c4cc8588b6&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-B-BRT':
        '/FormViewer/app?DataID=c63dea33-867e-49e2-b929-fb226b6d3933&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-C-IST':
        '/FormViewer/app?DataID=278aee29-1141-4165-8769-e33869a5056e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-EF-BRT':
        '/FormViewer/app?DataID=bd05735a-f322-4ba5-9f49-d974c797489f&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-H-BRT':
        '/FormViewer/app?DataID=e154623d-d931-411b-a7e8-3699447e0ddf&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-B-IST':
        '/FormViewer/app?DataID=6335170b-6803-4dc9-8390-d5617e1d7f64&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
};

const SAVED_RECORDS_PATH = path.join(__dirname, '..', 'config', 'saved-records.json');

/**
 * Get saved record URLs. Reads from saved-records.json (created by global-setup.js)
 * if available, otherwise falls back to hardcoded records for the vvdemo environment.
 */
function getSavedRecords() {
    if (fs.existsSync(SAVED_RECORDS_PATH)) {
        return JSON.parse(fs.readFileSync(SAVED_RECORDS_PATH, 'utf8'));
    }
    return HARDCODED_SAVED_RECORDS;
}

const SAVED_RECORDS = getSavedRecords();

module.exports = {
    vvConfig,
    AUTH_STATE_PATH,
    CUSTOMER_TEMPLATES,
    CUSTOMER_DOC_CONFIG,
    customerDocConfig,
    FORM_TEMPLATE_URL,
    TARGET_FORM_TEMPLATE_URL,
    FIELD_MAP,
    SAVED_RECORDS,
    RECORD_DEFINITIONS,
};
