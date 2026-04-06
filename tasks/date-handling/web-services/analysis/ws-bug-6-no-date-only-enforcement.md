# WS-6: No Server-Side Date-Only Type Enforcement (Design Flaw)

## Classification

| Field                  | Value                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**               | Design Flaw                                                                                                                                                       |
| **Severity**           | MEDIUM                                                                                                                                                            |
| **Evidence**           | `[DESIGN]` — Confirmed via WS-1, WS-2, WS-8, and cross-reference with Forms calendar testing                                                                      |
| **Component**          | VV Server — field type enforcement (absent) + database schema (no date-only column type)                                                                          |
| **Code Path**          | `postForms()` / `postFormRevision()` → server stores any datetime value in any date field                                                                         |
| **Affected Configs**   | All date-only configs (A, B, E, F — `enableTime=false`). The issue does not exist for DateTime configs (C, D, G, H) where a time component is expected.           |
| **Affected TZs**       | All — the inconsistency manifests differently per write path and user timezone                                                                                    |
| **Affected Scenarios** | Queries, reports, dashboards filtering or grouping on date-only fields                                                                                            |
| **Related Bugs**       | Compounds with Forms Bug #7 (UTC+ users store wrong day). Affects WS-BUG-1 remediation strategy (fixing the Z normalization does not fix the mixed-time problem). |

---

## Summary

The VV platform has no date-only storage type. Every calendar field — regardless of whether `enableTime` is true or false — is stored as a full datetime value in the database. The "date-only" concept exists only in the Forms client-side JavaScript, which formats and displays the value accordingly. The API and database have no awareness of this distinction.

This means the same date-only field (`enableTime=false`) can contain wildly different time components depending on **which code path wrote the value**:

| Write Path                         | Stored for "March 15, 2026"  | Time Component                          |
| ---------------------------------- | ---------------------------- | --------------------------------------- |
| Forms popup (BRT)                  | `"2026-03-15T00:00:00Z"`     | UTC midnight                            |
| Forms popup (IST)                  | `"2026-03-14T00:00:00Z"`     | UTC midnight of **wrong day** (Bug #7)  |
| Forms preset "3/1/2026" (BRT)      | `"2026-03-01T03:00:00Z"`     | BRT midnight = 3:00 AM UTC              |
| Forms Current Date (BRT, 8pm)      | `"2026-03-31T23:01:57Z"`     | Actual timestamp at save time           |
| Forms legacy popup (BRT)           | `"2026-03-15T03:00:00.000Z"` | BRT midnight as UTC, with ms            |
| API string `"2026-03-15"`          | `"2026-03-15T00:00:00Z"`     | UTC midnight                            |
| API string `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"`     | 2:30 PM — **arbitrary, no enforcement** |

All seven rows represent the "same" date in the "same" date-only field — yet they have six different time components. This is not a bug in any single component; it's a systemic design inconsistency where the date-only semantic is not enforced at the storage layer.

---

## Who Is Affected

### Query authors and report builders

Anyone writing OData filters, SQL queries, dashboard filters, or report criteria against date-only fields. An exact-equality query like `[Field7] eq '2026-03-15'` may match records written via API (UTC midnight) but miss records written via Forms preset (3:00 AM UTC) or Forms Current Date (arbitrary timestamp).

### Script developers reading date-only fields

A script reading a date-only field via `getForms()` receives a full datetime string like `"2026-03-15T14:30:00Z"`. Without field metadata, the script cannot determine whether the `T14:30:00` time component is meaningful data or noise from a write path that didn't enforce date-only. Should the script preserve the time when writing back? Normalize to midnight? There is no programmatic way to decide.

### Dashboard and report consumers

Records for the "same" date may group differently in dashboards or reports if the grouping logic uses the full datetime rather than just the date portion. A March 15 record stored as `T00:00:00Z` and another as `T14:30:00Z` could appear in different time-based groupings.

### Not directly affected

Users interacting with Forms in the browser — the client-side JS strips the time component for display in date-only fields, so users always see a clean date regardless of the stored time component.

---

## Root Cause

### Field configuration flags are client-side only

The three field configuration flags — `enableTime`, `ignoreTimezone`, and `useLegacy` — are defined in the form template and consumed by the Forms Angular client. They control:

- Whether the Kendo date picker shows a time input (`enableTime`)
- Whether the display applies timezone conversion (`ignoreTimezone`)
- Whether the legacy code path is used (`useLegacy`)

None of these flags are read, enforced, or even available to the VV server's API layer. When `postForms()` receives a field value, it processes it through the same date parser regardless of field configuration (CB-6).

### Database stores datetime, not date

The database column for every calendar field is a datetime type (or equivalent). There is no date-only column. Even Forms' own save logic (`getSaveValue()`) stores a full datetime — it just normalizes the time to midnight for date-only fields. But this normalization is client-side; other write paths don't apply it.

### The API has no field metadata awareness

The `postForms()` endpoint receives a flat key-value object: `{ Field7: "2026-03-15T14:30:00" }`. It does not look up Field7's configuration to check whether `enableTime=false`. It simply parses the date string and stores the result. The server is structurally incapable of enforcing date-only semantics without a design change.

---

## Expected vs Actual Behavior

### Expected: date-only fields should have consistent time components

If a field is configured as `enableTime=false`, all stored values should normalize to midnight (or have no time component). The date portion should be the only meaningful data.

### Actual: time components vary by write path

Evidence from DB dump (`DataTest.xlsx`, 2026-04-06) for DateTest-000080 (BRT-saved record):

| Field  | Config | Write Source            | DB Value (`datetime`)     | Time Component              |
| ------ | :----: | ----------------------- | ------------------------- | --------------------------- |
| Field7 |   A    | Forms popup (BRT)       | `2026-03-15 00:00:00.000` | midnight                    |
| Field1 |   A    | Current Date (BRT, 8pm) | `2026-03-31 23:01:57.000` | 23:01:57                    |
| Field2 |   A    | Preset "3/1/2026" (BRT) | `2026-03-01 03:00:00.000` | 03:00 (BRT midnight as UTC) |

And from DateTest-001711 / DateTest-001712 (API-created):

| Field  | Config | Input                              | DB Value (`datetime`)     | Time Component             |
| ------ | :----: | ---------------------------------- | ------------------------- | -------------------------- |
| Field7 |   A    | `"2026-03-15"` (date-only)         | `2026-03-15 00:00:00.000` | midnight                   |
| Field7 |   A    | `"2026-03-15T14:30:00"` (datetime) | `2026-03-15 14:30:00.000` | **14:30 — no enforcement** |

All fields have `enableTime=false` (date-only). The DB column is SQL Server `datetime` — it stores whatever value the server parsed, with no date-only normalization. The time component varies by write path.

### API write path — no enforcement

From WS-1 testing (CB-6):

```bash
# Send a datetime string to a date-only field (Config A, enableTime=false)
node run-ws-test.js --action WS-1 --configs A --input-date "2026-03-15T14:30:00"
# → stored: "2026-03-15T14:30:00Z"
# The server accepted a 2:30 PM time in a date-only field without error.

# Send a date-only string to the same field
node run-ws-test.js --action WS-1 --configs A --input-date "2026-03-15"
# → stored: "2026-03-15T00:00:00Z"
# Both values accepted identically — server does not distinguish.
```

---

## Steps to Reproduce

### Demonstrate mixed time components in a single date-only field

```bash
# 1. Create record via API with date-only string
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-1 --configs A --input-date "2026-03-15"
# → Field7 stored: "2026-03-15T00:00:00Z"

# 2. Create another record via API with datetime string (same date, different time)
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-1 --configs A --input-date "2026-03-15T14:30:00"
# → Field7 stored: "2026-03-15T14:30:00Z"

# 3. Query for "March 15" records
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-8 --configs A
# OData: [Field7] eq '2026-03-15'
# → May only match record 1 (T00:00:00Z), not record 2 (T14:30:00Z)

# 4. Range query catches both
# OData: [Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'
# → Matches both records (CB-23)
```

### Demonstrate via Forms

1. Create a new DateTest form in BRT
2. Observe Current Date field (Config A, dataField1) — stores actual timestamp (e.g., `T23:01:57Z`)
3. Observe Preset field (Config A, dataField2) — stores BRT midnight (`T03:00:00Z`)
4. Use popup to set Config A field to March 15 — stores UTC midnight (`T00:00:00Z`)
5. All three are date-only fields with `enableTime=false`, all have different time components

---

## Test Evidence

### WS-1: API Write Path (16 PASS)

Run: [`ws-1-ws-2-batch-run-1.md`](../runs/ws-1-ws-2-batch-run-1.md)

**CB-6**: All 8 field configs (A through H) store and return identically per input type. The server treats every field the same — `enableTime`, `ignoreTimezone`, and `useLegacy` are invisible to the API. A datetime string stored in a date-only field (Config A) produces the same result as in a DateTime field (Config C).

### WS-2: API Read Path (16 PASS)

Same run — reading DateTest-000080 (BRT-saved record) shows mixed time components across date-only fields:

| Field      | Config | enableTime | Stored Value             | Time Component |
| ---------- | :----: | :--------: | ------------------------ | :------------: |
| dataField7 |   A    |   false    | `"2026-03-15T00:00:00Z"` |  `T00:00:00Z`  |
| dataField1 |   A    |   false    | `"2026-03-31T23:01:57Z"` |  `T23:01:57Z`  |
| dataField2 |   A    |   false    | `"2026-03-01T03:00:00Z"` |  `T03:00:00Z`  |

### WS-8: Query Filtering (10 PASS)

Run: [`ws-8-batch-run-1.md`](../runs/ws-8-batch-run-1.md)

**CB-22**: OData query engine normalizes date formats — exact match and range queries work. But exact equality on date-only fields is only reliable when the stored time is midnight.

**CB-23**: Date-only range queries work on DateTime fields. `[Field7] ge '2026-03-15' AND [Field7] le '2026-03-16'` matches records with any time on March 15. This is the recommended query pattern for date-only fields.

### Confirmed Behaviors

| CB    | Description                                                            | Source     |
| ----- | ---------------------------------------------------------------------- | ---------- |
| CB-6  | Field config flags have NO effect on API write/read behavior           | WS-1       |
| CB-7  | API normalizes ALL dates to ISO 8601 datetime+Z on read                | WS-1, WS-2 |
| CB-22 | OData filters normalize date formats — match works for midnight values | WS-8       |
| CB-23 | Range queries work across time components                              | WS-8       |

---

## Impact Analysis

### Query Reliability

Exact-equality queries on date-only fields are unreliable when records have been created through different paths:

```
[Field7] eq '2026-03-15'
```

This query compares against `"2026-03-15T00:00:00Z"` (the normalized form of the date-only input). It will:

- **Match**: records written via API with `"2026-03-15"` (stored as `T00:00:00Z`)
- **Match**: records written via Forms popup in UTC+0
- **Miss**: records written via Forms preset in BRT (stored as `T03:00:00Z`)
- **Miss**: records written via Forms Current Date (stored as `T23:01:57Z` or similar)
- **Miss**: records written via API with `"2026-03-15T14:30:00"` (stored as `T14:30:00Z`)

Range queries are reliable: `[Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'` catches all March 15 records regardless of time component (CB-23), with the exception of Bug #7 records stored on the wrong day.

### Dashboard and Report Grouping

If a dashboard groups records by date, and the grouping logic uses the full datetime rather than truncating to the date portion, records from different write paths will group differently even though they represent the "same" date.

### API Ambiguity for Script Developers

A script reading a date-only field gets:

```javascript
const value = result.data.datafield7; // "2026-03-15T14:30:00Z"
```

Is the `T14:30:00` meaningful? Should the script:

- Preserve it when writing back? (Preserves the noise)
- Strip it to `"2026-03-15"` on write? (Normalizes, but loses data if the time was intentional in a misconfigured field)

There is no way to programmatically determine whether a field is date-only without querying the form template metadata separately.

### Compounds with Forms Bug #7

For IST users, Forms Bug #7 stores the previous day for date-only fields:

- March 15 via Forms popup in IST → stored as `"2026-03-14T00:00:00Z"` (wrong day)
- March 15 via API → stored as `"2026-03-15T00:00:00Z"` (correct)

A query for March 15 records would match the API-created record but miss the IST Forms-created record (which is on March 14 in storage). This is Bug #7's fault, but the lack of server-side normalization means the API cannot detect or prevent it.

---

## Workarounds

### For API writes: always send date-only strings to date-only fields

```javascript
// RECOMMENDED: send date-only string — server normalizes to T00:00:00Z
const data = { Field7: '2026-03-15' };

// ALSO SAFE: explicit midnight
const data2 = { Field7: '2026-03-15T00:00:00' };

// AVOID: datetime with non-midnight time in a date-only field
const data3 = { Field7: '2026-03-15T14:30:00' }; // Server accepts but creates inconsistency
```

### For queries: always use range instead of exact equality

```javascript
// UNRELIABLE: exact equality on date-only fields
const params = { q: "[Field7] eq '2026-03-15'" };

// RELIABLE: range query covers all time components
const params2 = { q: "[Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'" };
```

### For scripts reading date-only fields: extract date portion only

```javascript
const apiValue = result.data.datafield7; // "2026-03-15T14:30:00Z"
const dateOnly = apiValue ? apiValue.split('T')[0] : null; // "2026-03-15"
// Use dateOnly for display, comparison, and write-back
```

### Accept that Forms-created records have mixed time components

Records created via Forms popup, preset, and Current Date will have different time components. This is a Forms-side issue that cannot be fixed via the API. The workarounds above ensure API-created records are consistent and that queries account for the inconsistency.

---

## Proposed Fix

### Option A: Server-side normalization for date-only fields

When writing to a field with `enableTime=false`, the server normalizes the stored value to UTC midnight, stripping any time component:

```
Input: "2026-03-15T14:30:00"  → field has enableTime=false
Stored: "2026-03-15T00:00:00Z"  (time stripped, normalized to midnight)
```

**Requirements**: The API layer must have access to field configuration metadata. Currently it does not — the field template definitions are stored in the database but not consulted during `postForms` processing.

**Pros**: Eliminates time-component inconsistency for all future API writes. Exact-equality queries become reliable for API-created records.
**Cons**: Requires architectural change — the API must read field metadata before writing. Does not fix existing records or Forms-created records.

### Option B: Query-layer normalization

Instead of fixing storage, fix the query layer. When filtering on a field with `enableTime=false`, the OData engine should compare only the date portion:

```
[Field7] eq '2026-03-15'
→ internally: CAST(Field7 AS DATE) = '2026-03-15'
→ matches T00:00:00Z, T03:00:00Z, T14:30:00Z, T23:01:57Z
```

**Pros**: Fixes queries without changing storage. Works for existing data.
**Cons**: Requires query engine to be field-metadata-aware. May have performance implications (function on column prevents index use). Does not fix the semantic ambiguity for API consumers.

### Option C: Both — normalize on write + fix queries (recommended)

1. **New writes**: API normalizes date-only fields to midnight (Option A)
2. **Existing data**: Query layer compares date portion only for date-only fields (Option B)
3. **Forms-side**: `getSaveValue()` already normalizes to midnight — no change needed there

This ensures consistency going forward while handling the existing mixed data correctly.

### Option D: Documentation only (minimum)

Document that date-only fields may contain arbitrary time components. Recommend range queries. Do not change server behavior.

**Pros**: No code change, no risk.
**Cons**: Developers continue to encounter unexpected query results. The design inconsistency persists.

---

## Fix Impact Assessment

### What Changes If Fixed

- Date-only fields written via API always have `T00:00:00Z` time component
- Exact-equality queries work reliably on date-only fields (for new data; Option B for old data)
- Scripts reading date-only fields always see midnight — no ambiguity about whether the time is meaningful

### Backwards Compatibility Risk

**HIGH for Option A**: Existing records have mixed time components. If the server normalizes new writes but queries are not updated, old records behave differently from new ones.

**LOW for Option B**: Query normalization is additive — it makes more records match, not fewer.

**LOW for Option D**: No behavior change.

### Complexity

**HIGH**: This is the most architecturally complex fix of all six WS bugs. It requires:

- Exposing field configuration metadata to the API layer (currently isolated)
- Modifying the `postForms` write path to consult field metadata per field
- Potentially modifying the OData query engine for date-only field awareness
- Regression testing across all components that read/write date fields

### Migration Consideration

There is no practical migration path for existing mixed-time data. The time components in existing records are artifacts of different write paths, and the "correct" midnight value cannot be determined retroactively without knowing which records were written via which path. The recommended approach is to normalize going forward and use range queries for existing data.
