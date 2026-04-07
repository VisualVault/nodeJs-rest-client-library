# WEBSERVICE-BUG-6: Date-Only Fields Accept and Store Time Components, Breaking Queries

## What Happens

When a calendar field is configured as "date-only" (no time picker in the UI), the database column is still a full `datetime` type. The same date-only field can contain significantly different time components depending on how the value was written:

| How the Value Was Written                      | What Gets Stored for "March 15, 2026" | Time Component                                                                                  |
| ---------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| User clicks date in popup (São Paulo)          | `2026-03-15 00:00:00.000`             | Midnight                                                                                        |
| "Current Date" default on form load (8 PM BRT) | `2026-03-31 23:01:57.000`             | Actual timestamp at save time                                                                   |
| Preset default "3/1/2026" (São Paulo)          | `2026-03-01 03:00:00.000`             | BRT midnight = 3:00 AM UTC                                                                      |
| API with `"2026-03-15"` (date-only string)     | `2026-03-15 00:00:00.000`             | Midnight                                                                                        |
| API with `"2026-03-15T14:30:00"` (with time)   | `2026-03-15 14:30:00.000`             | 2:30 PM — time accepted without error                                                           |
| User in Mumbai clicks date in popup            | `2026-03-14 00:00:00.000`             | Midnight of wrong day ([FORM-BUG-7](../../forms-calendar/analysis/bug-7-wrong-day-utc-plus.md)) |

All six rows are in the same date-only field. All represent "March 15" (or intend to). Yet the stored values have five different time components and one wrong date entirely. A query for "March 15" cannot reliably find all of them.

---

## When This Applies

Three conditions must all be true for this inconsistency to cause problems:

### 1. The field is configured as date-only

The field has `enableTime=false` in its form template configuration. The Forms UI shows a date picker with no time input. Users see only a date — the time component is invisible in the form.

The database column for every calendar field — date-only and date+time alike — is SQL Server `datetime`. There is no `date` column type. The database stores whatever value the server parsed, including any time component. The "date-only" concept exists in the Forms UI but not at the storage layer.

### 2. The value was written through a path that does not strip the time component

Different write paths handle the time component differently:

| Write Path                   | Time Handling                                                        | Result            |
| ---------------------------- | -------------------------------------------------------------------- | ----------------- |
| Forms popup (calendar click) | Normalizes to midnight                                               | Consistent        |
| Forms "Current Date" default | Uses `new Date()` — captures actual current time                     | Non-midnight      |
| Forms preset default         | Parses through moment.js with timezone conversion                    | Timezone-offset   |
| REST API (`postForms`)       | Stores value as-is — no field configuration check, no time stripping | Whatever was sent |

The server's API layer does not read or enforce field configuration properties. A datetime string like `"2026-03-15T14:30:00"` sent to a date-only field is accepted without error and stored with the 2:30 PM time component.

### 3. The data is queried with exact equality or read by scripts expecting clean dates

The inconsistency only causes problems when the time component matters:

- **Exact-equality queries**: `[Field7] eq '2026-03-15'` compares against `2026-03-15 00:00:00.000` (midnight). Records with other time components do not match.
- **Scripts reading date-only fields**: The API returns a full datetime string (e.g., `"2026-03-15T14:30:00Z"`). The script cannot determine whether the time component is meaningful without knowing the field configuration, which is not included in the API response.
- **Dashboards and reports**: Records for the "same" date may group differently if the grouping logic uses the full datetime rather than just the date portion.

Range queries (`ge '2026-03-15' AND lt '2026-03-16'`) work correctly regardless of time component.

---

## Severity: MEDIUM

No data is lost or corrupted in isolation. The practical impact is on query reliability: exact-match queries on date-only fields miss records that have non-midnight time components. Range queries work correctly as a workaround. The Forms UI strips the time component for display, so users always see a clean date regardless of what is stored.

The scope is broad (affects any date-only field written through multiple paths) but the most common single-path usage (Forms popup only, or API with date-only strings only) does not trigger the inconsistency. The problem surfaces when records from different write paths are mixed in the same field and queried together.

---

## How to Reproduce

### Demonstrate Mixed Time Components via API

```bash
# 1. Create record with date-only string
node testing/scripts/run-ws-test.js \
  --action WS-1 --configs A --input-date "2026-03-15"
# → DB stores: 2026-03-15 00:00:00.000 (midnight)

# 2. Create another record with datetime string (same field type, same date)
node testing/scripts/run-ws-test.js \
  --action WS-1 --configs A --input-date "2026-03-15T14:30:00"
# → DB stores: 2026-03-15 14:30:00.000 (2:30 PM — no enforcement)

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
# → Matches record 1 (midnight), misses record 2 (14:30)

# Range query — matches both
# OData: [Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'
# → Matches both records
```

- **Expected**: Both records match a query for March 15 (both are in a date-only field, both represent March 15)
- **Actual**: Exact-equality query misses the record stored with a non-midnight time component

### Demonstrate via Forms

1. Create a new form in São Paulo
2. Check the "Current Date" field (date-only) — DB stores the actual timestamp (e.g., `23:01:57.000`)
3. Check the "Preset" field (date-only) — DB stores `03:00:00.000` (São Paulo midnight as UTC)
4. Click the popup to set another date-only field to March 15 — DB stores `00:00:00.000` (midnight)
5. All three are in date-only fields — all have different time components

### Automated

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Background

### How Calendar Fields Are Configured

Each calendar field in VisualVault has configuration properties that control its behavior in the Forms UI:

| Property         | What It Controls                                                                   |
| ---------------- | ---------------------------------------------------------------------------------- |
| `enableTime`     | Whether the UI shows a time picker. `false` = date-only field, `true` = date+time. |
| `ignoreTimezone` | Whether timezone conversion is skipped in the display.                             |
| `useLegacy`      | Whether the field uses the older rendering/save code path.                         |

These properties exist in the form template definition and are consumed by the Forms JavaScript application in the browser. The server's API layer does not read or enforce these properties. When the API receives a field value, it processes it through the same date parser regardless of the field's configuration.

### OData Query Behavior

VisualVault's API supports OData-style filtering for querying form records. Queries like `[Field7] eq '2026-03-15'` compare the stored `datetime` value against the specified date. Since the database column is `datetime`, the comparison is against `2026-03-15 00:00:00.000` (midnight) — records with other time components do not match.

The OData engine normalizes date formats in the filter, so both `'2026-03-15'` and `'2026-03-15T00:00:00Z'` work as filter values.

---

## The Problem in Detail

### Why Different Write Paths Produce Different Time Components

**Forms UI (browser):** The Forms JavaScript applies client-side normalization before saving. For date-only fields, the `getSaveValue()` function extracts just the date portion and stores it without a time. But other Forms paths do not normalize the same way:

- **Calendar popup**: normalizes to midnight — consistent
- **"Current Date" default**: uses `new Date()` which captures the actual current time — not normalized to midnight
- **Preset defaults**: uses the moment.js library to parse, which converts through the user's timezone — the time component reflects the timezone offset
- **Legacy popup**: stores the raw UTC string from JavaScript's `toISOString()` — includes timezone-offset time

**REST API:** The server parses any valid date string and stores it as-is. A datetime string like `"2026-03-15T14:30:00"` is stored with the 2:30 PM time component, even in a date-only field. The server has no mechanism to check the field configuration and strip the time.

### The Query Impact

Given records in a date-only field (all representing "March 15"):

| Record Source            | DB Value                  | `eq '2026-03-15'` Matches? | `ge '2026-03-15' AND lt '2026-03-16'` Matches? |
| ------------------------ | ------------------------- | :------------------------: | :--------------------------------------------: |
| Forms popup (UTC+0)      | `2026-03-15 00:00:00.000` |            Yes             |                      Yes                       |
| API date-only string     | `2026-03-15 00:00:00.000` |            Yes             |                      Yes                       |
| Forms preset (São Paulo) | `2026-03-15 03:00:00.000` |           **No**           |                      Yes                       |
| Forms Current Date       | `2026-03-15 23:01:57.000` |           **No**           |                      Yes                       |
| API datetime string      | `2026-03-15 14:30:00.000` |           **No**           |                      Yes                       |

Exact-equality queries fail for any record not stored at midnight. Range queries work for all records.

### Relationship to FORM-BUG-7

For users in timezones east of UTC, [FORM-BUG-7](../../forms-calendar/analysis/bug-7-wrong-day-utc-plus.md) stores the previous day for date-only fields entered through the Forms UI. A March 15 entry from Mumbai stores `2026-03-14 00:00:00.000` — the wrong day entirely. A query for March 15 misses this record whether using exact match or range.

WEBSERVICE-BUG-6 and FORM-BUG-7 are **independent defects that compound**: WEBSERVICE-BUG-6 causes non-midnight time components (query inconsistency), while FORM-BUG-7 causes the wrong date entirely (data corruption). The lack of server-side normalization means the API cannot detect or prevent either — values arrive from different client paths and are stored as-is.

---

## Verification

Verified via the test harness (`run-ws-test.js`) and direct database inspection on the demo environment at `vvdemo.visualvault.com`. API-created records confirmed that the server stores datetime strings as-is in date-only fields — `"2026-03-15T14:30:00"` stored as `2026-03-15 14:30:00.000` with no time stripping, identical to the same input in a date+time field. The server treats all calendar fields the same regardless of `enableTime`, `ignoreTimezone`, or `useLegacy` configuration.

Database dump (2026-04-06) of a single form record saved from São Paulo confirmed three different time components across three date-only fields: midnight (popup), `23:01:57` (Current Date default), and `03:00:00` (preset, reflecting BRT-to-UTC offset). OData query testing confirmed that exact-equality queries only match midnight records, while range queries match all records regardless of time component.

**Limitations**: Testing was performed on the demo environment only. The server-side API code is .NET and not available in this repository — the lack of field configuration enforcement was characterized through input/output testing. Other environments have not been verified.

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The VV platform's "date-only" concept is enforced only at the Forms UI layer (the `getSaveValue()` function in the FormViewer JavaScript, which strips the time component for popup-entered values). The server's REST API layer and the SQL Server database have no awareness of the `enableTime` field configuration:

- **Database**: All calendar fields use SQL Server `datetime` — there is no `date` column type. The column stores whatever value the server writes, including any time component.
- **API layer**: The server's date parser processes all field values identically. It does not read the field's `enableTime` property from the form template before writing. A datetime string is stored with its time component regardless of whether the field is configured as date-only.
- **Query layer**: OData equality comparisons use the full `datetime` value. The query engine has no mechanism to compare only the date portion for date-only fields.

**File locations**: The server-side API and query code is .NET, not available in this repository. The Forms UI normalization (`getSaveValue()`) is in `main.js` at line ~104100, but this only applies to values entered through the Forms UI — not to API-written values. The field configuration properties (`enableTime`, `ignoreTimezone`, `useLegacy`) are stored in the form template definition and read by the FormViewer JavaScript at form load time.

The inconsistency is systemic — fixing it requires either exposing field metadata to the API write layer (architectural change) or normalizing at the query layer (see companion document).

---

## Workarounds and Fix Recommendations

See [ws-bug-6-fix-recommendations.md](ws-bug-6-fix-recommendations.md) for workarounds, proposed fix options, and impact assessment.
