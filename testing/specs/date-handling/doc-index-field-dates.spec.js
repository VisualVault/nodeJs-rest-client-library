/**
 * Document Index Field Date Handling Tests
 *
 * Data-driven tests for document library date storage, retrieval, and timezone
 * handling via the REST API. Test cases defined in testing/fixtures/test-data.js
 * (DOC_TEST_DATA array).
 *
 * Confirmed bugs tested:
 *   DOC-BUG-1: Timezone offset converted to UTC with Z stripped → ambiguous values
 *   DOC-BUG-2: Cannot clear a date index field once set
 *
 * Matrix: research/date-handling/document-library/matrix.md (8 categories, 52 slots)
 *
 * Prerequisites:
 *   - Test document with Date index field (per-customer config in vv-config.js)
 *   - Configured via .env.json
 *
 * Run:
 *   npx playwright test --config=testing/playwright.config.js --project=BRT-chromium testing/specs/date-handling/doc-index-field-dates.spec.js
 */
const { test, expect } = require('@playwright/test');
const { loadConfig } = require('../../fixtures/env-config');
const { customerDocConfig } = require('../../fixtures/vv-config');
const { DOC_TEST_DATA } = require('../../fixtures/test-data');
const { guardedPut } = require('../../helpers/vv-request');

const config = loadConfig();
const BASE_URL = config.baseUrl;
const API_BASE = `/api/v1/${config.customerAlias}/${config.databaseAlias}`;

const DOC_ID = customerDocConfig.testDocumentId;
const DATE_FIELD_LABEL = customerDocConfig.dateFieldLabel;

let token;

async function getToken(request) {
    if (token) return token;
    const resp = await request.post(`${BASE_URL}/OAuth/Token`, {
        form: {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            username: config.username,
            password: config.password,
            grant_type: 'password',
        },
    });
    expect(resp.ok()).toBeTruthy();
    token = (await resp.json()).access_token;
    return token;
}

async function writeDateField(request, value) {
    const t = await getToken(request);
    const resp = await guardedPut(request, `${BASE_URL}${API_BASE}/documents/${DOC_ID}/indexfields`, {
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        data: { indexFields: JSON.stringify({ [DATE_FIELD_LABEL]: value }) },
    });
    expect(resp.ok()).toBeTruthy();
}

async function readDateField(request) {
    const t = await getToken(request);
    const resp = await request.get(`${BASE_URL}${API_BASE}/documents/${DOC_ID}/indexfields`, {
        headers: { Authorization: `Bearer ${t}` },
    });
    expect(resp.ok()).toBeTruthy();
    const data = (await resp.json()).data || [];
    const field = data.find((f) => f.label === DATE_FIELD_LABEL);
    return field?.value ?? null;
}

test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// DOC-1: API Write Format Normalization
// ---------------------------------------------------------------------------
const doc1Tests = DOC_TEST_DATA.filter((t) => t.category === 1);

test.describe('DOC-1: Format Normalization', () => {
    for (const tc of doc1Tests) {
        const skip = tc.expectedStored === null; // TBD slots
        test(`${tc.id}: ${tc.notes}`, async ({ request }) => {
            if (skip) {
                // Run the test but record actual value for TBD slots
                await writeDateField(request, tc.inputValue);
                const stored = await readDateField(request);
                console.log(`[TBD] ${tc.id}: input="${tc.inputValue}" → stored="${stored}"`);
                expect(stored).toBeTruthy(); // At minimum, something was stored
                return;
            }
            await writeDateField(request, tc.inputValue);
            const stored = await readDateField(request);
            expect(stored).toBe(tc.expectedStored);
        });
    }
});

// ---------------------------------------------------------------------------
// DOC-2: Timezone Offset Handling (DOC-BUG-1)
// ---------------------------------------------------------------------------
const doc2Tests = DOC_TEST_DATA.filter((t) => t.category === 2);

test.describe('DOC-2: TZ Offset Handling (DOC-BUG-1)', () => {
    for (const tc of doc2Tests) {
        const skip = tc.expectedStored === null;
        test(`${tc.id}: ${tc.notes}`, async ({ request }) => {
            if (skip) {
                await writeDateField(request, tc.inputValue);
                const stored = await readDateField(request);
                console.log(`[TBD] ${tc.id}: input="${tc.inputValue}" → stored="${stored}"`);
                expect(stored).toBeTruthy();
                return;
            }
            await writeDateField(request, tc.inputValue);
            const stored = await readDateField(request);
            expect(stored).toBe(tc.expectedStored);

            // DOC-BUG-1 verification: response should never contain Z
            if (tc.id === 'doc-2-no-z-resp') {
                expect(stored).not.toContain('Z');
            }
        });
    }
});

// ---------------------------------------------------------------------------
// DOC-3: Field Clearing & Empty Values (DOC-BUG-2)
// ---------------------------------------------------------------------------
const doc3Tests = DOC_TEST_DATA.filter((t) => t.category === 3);

test.describe('DOC-3: Field Clearing (DOC-BUG-2)', () => {
    // Set a known value before all clearing attempts
    const SEED_VALUE = '2026-06-01T12:00:00';

    for (const tc of doc3Tests) {
        test(`${tc.id}: ${tc.notes}`, async ({ request }) => {
            // Seed with known value
            await writeDateField(request, SEED_VALUE);
            const before = await readDateField(request);
            expect(before).toBe(SEED_VALUE);

            // Attempt to clear
            await writeDateField(request, tc.inputValue);
            const after = await readDateField(request);

            // DOC-BUG-2: previous value persists for all known clearing methods
            if (tc.expectedStored === null) {
                // TBD slot — log actual behavior
                console.log(`[TBD] ${tc.id}: clear="${tc.inputValue}" → after="${after}"`);
                // Most likely persists, but log for confirmation
            } else {
                expect(after).toBe(SEED_VALUE); // BUG: should be null/empty, but persists
            }
        });
    }
});

// ---------------------------------------------------------------------------
// DOC-4: Update Path & Overwrite
// ---------------------------------------------------------------------------
const doc4Tests = DOC_TEST_DATA.filter((t) => t.category === 4);

test.describe('DOC-4: Update Path & Overwrite', () => {
    for (const tc of doc4Tests) {
        test(`${tc.id}: ${tc.notes}`, async ({ request }) => {
            // First write
            await writeDateField(request, tc.inputValue);
            const first = await readDateField(request);
            expect(first).toBeTruthy();

            // Second write (overwrite)
            await writeDateField(request, tc.inputValue2);
            const second = await readDateField(request);
            expect(second).toBe(tc.expectedStored);
        });
    }
});

// ---------------------------------------------------------------------------
// Cross-cutting verifications (not data-driven)
// ---------------------------------------------------------------------------
test.describe('Cross-cutting: Z suffix behavior', () => {
    test('API response never includes Z suffix on index field dates', async ({ request }) => {
        await writeDateField(request, '2026-03-15T14:30:00');
        const stored = await readDateField(request);
        expect(stored).not.toContain('Z');
        expect(stored).toBe('2026-03-15T14:30:00');
    });

    test('Built-in document dates include Z suffix (UTC)', async ({ request }) => {
        const t = await getToken(request);
        const resp = await request.get(`${BASE_URL}${API_BASE}/documents/${DOC_ID}`, {
            headers: { Authorization: `Bearer ${t}` },
        });
        const doc = (await resp.json()).data;

        // Built-in dates have Z — they're explicitly UTC
        expect(doc.createDate).toMatch(/Z$/);
        expect(doc.modifyDate).toMatch(/Z$/);
        // This proves the same server handles both, but index fields strip Z
    });
});

// ---------------------------------------------------------------------------
// DOC-5 through DOC-8: Future categories (require additional infrastructure)
//
// DOC-5: UI Round-Trip — needs Playwright helper for RadDateTimePicker + checkout
// DOC-6: Cross-Layer Comparison — needs forms test coordination
// DOC-7: Query & Search — needs document query API investigation
// DOC-8: DocAPI Infrastructure Differential — needs WADNR test document setup
// ---------------------------------------------------------------------------
