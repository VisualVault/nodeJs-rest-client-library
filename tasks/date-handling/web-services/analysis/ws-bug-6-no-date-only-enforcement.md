# WEBSERVICE-BUG-6: Date-Only Fields Accept and Store Time Components, Breaking Queries

## What Happens

When a calendar field is configured as "date-only" (`enableTime=false`), users see a clean date picker with no time input. But behind the scenes, the database column is a full `datetime` type — not a date-only type. The "date-only" concept is enforced only by the Forms UI in the browser. The server and database have no awareness of it.

This means the same date-only field can contain wildly different time components depending on **how** the value was written:

| How the Value Was Written                      | What Gets Stored for "March 15, 2026" | Time Component                                                                                      |
| ---------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| User clicks date in popup (São Paulo)          | `2026-03-15 00:00:00.000`             | Midnight                                                                                            |
| "Current Date" default on form load (8 PM BRT) | `2026-03-31 23:01:57.000`             | Actual timestamp at save time                                                                       |
| Preset default "3/1/2026" (São Paulo)          | `2026-03-01 03:00:00.000`             | BRT midnight = 3:00 AM UTC                                                                          |
| API with `"2026-03-15"` (date-only string)     | `2026-03-15 00:00:00.000`             | Midnight                                                                                            |
| API with `"2026-03-15T14:30:00"` (with time)   | `2026-03-15 14:30:00.000`             | **2:30 PM — no enforcement**                                                                        |
| User in Mumbai clicks date in popup            | `2026-03-14 00:00:00.000`             | Midnight of **wrong day** ([FORM-BUG-7](../../forms-calendar/analysis/bug-7-wrong-day-utc-plus.md)) |

All six rows are in the **same date-only field**. All represent "March 15" (or intend to). Yet the stored values have five different time components and one wrong date entirely. A query for "March 15" cannot reliably find all of them.

This is not a bug in any single component — it's a systemic design inconsistency where the date-only semantic exists in the UI but not at the storage layer.

---

## Severity: MEDIUM (Design Flaw)

No data is lost or corrupted in isolation. The practical impact is on query reliability: exact-match queries on date-only fields miss records that have non-midnight time components. Range queries work correctly as a workaround.

---

## Who Is Affected

### Query authors and report builders

Anyone writing filters against date-only fields — whether through the VV OData API, SQL queries, dashboard filters, or report criteria. An exact-equality query like `Field7 = '2026-03-15'` matches records stored at midnight but **misses** records stored at 3:00 AM, 2:30 PM, or 11:01 PM — even though all represent the same intended date.

### Script developers reading date-only fields

A script that reads a date-only field through the API receives a full datetime string:

```javascript
const value = result.data.datafield7;
// → "2026-03-15T14:30:00Z"
```

Is the `T14:30:00` part meaningful? Should the script preserve it when writing back? Normalize to midnight? There is no way to determine whether a field is date-only from the API response alone — the field configuration is not included in the data.

### Dashboard and report consumers

Records for the "same" date may group differently if the grouping logic uses the full datetime rather than just the date portion. Two March 15 records — one stored at midnight, one at 2:30 PM — could appear in different time-based groupings.

### Who is NOT directly affected

Users interacting with Forms in the browser — the Forms UI strips the time component for display on date-only fields. Users always see a clean date regardless of what time component is stored.

---

## Background

### How Calendar Fields Are Configured

Each calendar field in VisualVault has configuration properties that control its behavior in the Forms UI:

| Property         | What It Controls                                                                   |
| ---------------- | ---------------------------------------------------------------------------------- |
| `enableTime`     | Whether the UI shows a time picker. `false` = date-only field, `true` = date+time. |
| `ignoreTimezone` | Whether timezone conversion is skipped in the display.                             |
| `useLegacy`      | Whether the field uses the older rendering/save code path.                         |

These properties exist in the form template definition and are consumed by the Forms JavaScript application in the browser. **The server's API layer does not read or enforce these properties.** When the API receives a field value, it processes it through the same date parser regardless of the field's configuration — a date+time string sent to a date-only field is accepted without error.

### The Database Has No Date-Only Type

The database column for every calendar field — date-only and date+time alike — is a SQL Server `datetime`. There is no `date` column type. The database stores whatever value the server parsed, including any time component.

### OData Queries

VisualVault's API supports OData-style filtering for querying form records. Queries like `[Field7] eq '2026-03-15'` compare the stored `datetime` value against the specified date. Since the database column is `datetime`, the comparison is against `2026-03-15 00:00:00.000` (midnight) — records with other time components don't match.

---

## The Problem in Detail

### Why Different Write Paths Produce Different Time Components

**Forms UI (browser):** The Forms JavaScript applies client-side normalization before saving. For date-only fields, the `getSaveValue()` function extracts just the date portion and stores it without a time. But other Forms paths don't normalize the same way:

- **Calendar popup**: normalizes to midnight — consistent
- **"Current Date" default**: uses `new Date()` which captures the actual current time — not normalized to midnight
- **Preset defaults**: uses the moment.js library to parse, which converts through the user's timezone — the time component reflects the timezone offset
- **Legacy popup**: stores the raw UTC string from JavaScript's `toISOString()` — includes timezone-offset time

**REST API:** The server parses any valid date string and stores it as-is. A datetime string like `"2026-03-15T14:30:00"` is stored with the 2:30 PM time component, even in a date-only field. The server has no mechanism to check the field configuration and strip the time.

### The Query Impact

Given records in a date-only field (all representing "March 15"):

| Record Source            | DB Value                  | `[Field7] eq '2026-03-15'` Matches? | `[Field7] ge '2026-03-15' AND lt '2026-03-16'` Matches? |
| ------------------------ | ------------------------- | :---------------------------------: | :-----------------------------------------------------: |
| Forms popup (UTC+0)      | `2026-03-15 00:00:00.000` |                 Yes                 |                           Yes                           |
| API date-only string     | `2026-03-15 00:00:00.000` |                 Yes                 |                           Yes                           |
| Forms preset (São Paulo) | `2026-03-15 03:00:00.000` |               **No**                |                           Yes                           |
| Forms Current Date       | `2026-03-15 23:01:57.000` |               **No**                |                           Yes                           |
| API datetime string      | `2026-03-15 14:30:00.000` |               **No**                |                           Yes                           |

Exact-equality queries fail for any record not stored at midnight. Range queries work for all records.

### Compounds with FORM-BUG-7

For users in timezones east of London, [FORM-BUG-7](../../forms-calendar/analysis/bug-7-wrong-day-utc-plus.md) stores the previous day for date-only fields entered through the Forms UI. A March 15 entry from Mumbai stores `2026-03-14 00:00:00.000` — the wrong day entirely. A query for March 15 misses this record whether using exact match or range. The lack of server-side normalization means the API cannot detect or prevent this — the wrong date arrives from the Forms client and is stored as-is.

---

## Steps to Reproduce

### Demonstrate Mixed Time Components via API

```bash
# 1. Create record with date-only string
node testing/scripts/run-ws-test.js \
  --action WS-1 --configs A --input-date "2026-03-15"
# → DB stores: 2026-03-15 00:00:00.000 (midnight)

# 2. Create another record with datetime string (same field type, same date)
node testing/scripts/run-ws-test.js \
  --action WS-1 --configs A --input-date "2026-03-15T14:30:00"
# → DB stores: 2026-03-15 14:30:00.000 (2:30 PM — no enforcement!)

# Both records are in the same date-only field.
# Both represent March 15.
# The server accepted both without error.
```

### Demonstrate Query Impact

```bash
# Exact equality — only matches midnight records
node testing/scripts/run-ws-test.js \
  --action WS-8 --configs A
# OData: [Field7] eq '2026-03-15'
# → Matches record 1 (midnight), MISSES record 2 (14:30)

# Range query — matches both
# OData: [Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'
# → Matches both records
```

### Demonstrate via Forms

1. Create a new form in São Paulo
2. Check the "Current Date" field (date-only) — DB stores the actual timestamp (e.g., `23:01:57.000`)
3. Check the "Preset" field (date-only) — DB stores `03:00:00.000` (São Paulo midnight as UTC)
4. Click the popup to set another date-only field to March 15 — DB stores `00:00:00.000` (midnight)
5. All three are in date-only fields — all have different time components

---

## Workarounds

### For API Writes: Always Send Date-Only Strings to Date-Only Fields

```javascript
// RECOMMENDED: date-only string — server normalizes to T00:00:00Z
const data = { Field7: '2026-03-15' };

// ALSO SAFE: explicit midnight
const data2 = { Field7: '2026-03-15T00:00:00' };

// AVOID: datetime with non-midnight time in a date-only field
const data3 = { Field7: '2026-03-15T14:30:00' };
// Server accepts this without error, creating query inconsistency
```

### For Queries: Always Use Range Instead of Exact Equality

```javascript
// UNRELIABLE for date-only fields:
const params = { q: "[Field7] eq '2026-03-15'" };
// Misses records with non-midnight time components

// RELIABLE for date-only fields:
const params2 = { q: "[Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'" };
// Catches all March 15 records regardless of time component
```

### For Scripts Reading Date-Only Fields: Extract Date Portion Only

```javascript
const apiValue = result.data.datafield7; // "2026-03-15T14:30:00Z"
const dateOnly = apiValue ? apiValue.split('T')[0] : null; // "2026-03-15"
// Use dateOnly for display, comparison, and write-back
```

### Accept That Forms-Created Records Have Mixed Time Components

Records created via the Forms popup, preset defaults, and "Current Date" will always have different time components. This is a client-side issue that cannot be fixed through the API. The workarounds above ensure API-created records are consistent and that queries account for the existing inconsistency.

---

## Test Evidence

### API Ignores Field Configuration

Records created through the API with the same input stored identically regardless of field type. The server treats every calendar field the same — `enableTime`, `ignoreTimezone`, and `useLegacy` are invisible to the API:

```bash
# Date-only field (enableTime=false):
Input: "2026-03-15T14:30:00" → Stored: 2026-03-15 14:30:00.000
# Date+time field (enableTime=true):
Input: "2026-03-15T14:30:00" → Stored: 2026-03-15 14:30:00.000
# Identical. The server makes no distinction.
```

### Mixed Time Components in Real Records

From database dump (2026-04-06), examining a single form record saved from São Paulo:

| Field  | Field Type | Write Source           | DB Value                  | Time Component              |
| ------ | ---------- | ---------------------- | ------------------------- | --------------------------- |
| Field7 | Date-only  | Forms popup            | `2026-03-15 00:00:00.000` | Midnight                    |
| Field1 | Date-only  | "Current Date" default | `2026-03-31 23:01:57.000` | 23:01:57                    |
| Field2 | Date-only  | Preset "3/1/2026"      | `2026-03-01 03:00:00.000` | 03:00 (BRT midnight as UTC) |

All three fields have `enableTime=false`. All stored in the same `datetime` column type. Three different time components.

From API-created records:

| Field  | Field Type | API Input                          | DB Value                  | Time Component             |
| ------ | ---------- | ---------------------------------- | ------------------------- | -------------------------- |
| Field7 | Date-only  | `"2026-03-15"` (date string)       | `2026-03-15 00:00:00.000` | Midnight                   |
| Field7 | Date-only  | `"2026-03-15T14:30:00"` (datetime) | `2026-03-15 14:30:00.000` | **14:30 — no enforcement** |

The server accepted a 2:30 PM time in a date-only field without any error.

### Query Behavior

OData query testing confirmed:

- **Exact equality** on date-only fields is only reliable when the stored time is midnight
- **Range queries** work correctly across all time components — `ge '2026-03-15' AND lt '2026-03-16'` matches any record on March 15 regardless of time
- The OData engine normalizes date formats, so both `'2026-03-15'` and `'2026-03-15T00:00:00Z'` work in filters

---

## Proposed Fix

### Option A: Server-Side Normalization for Date-Only Fields (Recommended Long-Term)

When writing to a field with `enableTime=false`, the server normalizes the stored value to UTC midnight, stripping any time component:

```
Input: "2026-03-15T14:30:00"  → field has enableTime=false
Stored: "2026-03-15T00:00:00Z"  (time stripped, normalized to midnight)
```

**Requirement**: The API layer must have access to field configuration metadata. Currently it does not — field properties are stored in the form template but not consulted during write operations. This is an architectural change.

**Pros**: Eliminates time-component inconsistency for all future API writes. Exact-equality queries become reliable.
**Cons**: Requires the API to read field metadata before writing. Does not fix existing records or Forms-created records with non-midnight times.

### Option B: Query-Layer Normalization (Pragmatic Short-Term)

Instead of fixing storage, fix the query layer. When filtering on a date-only field, the query engine compares only the date portion:

```sql
-- Current: compares full datetime (misses non-midnight records)
WHERE Field7 = '2026-03-15'

-- Fixed: compares date portion only for date-only fields
WHERE CAST(Field7 AS DATE) = '2026-03-15'
```

**Pros**: Fixes queries without changing storage. Works for existing data.
**Cons**: Requires query engine awareness of field metadata. May impact index performance. Doesn't fix the semantic ambiguity for API consumers.

### Option C: Both (Recommended)

1. **New writes**: Server normalizes date-only fields to midnight (Option A)
2. **Existing data**: Query layer compares date portion only for date-only fields (Option B)
3. **Forms-side**: The Forms UI already normalizes popup-entered dates to midnight — no change needed there

### Option D: Documentation Only (Minimum)

Document that date-only fields may contain arbitrary time components. Recommend range queries. No code change.

---

## Fix Impact Assessment

### What Changes If Fixed

- Date-only fields written via API always have a midnight time component
- Exact-equality queries work reliably on date-only fields (for new data; Option B for existing data)
- Scripts reading date-only fields always see midnight — no ambiguity about whether the time is meaningful

### Backwards Compatibility Risk

**HIGH for Option A**: Existing records have mixed time components. If the server normalizes new writes but queries aren't updated, old and new records behave differently.

**LOW for Option B**: Query normalization is additive — it makes more records match, not fewer.

### Complexity: HIGH

This is the most architecturally complex fix across all six web services bugs. It requires:

- Exposing field configuration metadata to the API write layer (currently isolated)
- Modifying the write path to consult field metadata per field
- Potentially modifying the query engine for date-only field awareness
- Regression testing across all components that read/write date fields

### No Practical Migration Path for Existing Data

The time components in existing records are artifacts of different write paths. The "correct" midnight value cannot be determined retroactively without knowing which path wrote each record. The recommended approach is to normalize going forward and use range queries for existing data.
