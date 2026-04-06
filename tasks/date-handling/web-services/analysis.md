# Web Services Date Handling - Analysis

## Document Purpose

This document analyzes date handling behavior in the VisualVault REST API when creating and updating form records via web services (Node.js client library). It covers how dates are sent, stored, and returned through the API, and documents any discrepancies with Forms UI behavior.

## Scope

Web services interact with form data through the VV REST API:

- **Create form instance**: `POST /formtemplates/{id}/forms` — creates a new form record with field values
- **Update form instance**: `POST /formtemplates/{id}/forms/{formId}` — creates a new revision with updated fields
- **Get form instances**: `GET /formtemplates/{id}/forms` — retrieves form records with field values
- **Get form instance by ID**: `GET /formtemplates/{id}/forms/{formId}` — retrieves a single form record

Node.js client methods:

- `vvClient.forms.postForms(params, data, formTemplateId)` — create
- `vvClient.forms.postFormRevision(params, data, formTemplateId, formId)` — update
- `vvClient.forms.getForms(params, formTemplateId)` — query
- `vvClient.forms.getFormInstanceById(templateId, instanceId)` — get single

## Key Questions

1. **What date formats does the API accept?** — ISO 8601 (`2026-03-15`), datetime (`2026-03-15T00:00:00`), with/without Z suffix?
2. **What date formats does the API return?** — Same as stored? Transformed? With timezone info?
3. **Does the API apply the same transformations as `SetFieldValue`/`GetFieldValue`?** — Or does it bypass the Forms JS layer entirely?
4. **Is there timezone sensitivity?** — Does the server apply timezone conversions, or is it timezone-agnostic?
5. **Round-trip integrity**: Can a date be read via API, written back via API, and remain unchanged?
6. **Cross-layer consistency**: Does a date set via API produce the same stored value as the same date set via Forms UI?

## API Request/Response Format

### Create Form Instance

```javascript
const formData = {
    Field7: '2026-03-15', // date-only
    Field5: '2026-03-15T00:00:00', // datetime
};

const params = {};
const resp = await vvClient.forms.postForms(params, formData, FORM_TEMPLATE_ID);
const result = JSON.parse(resp);
// result.data — created form record
// result.meta — status info
```

### Query Form Instance

```javascript
const params = {
    fields: 'id, dataField7, dataField5, revisionId',
    q: `instanceName eq 'DateTest-000100'`,
};
const resp = await vvClient.forms.getForms(params, FORM_TEMPLATE_ID);
const result = JSON.parse(resp);
// result.data[0].dataField7 — returned date value (format TBD)
```

## Confirmed Infrastructure Findings

### Node.js library is a transparent passthrough (confirmed 2026-04-02)

Analysis of the upstream `VisualVault/nodeJs-rest-client-library` (stock code, zero local modifications to `lib/`) confirms:

- **No date transformation** occurs at any layer between script code and the VV server
- `postForms()` / `postFormRevision()` pass field data directly to the `request` library's `JSON.stringify()`
- String values pass through as-is; JavaScript `Date` objects would be serialized to ISO 8601 with Z suffix
- Response parsing (`JSON.parse()`) returns date values as strings — never converted to Date objects
- `formFieldCollection` is a pure lookup wrapper with no value transformation
- `dateHelper` utility class exists in `common.js` but is never invoked in the request/response flow
- VV API returns field names **lowercased** (`datafield7` not `Field7`) in responses

**Implication**: Any date behavior differences between API and Forms must originate from either the **VV server** or the **Forms client-side JS** — not the Node.js intermediary.

Full documentation: `docs/guides/scripting.md`

---

## Hypothesized Behaviors

Based on Forms UI analysis (`../forms-calendar/analysis.md`) and upstream library analysis:

| #    | Hypothesis                                                                       | Rationale                                                              | Category | Priority |
| ---- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | :------: | -------- |
| H-1  | API bypasses `normalizeCalValue()` — no Bug #7 (date-only wrong day in UTC+)     | Bug #7 is client-side JS; API sends strings                            |   WS-1   | HIGH     |
| H-2  | API returns raw stored value — no Bug #5 (fake Z suffix)                         | Bug #5 is in `getCalendarFieldValue()` (Forms JS only)                 |   WS-2   | HIGH     |
| H-3  | API returns empty/null for empty fields — no Bug #6 ("Invalid Date")             | Bug #6 is in `getCalendarFieldValue()` (Forms JS only)                 |   WS-6   | MEDIUM   |
| H-4  | Server TZ does not affect API write — strings stored as-is                       | Node.js library sends strings, no Date object conversion               |   WS-1   | HIGH     |
| H-5  | API accepts ISO 8601 and US date formats at minimum                              | VV ecosystem uses both formats                                         |   WS-5   | MEDIUM   |
| H-6  | Date set via API displays correctly in Forms (BRT) but may show Bug #7 in IST    | `initCalendarValueV1` applies `moment(e).toDate()` on load             |   WS-4   | HIGH     |
| H-7  | Forms-saved values (including buggy ones) are readable via API as-is             | API reads raw DB, no Forms JS overlay                                  |   WS-2   | HIGH     |
| H-8  | API round-trip is drift-free                                                     | No Bug #5 fake Z in API read path                                      |   WS-3   | MEDIUM   |
| H-9  | `postFormRevision` preserves unmentioned fields                                  | Standard REST partial-update behavior                                  |   WS-7   | MEDIUM   |
| H-10 | OData date filters match stored format                                           | Query engine compares against DB column                                |   WS-8   | MEDIUM   |
| H-11 | Date objects serialized with Z suffix are handled differently than plain strings | `JSON.stringify(new Date())` → ISO+Z; VV server may convert or strip Z |   WS-9   | HIGH     |
| H-12 | US-format `new Date("03/15/2026")` produces different API results per server TZ  | Local midnight varies: BRT=T03:00Z, IST=prev-dayT18:30Z, UTC=T00:00Z   |   WS-9   | HIGH     |

## Confirmed Behaviors (2026-04-02)

**Run**: [ws-1-ws-2-batch-run-1.md](runs/ws-1-ws-2-batch-run-1.md) — 32 tests (16 WS-1 + 16 WS-2), all PASS.

| #    | Behavior                                                                                  | Evidence                                                                    | Hypotheses                                |
| ---- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| CB-1 | API bypasses Bug #7 — date-only strings stored correctly in all TZs                       | WS-1: `"2026-03-15"` → `"2026-03-15T00:00:00Z"` in BRT, IST, UTC            | H-1, H-4 confirmed                        |
| CB-2 | API returns raw stored values without Bug #5 fake Z                                       | WS-2: Config D returns `"2026-03-15T00:00:00Z"` (real Z from normalization) | H-2 confirmed                             |
| CB-3 | Unset date fields return `null` from API (not `""` or `"Invalid Date"`)                   | WS-2: Configs B,C,E,F,G,H on both records → `null`                          | H-3 partially confirmed                   |
| CB-4 | Server TZ has no effect on API write — strings stored as-is                               | WS-1: BRT, IST, UTC all produce identical stored values                     | H-4 confirmed                             |
| CB-5 | Forms-saved buggy values readable via API as-is                                           | WS-2: IST Config A returns `"2026-03-14T00:00:00Z"` (Bug #7 -1 day in DB)   | H-7 confirmed                             |
| CB-6 | Field config flags (enableTime, ignoreTimezone, useLegacy) have NO effect on API behavior | WS-1: All 8 configs store and return identically per input type             | New finding                               |
| CB-7 | API normalizes ALL dates to ISO 8601 datetime+Z on read                                   | WS-1+WS-2: date-only `"2026-03-15"` returns as `"2026-03-15T00:00:00Z"`     | New finding — cross-layer format mismatch |

### Confirmed 2026-04-02 (WS-3, WS-4)

**Run**: [ws-3-batch-run-1.md](runs/ws-3-batch-run-1.md) — 4 tests, all PASS.
**Run**: [ws-4-batch-run-1.md](runs/ws-4-batch-run-1.md) — 8 tests, 2 PASS / 6 FAIL.

| #     | Behavior                                                                                 | Evidence                                                                                    | Hypotheses            |
| ----- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------- |
| CB-8  | API Z normalization causes cross-layer datetime shift when opened in Forms               | WS-4: `"T14:30:00"` → stored `"T14:30:00Z"` → Forms displays 11:30 AM (BRT) / 8:00 PM (IST) | New finding           |
| CB-9  | API round-trip is drift-free across all configs (date-only and datetime)                 | WS-3: 2 cycles, 4 configs, all zero drift                                                   | H-8 confirmed         |
| CB-10 | Bug #7 does NOT manifest on Forms load/display path for date-only fields loaded from API | WS-4: Config A IST displays `03/15/2026` (correct) — Kendo shows local date from Date obj   | H-6 partially refuted |
| CB-11 | ignoreTZ=true preserves display but not rawValue when loading API-stored datetimes       | WS-4: Config D/H display 2:30 PM but rawValue shifted to 11:30/20:00                        | New finding           |

### Confirmed 2026-04-02 (WS-5)

**Run**: [ws-5-batch-run-1.md](runs/ws-5-batch-run-1.md) — 32 tests, 23 PASS / 9 FAIL.

| #     | Behavior                                                                               | Evidence                                                                         | Hypotheses    |
| ----- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------- |
| CB-12 | Server converts TZ offsets to UTC on write                                             | WS-5: `"T14:30:00-03:00"` → `"T17:30:00Z"`, `"T14:30:00+05:30"` → `"T09:00:00Z"` | New finding   |
| CB-13 | Server strips milliseconds from datetime values                                        | WS-5: `"T14:30:00.000Z"` → `"T14:30:00Z"`                                        | New finding   |
| CB-14 | Server accepts US, ISO, DB, YYYY/DD, YYYY.DD, English month, abbreviated month formats | WS-5: all accepted and correctly normalized to ISO 8601                          | H-5 confirmed |
| CB-15 | DD/MM/YYYY formats silently stored as null (Bug #8)                                    | WS-5: `"15/03/2026"`, `"15-03-2026"`, `"15.03.2026"` → null, no error            | New finding   |
| CB-16 | Ambiguous dates interpreted as MM/DD (US) not DD/MM (Bug #8b)                          | WS-5: `"05/03/2026"` → May 3 (`2026-05-03`), not March 5                         | New finding   |
| CB-17 | Compact ISO format (`20260315`) silently stored as null                                | WS-5: accepted, stored null                                                      | New finding   |

### Confirmed 2026-04-02 (WS-6)

**Run**: [ws-6-batch-run-1.md](runs/ws-6-batch-run-1.md) — 12 tests, all PASS.

| #     | Behavior                                                                       | Evidence                                                          | Hypotheses          |
| ----- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------- |
| CB-18 | All empty/null/special values store `null` — no Bug #6 via API                 | WS-6: `""`, `null`, omit, `"null"`, `"Invalid Date"` all → `null` | H-3 fully confirmed |
| CB-19 | Empty string via `postFormRevision` clears existing date values                | WS-6: clearUpd scenario: before=`"T00:00:00Z"`, after=`null`      | New finding         |
| CB-20 | `"Invalid Date"` string (Bug #6 output) is safely rejected by API, stores null | WS-6: not stored as string — safe round-trip from buggy Forms GFV | New finding         |

### Confirmed 2026-04-02 (WS-7)

**Run**: [ws-7-batch-run-1.md](runs/ws-7-batch-run-1.md) — 12 tests, all PASS.

| #     | Behavior                                                                                      | Evidence                                   | Hypotheses    |
| ----- | --------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------- |
| CB-21 | `postFormRevision()` preserves omitted fields, replaces included fields, adds to empty fields | WS-7: 3 scenarios × 4 configs, all correct | H-9 confirmed |

### Confirmed 2026-04-02 (WS-8)

**Run**: [ws-8-batch-run-1.md](runs/ws-8-batch-run-1.md) — 10 tests, all PASS.

| #     | Behavior                                                                           | Evidence                                                                  | Hypotheses     |
| ----- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------- |
| CB-22 | OData query filters normalize date formats — US, ISO, Z suffix all match correctly | WS-8: all 10 queries return expected results                              | H-10 confirmed |
| CB-23 | Date-only range queries work on DateTime fields (date interpreted as midnight)     | WS-8: `ge '2026-03-15' AND le '2026-03-16'` matches `"T14:30:00Z"` record | New finding    |

### Confirmed 2026-04-02 (WS-9)

**Run**: [ws-9-batch-run-1.md](runs/ws-9-batch-run-1.md) — 23 tests, 17 PASS / 6 FAIL.

| #     | Behavior                                                                                    | Evidence                                                  | Hypotheses     |
| ----- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------- |
| CB-24 | Date objects serialized with Z are stored correctly (ms stripped)                           | WS-9: `"T00:00:00.000Z"` → `"T00:00:00Z"` consistently    | H-11 confirmed |
| CB-25 | US-format `new Date()` produces different stored values per server TZ                       | WS-9: BRT=`T03:00Z`, IST=`Mar14 T18:30Z`, UTC=`T00:00Z`   | H-12 confirmed |
| CB-26 | `new Date(year, month, day)` is equally TZ-unsafe as US format parse                        | WS-9: identical serialization to `new Date("MM/DD/YYYY")` | New finding    |
| CB-27 | `toLocaleDateString()` returns wrong date in UTC- timezones for UTC-midnight dates          | WS-9: BRT → `"3/14/2026"` for a March 15 UTC date         | New finding    |
| CB-28 | TZ-safe patterns: ISO parse, Date.UTC(), setUTCDate/getUTCDate, toISOString().split('T')[0] | WS-9: all produce identical results in BRT/IST/UTC        | New finding    |

### Confirmed 2026-04-06 (WS-10)

**Run**: [ws-10-batch-run-1.md](runs/ws-10-batch-run-1.md) — 12 tests, 2 PASS / 10 FAIL. Freshdesk #124697 investigation.

| #     | Behavior                                                                                                 | Evidence                                                                                                                | Hypotheses                          |
| ----- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| CB-29 | `postForms` and `forminstance/` store dates in **different formats** in the database                     | WS-10B: `FormInstance/Controls` returns `"2026-03-15T14:30:00Z"` (postForms) vs `"03/15/2026 14:30:00"` (forminstance/) | New finding — ROOT CAUSE of #124697 |
| CB-30 | Core API read normalizes both formats to ISO+Z, masking the storage difference                           | WS-10: `getForms` returns `"2026-03-15T14:30:00Z"` for both records (storedMatch=true)                                  | New finding                         |
| CB-31 | `forminstance/` records are immune to CB-8 — Forms V1 parses US format as local time (no UTC conversion) | WS-10A: forminstance/ records show rawValue=`T14:30:00` in BRT and IST (no shift)                                       | #124697 confirmed                   |
| CB-32 | `postForms` Config D first-open display mutation exactly matches Freshdesk #124697 report                | WS-10C: display `02:30 PM` → `11:30 AM` after save+reopen, stable after first mutation                                  | #124697 confirmed                   |

**CB-29 detail**: The `forminstance/` endpoint (FormsAPI at `preformsapi.visualvault.com`) writes field values in US format (`"MM/DD/YYYY HH:mm:ss"`) without timezone indicator. The `postForms` endpoint (core API at `vvdemo.visualvault.com`) writes field values in ISO 8601 with Z suffix (`"YYYY-MM-DDTHH:mm:ssZ"`). The form viewer's `initCalendarValueV1` function interprets:

- ISO+Z strings → as UTC → converts to local time (CB-8 shift)
- US format strings → as local time → no conversion (preserves original)

This explains why the ticket's workaround (switching from `postForms` to `forminstance/`) fixes the time mutation — it's not a client-side fix but a storage format change that avoids triggering the V1 UTC interpretation.

## Confirmed Bugs

### Bug #8 — Silent Data Loss for DD/MM/YYYY Formats (NEW — SERVER-SIDE)

**Severity**: HIGH for Latin American and European developers.

The VV server's date parser does not recognize day-first date formats. All DD/MM/YYYY variants (`15/03/2026`, `15-03-2026`, `15.03.2026`) are accepted by the API (HTTP 200, record created) but the date field is stored as `null`. No error message in the response. Complete silent data loss.

For ambiguous dates where day ≤ 12 (e.g., `05/03/2026`), the server interprets as MM/DD (US format) — storing May 3rd instead of March 5th. No error, wrong data stored silently.

**Impact**: Any script using `new Date().toLocaleDateString('es-AR')` or similar LATAM locale formatting will produce DD/MM/YYYY strings that cause silent data loss or wrong dates when sent to the API.

**Previously confirmed**: All Forms bugs (Bug #5, #6, #7) are client-side only.

**Cross-layer impact**: Bug #7 damage persists in the database and is visible via API (CB-5). The API can read the wrong date but cannot cause it — only Forms `SetFieldValue` / calendar popup can write the wrong date.

**Cross-layer datetime shift (CB-8)**: When a datetime is written via API without Z suffix (intended as local time), the VV server appends Z. When Forms loads this value, V1 `initCalendarValueV1` interprets the Z as real UTC and converts to local time. The rawValue stored in the form after load is permanently shifted by the user's TZ offset. This affects all production scripts that create/update datetime fields — the stored time will be wrong when viewed in Forms by users outside UTC+0.

---

## Cross-Layer Design Inconsistency: No Server-Side Date-Only Enforcement

**Severity**: Design flaw — not a bug in any single component, but a systemic inconsistency that affects queries, reports, dashboards, and cross-component workflows.

### The Problem

The VV server has **no date-only storage type**. Every date field is stored as a datetime in the database, regardless of the `enableTime` flag. The "date-only" semantic exists only in the Forms client-side JS (`getSaveValue()`, `normalizeCalValue()`) — the API and database have no concept of it.

This means the same "date-only" field (e.g., Config A: `enableTime=false`) can contain different time components depending on the code path that wrote the value:

| Write Source                       | Value stored for "March 15, 2026" | Time Component                         |
| ---------------------------------- | --------------------------------- | -------------------------------------- |
| Forms popup (BRT, UTC-3)           | `"2026-03-15T00:00:00Z"`          | UTC midnight                           |
| Forms popup (IST, UTC+5:30)        | `"2026-03-14T00:00:00Z"`          | UTC midnight of **wrong day** (Bug #7) |
| Forms preset "3/1/2026" (BRT)      | `"2026-03-01T03:00:00Z"`          | BRT midnight = 3am UTC                 |
| Forms Current Date (BRT, 8pm)      | `"2026-03-31T23:01:57Z"`          | Actual timestamp                       |
| Forms legacy popup (BRT)           | `"2026-03-15T03:00:00.000Z"`      | BRT midnight as UTC with ms            |
| API string `"2026-03-15"`          | `"2026-03-15T00:00:00Z"`          | UTC midnight                           |
| API string `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"`          | Arbitrary time (no enforcement)        |

### Evidence

From WS-2 debug output (DateTest-000080, saved from BRT):

```
dataField7  (Config A, popup):       "2026-03-15T00:00:00Z"  ← UTC midnight
dataField1  (Config A, Current Date): "2026-03-31T23:01:57Z"  ← actual timestamp
dataField2  (Config A, preset):       "2026-03-01T03:00:00Z"  ← BRT midnight (3am UTC)
dataField19 (Config E, legacy preset): "2026-03-01T03:00:00Z"  ← same BRT midnight
```

All four fields have `enableTime=false` (date-only), yet the DB stores four different time components.

From WS-1: the API writes `"2026-03-15T14:30:00"` to a date-only field and the server accepts it without error. Field config flags are invisible to the API layer (CB-6).

### Impact

1. **SQL queries**: `WHERE Field7 = '2026-03-15'` may not match `"2026-03-15T03:00:00Z"` (preset) or `"2026-03-15T23:01:57Z"` (Current Date). Range queries (`>= '2026-03-15' AND < '2026-03-16'`) are needed but still fail for Bug #7 records where the day is wrong.

2. **Dashboard date filters**: May show inconsistent results for records created via different code paths (popup vs preset vs API vs Current Date).

3. **Report date grouping**: Records for the "same" date may group differently depending on the time component.

4. **API round-trip ambiguity**: A script reading a "date-only" field via API gets `"2026-03-15T14:30:00Z"` — it cannot tell if the time is meaningful or noise. Should it preserve `T14:30:00` when writing back, or normalize to `T00:00:00`?

5. **Cross-layer consistency**: A record saved via Forms popup and one saved via API for the same date will have the same date but potentially different time components, leading to query mismatches.

### Root Cause

The `enableTime`, `ignoreTimezone`, and `useLegacy` flags are **client-side presentation/behavior flags** that control how the Forms calendar component formats and displays dates. They are not enforced at the API or database level. The VV server treats every date field identically — as a datetime column.

## Related

Environment setup, test execution, and file index: see [`README.md`](README.md).

| Reference               | Location                                         |
| ----------------------- | ------------------------------------------------ |
| Forms calendar analysis | `../forms-calendar/analysis.md`                  |
| Forms confirmed bugs    | `../forms-calendar/analysis.md` § Confirmed Bugs |
| Test matrix             | `matrix.md`                                      |
| Test harness            | `webservice-test-harness.js`                     |
| Form button script      | `ws-harness-button.js`                           |
| WS call pattern ref     | `web-service-call-pattern.js`                    |
| Script pattern template | `webservice-pattern.js`                          |
| Scripting data flow     | `docs/guides/scripting.md`                       |
| Node.js client library  | `lib/VVRestApi/VVRestApiNodeJs/VVRestApi.js`     |
| Forms API               | `lib/VVRestApi/VVRestApiNodeJs/FormsApi.js`      |
| API config (endpoints)  | `lib/VVRestApi/VVRestApiNodeJs/config.yml`       |
| Overall investigation   | `../CLAUDE.md`                                   |
