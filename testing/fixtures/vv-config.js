/**
 * Shared configuration for VV date-handling Playwright tests.
 *
 * Provides constants used by all test files and global-setup.js:
 * - VV instance credentials (loaded from testing/config/vv-config.json)
 * - DateTest form template URL (creates a fresh form instance on each load)
 * - Field configuration map (8 configs A-H mapping to VV calendar field boolean flags)
 * - Saved record URLs for reload/cross-TZ tests
 *
 * See testing/date-handling/README.md for field configuration documentation.
 */
const path = require('path');
const fs = require('fs');

const VV_CONFIG_PATH = path.join(__dirname, '..', 'config', 'vv-config.json');

// Auth state for @playwright/test (Layer 2 — test runner).
// Separate from testing/config/auth-state.json which is used by playwright-cli (Layer 1 — command).
// Both are gitignored. See README.md "Auth Flow" section for details.
const AUTH_STATE_PATH = path.join(__dirname, '..', 'config', 'auth-state-pw.json');

const vvConfig = JSON.parse(fs.readFileSync(VV_CONFIG_PATH, 'utf8'));

// DateTest form template URL — navigating here creates a fresh form instance with all fields empty.
// The formid, xcid, and xcdid GUIDs identify the DateTest form template in the VV demo environment.
// Never use a saved record URL (DataID=) for tests that need a clean state.
const FORM_TEMPLATE_URL =
    '/FormViewer/app?hidemenu=true' +
    '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

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
// DataField3/4 are duplicates of DataField1/2 (not used in formal tests).
// DataField8/9 do not exist (naming gap).
const FIELD_MAP = {
    A: {
        field: 'DataField7',
        enableTime: false,
        ignoreTimezone: false,
        useLegacy: false,
        preset: 'DataField2',
        currentDate: 'DataField1',
    },
    B: {
        field: 'DataField10',
        enableTime: false,
        ignoreTimezone: true,
        useLegacy: false,
        preset: 'DataField27',
        currentDate: 'DataField28',
    },
    C: {
        field: 'DataField6',
        enableTime: true,
        ignoreTimezone: false,
        useLegacy: false,
        preset: 'DataField15',
        currentDate: 'DataField17',
    },
    D: {
        field: 'DataField5',
        enableTime: true,
        ignoreTimezone: true,
        useLegacy: false,
        preset: 'DataField16',
        currentDate: 'DataField18',
    },
    E: {
        field: 'DataField12',
        enableTime: false,
        ignoreTimezone: false,
        useLegacy: true,
        preset: 'DataField19',
        currentDate: 'DataField23',
    },
    F: {
        field: 'DataField11',
        enableTime: false,
        ignoreTimezone: true,
        useLegacy: true,
        preset: 'DataField20',
        currentDate: 'DataField24',
    },
    G: {
        field: 'DataField14',
        enableTime: true,
        ignoreTimezone: false,
        useLegacy: true,
        preset: 'DataField21',
        currentDate: 'DataField25',
    },
    H: {
        field: 'DataField13',
        enableTime: true,
        ignoreTimezone: true,
        useLegacy: true,
        preset: 'DataField22',
        currentDate: 'DataField26',
    },
};

// Saved record URLs for reload tests (Category 3 — Server Reload).
// These are pre-saved DateTest records with known field values, used to test
// how VV renders stored dates when loading from the server in different timezones.
const SAVED_RECORDS = {
    // Saved from BRT on 2026-03-31, Config A + D set to 03/15/2026
    'DateTest-000080':
        '/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    // Saved from IST on 2026-04-01, Config A + D set to 03/15/2026
    'DateTest-000084':
        '/FormViewer/app?DataID=28e371b7-e4e2-456a-94ab-95105ad97d0e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
};

module.exports = { vvConfig, AUTH_STATE_PATH, FORM_TEMPLATE_URL, FIELD_MAP, SAVED_RECORDS };
