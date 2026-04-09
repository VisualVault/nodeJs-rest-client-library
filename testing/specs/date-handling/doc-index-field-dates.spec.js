/**
 * Document Index Field Date Handling Tests
 *
 * Verifies date storage, retrieval, and timezone handling for Document Library
 * index fields (fieldType 4 "Date Time") via the REST API.
 *
 * Confirmed bugs tested:
 *   DOC-BUG-1: Timezone offset converted to UTC with Z stripped → ambiguous values
 *   DOC-BUG-2: Cannot clear a date index field once set
 *
 * Prerequisites:
 *   - /TestFolder exists with "Date" index field assigned (fieldType 4)
 *   - Document "Test1003" in /TestFolder
 *   - Configured via .env.json (vvdemo/EmanuelJofre/Main)
 *
 * Run:
 *   npx playwright test --config=testing/playwright.config.js --project=BRT-chromium testing/specs/date-handling/doc-index-field-dates.spec.js
 */
const { test, expect } = require('@playwright/test');
const { loadConfig } = require('../../fixtures/env-config');
const { guardedPut } = require('../../helpers/vv-request');

const config = loadConfig();
const BASE_URL = config.baseUrl;
const API_BASE = `/api/v1/${config.customerAlias}/${config.databaseAlias}`;

// Test document in /TestFolder (has Date index field assigned)
const DOC_ID = '5c4c9e8c-25ca-eb11-8202-d7701a6d4070';
const DATE_FIELD_LABEL = 'Date';

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

test.describe('Document Index Field Date Handling', () => {
    test.describe('Format normalization', () => {
        test('ISO date-only → appends T00:00:00', async ({ request }) => {
            await writeDateField(request, '2026-03-15');
            const stored = await readDateField(request);
            expect(stored).toBe('2026-03-15T00:00:00');
        });

        test('US format → normalized to ISO', async ({ request }) => {
            await writeDateField(request, '03/15/2026');
            const stored = await readDateField(request);
            expect(stored).toBe('2026-03-15T00:00:00');
        });

        test('EU format (DD/MM/YYYY) → correctly parsed as day/month', async ({ request }) => {
            await writeDateField(request, '15/03/2026');
            const stored = await readDateField(request);
            // Unlike forms API (WS-BUG-2), index fields parse EU dates correctly
            expect(stored).toBe('2026-03-15T00:00:00');
        });

        test('ISO naive datetime → preserved exactly', async ({ request }) => {
            await writeDateField(request, '2026-03-15T14:30:00');
            const stored = await readDateField(request);
            expect(stored).toBe('2026-03-15T14:30:00');
        });

        test('US datetime 12h → normalized to ISO', async ({ request }) => {
            await writeDateField(request, '03/15/2026 2:30 PM');
            const stored = await readDateField(request);
            expect(stored).toBe('2026-03-15T14:30:00');
        });

        test('US datetime 24h → normalized to ISO', async ({ request }) => {
            await writeDateField(request, '03/15/2026 14:30');
            const stored = await readDateField(request);
            expect(stored).toBe('2026-03-15T14:30:00');
        });
    });

    test.describe('DOC-BUG-1: Timezone offset converted to UTC, Z stripped', () => {
        test('UTC marker (Z) silently stripped', async ({ request }) => {
            await writeDateField(request, '2026-03-15T14:30:00Z');
            const stored = await readDateField(request);
            // BUG: Z is stripped — value looks like local time but is actually UTC
            expect(stored).toBe('2026-03-15T14:30:00');
        });

        test('BRT offset (-03:00) → converted to UTC, Z stripped', async ({ request }) => {
            await writeDateField(request, '2026-03-15T14:30:00-03:00');
            const stored = await readDateField(request);
            // BUG: 14:30 BRT = 17:30 UTC, but stored without Z marker
            expect(stored).toBe('2026-03-15T17:30:00');
        });

        test('IST offset (+05:30) → converted to UTC, Z stripped', async ({ request }) => {
            await writeDateField(request, '2026-03-15T14:30:00+05:30');
            const stored = await readDateField(request);
            // BUG: 14:30 IST = 09:00 UTC, but stored without Z marker
            expect(stored).toBe('2026-03-15T09:00:00');
        });

        test('midnight BRT → shifts to 03:00 UTC (wrong day visible)', async ({ request }) => {
            await writeDateField(request, '2026-03-15T00:00:00-03:00');
            const stored = await readDateField(request);
            // BUG: midnight BRT becomes 03:00 — the date looks correct but time is wrong
            expect(stored).toBe('2026-03-15T03:00:00');
        });

        test('midnight UTC → stored as midnight, Z stripped', async ({ request }) => {
            await writeDateField(request, '2026-03-15T00:00:00Z');
            const stored = await readDateField(request);
            expect(stored).toBe('2026-03-15T00:00:00');
        });

        test('late night UTC+ → date shifts backward', async ({ request }) => {
            // 23:00 IST on March 15 = 17:30 UTC on March 15 (same day)
            await writeDateField(request, '2026-03-15T23:00:00+05:30');
            const stored = await readDateField(request);
            expect(stored).toBe('2026-03-15T17:30:00');
        });

        test('early morning UTC+ → date shifts backward across midnight', async ({ request }) => {
            // 02:00 IST on March 15 = 20:30 UTC on March 14 (PREVIOUS day!)
            await writeDateField(request, '2026-03-15T02:00:00+05:30');
            const stored = await readDateField(request);
            // BUG: Date shifts to March 14 — wrong day stored without any indication why
            expect(stored).toBe('2026-03-14T20:30:00');
        });
    });

    test.describe('DOC-BUG-2: Cannot clear date field', () => {
        test('empty string does not clear the value', async ({ request }) => {
            // First set a known value
            await writeDateField(request, '2026-06-01T12:00:00');
            const before = await readDateField(request);
            expect(before).toBe('2026-06-01T12:00:00');

            // Try to clear with empty string
            await writeDateField(request, '');
            const after = await readDateField(request);
            // BUG: value is NOT cleared — previous value persists
            expect(after).toBe('2026-06-01T12:00:00');
        });

        test('null-like values do not clear the field', async ({ request }) => {
            // Set known value
            await writeDateField(request, '2026-06-01T12:00:00');

            // Try null-like values
            for (const val of ['null', 'undefined', 'none', '0']) {
                await writeDateField(request, val);
                const stored = await readDateField(request);
                expect(stored).toBe('2026-06-01T12:00:00');
            }
        });
    });

    test.describe('No response Z suffix (unlike forms API)', () => {
        test('API response never includes Z suffix on index field dates', async ({ request }) => {
            await writeDateField(request, '2026-03-15T14:30:00');
            const stored = await readDateField(request);
            // Index fields: no Z. Forms API: always adds Z. Inconsistent.
            expect(stored).not.toContain('Z');
            expect(stored).toBe('2026-03-15T14:30:00');
        });
    });

    test.describe('Built-in document dates (for comparison)', () => {
        test('built-in dates include Z suffix (UTC)', async ({ request }) => {
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
});
