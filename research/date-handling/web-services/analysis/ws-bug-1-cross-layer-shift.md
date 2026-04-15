# WEBSERVICE-BUG-1: Date/Time Values Shift When Records Created by API Are Opened in Forms

## What Happens

A developer script creates a form record through the VisualVault REST API, writing a date/time value like `"2026-03-15T14:30:00"` (2:30 PM, March 15). The database stores the correct value: `2026-03-15 14:30:00.000`. So far, everything is fine.

The problem occurs when a user opens this record in the VisualVault Forms UI. The form displays **11:30 AM** instead of 2:30 PM (in São Paulo, UTC-3) — a 3-hour backward shift. If the user saves the form — even without touching the date field — the shifted value permanently overwrites the original in the database. The correct 2:30 PM is gone, replaced by 11:30 AM.

In the most common field configuration, the first open appears correct — the display shows 2:30 PM. But internally, the value has already been shifted to 11:30 AM. The user trusts the display, saves, and only discovers the corruption when they reopen the record and see 11:30 AM. This is the behavior reported in Freshdesk #124697 (WADNR-10407), where hundreds of thousands of records migrated via the API had their times corrupted after users opened them in Forms.

---

## When This Applies

Four conditions must all be true for this bug to produce a visible effect:

### 1. The record was created through the standard REST API endpoint

VisualVault has two REST API endpoints that developer scripts can use to create form records:

- **`postForms`** — The standard endpoint available through the VV Node.js SDK (`vvClient.forms.postForms()`). This is what most developer scripts use. It is part of the main VV REST API.
- **`forminstance/`** — An alternative endpoint that creates records through a different server path (the FormsAPI server). It requires separate registration and direct HTTP calls — there is no SDK wrapper for it.

Both endpoints write identical values to the database. This was confirmed by creating records through each endpoint with the same input and comparing the database rows column by column — the stored `datetime` values are byte-for-byte identical.

Only records created through `postForms` are affected. Records created through `forminstance/` or the Forms UI display correctly in all timezones. The difference is in how the server serializes the value when the Forms UI requests it — see [The Problem in Detail](#the-problem-in-detail).

### 2. The field stores a time component (date+time, not date-only)

Date-only fields (`enableTime=false`) are immune. The Forms frontend's date-only parsing path extracts just the date portion and discards any timezone information. The incorrect serialization from the server is ignored along with the time component, so it never causes a shift.

Only fields configured to store both date and time (`enableTime=true`) are affected, regardless of the `ignoreTimezone` setting.

### 3. A user opens the record in the Forms UI

The shift occurs when the Forms frontend (FormViewer) requests the field value from the server and parses it in the browser. If the record is only read by scripts via the `getForms` API (never opened in the Forms UI), no corruption occurs. The `getForms` API normalizes all serialization formats consistently, and the API round-trip is drift-free.

### 4. The user's timezone is not UTC+0

At UTC+0, local time equals UTC — the incorrect serialization produces no numeric shift. The bug is invisible. For all other timezones, the magnitude of the shift equals the user's UTC offset:

| Timezone                 | Shift When Opening an API-Created Record |
| ------------------------ | ---------------------------------------- |
| São Paulo (BRT, UTC-3)   | -3 hours (2:30 PM becomes 11:30 AM)      |
| New York (EST, UTC-5)    | -5 hours                                 |
| Los Angeles (PST, UTC-8) | -8 hours                                 |
| Mumbai (IST, UTC+5:30)   | +5:30 hours (2:30 PM becomes 8:00 PM)    |
| Tokyo (JST, UTC+9)       | +9 hours                                 |
| London (UTC+0)           | No shift (coincidental correctness)      |

**Freshdesk #124697** (WA DNR, John Sevilla) independently confirmed this defect in production. Hundreds of thousands of records migrated via `postForms` had their date/time values corrupted when users subsequently opened them in the Forms UI.

---

## Severity: HIGH

Permanent data corruption on first save. Affects every API-created record with date/time fields when opened by a non-UTC+0 user in the Forms UI. The `forminstance/` endpoint provides a workaround, but it requires non-obvious changes to existing developer scripts and only supports new record creation. Confirmed root cause of Freshdesk #124697.

---

## How to Reproduce

### 1. Create a Record via the API

Using the test harness:

```bash
node tools/runners/run-ws-test.js \
  --action WS-1 --configs D --input-date "2026-03-15T14:30:00"
```

Or via any script that calls `vvClient.forms.postForms()` with a date/time field value.

Note the record name from the output (e.g., DateTest-001566).

### 2. Read Back via API — Confirm the Value Was Stored Correctly

```bash
node tools/runners/run-ws-test.js \
  --action WS-2 --configs D --record-id DateTest-001566
```

The API response shows the value with Z appended: `"2026-03-15T14:30:00Z"`.

### 3. Open in Browser — Observe the Shift

Open the record in Chrome (with system timezone set to São Paulo). In DevTools console:

```javascript
// Check the stored value held by the FormViewer
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
```

- **Expected**: `"2026-03-15T14:30:00"` (2:30 PM, unchanged)
- **Actual**: `"2026-03-15T11:30:00"` (11:30 AM — shifted -3 hours)

For a field with the "ignore timezone" setting enabled: the display shows 2:30 PM (appears correct), but the stored value above is already 11:30 AM.

### 4. Save and Reopen — Corruption Is Permanent

Save the form without editing the date field. Reopen. For "ignore timezone" fields, the display now shows **11:30 AM** instead of the original 2:30 PM. The database has been permanently overwritten.

### Automated

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Background

### How Forms Reads Field Values When a User Opens a Record

When a user opens a form record in the browser, the Forms frontend (a JavaScript application called FormViewer) requests the field values from an internal server endpoint called `FormInstance/Controls`. This endpoint:

1. Reads the raw `datetime` value from the SQL Server database
2. Converts it to a string
3. Sends it to the FormViewer JavaScript code in the browser

The FormViewer then parses this string, interprets it as a date, and displays it in the calendar field. The parsing logic includes timezone handling — if the string ends with `Z` (the ISO 8601 UTC marker), the FormViewer treats it as UTC and converts to the user's local time.

### What Are "Stored Value" and "Displayed Value"?

Throughout this document, two values are important to distinguish:

- **Stored value** (also called "rawValue" in the FormViewer code): The actual date/time string held in the form's internal data structure. This is what gets sent to the server when the user saves. You can inspect it in the browser console with `VV.Form.VV.FormPartition.getValueObjectValue('FieldName')`.

- **Displayed value**: What the user sees in the calendar field on screen. The displayed value and stored value may differ — the FormViewer can convert the stored UTC time to local time for display, or apply formatting rules. The user interacts with the displayed value, but the stored value is what goes to the database.

### Field Configuration

Each calendar field has configuration properties that control its behavior. The relevant ones for this bug:

| Property         | What It Controls                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores a time in addition to the date. `true` = date+time field, `false` = date-only field.                                   |
| `ignoreTimezone` | Whether timezone conversion is skipped in the display. When `true`, the field shows the stored time as-is without converting from UTC to local. |

This bug affects **all date+time fields** (`enableTime=true`), regardless of the `ignoreTimezone` setting. The field configuration has no effect on the server's serialization — the bug is in the server layer.

---

## The Problem in Detail

### The Core Issue: The Server Adds an Incorrect UTC Marker

The `FormInstance/Controls` server endpoint serializes the **same database value** differently depending on which API endpoint created the record:

| How the Record Was Created | Database Value            | Controls Sends to Browser         |
| -------------------------- | ------------------------- | --------------------------------- |
| `postForms` API            | `2026-03-15 14:30:00.000` | `"2026-03-15T14:30:00Z"` (with Z) |
| `forminstance/` API        | `2026-03-15 14:30:00.000` | `"03/15/2026 2:30:00 PM"` (no Z)  |
| Forms UI (user typed it)   | `2026-03-15 14:30:00.000` | `"03/15/2026 2:30:00 PM"` (no Z)  |

The database values are identical in all three cases. The difference is only in how Controls formats the string.

The `Z` suffix on `postForms` records is incorrect. The SQL Server `datetime` column is timezone-unaware — it stores a number, not a timezone. No value in it is "UTC" or "local" — it is a timestamp without context. But Controls adds the `Z` anyway, and the Forms frontend takes it at face value.

### What Happens in the Browser

When the FormViewer receives `"2026-03-15T14:30:00Z"`, it interprets the Z as a genuine UTC marker. It then converts 14:30 UTC to the user's local time:

**For fields with `ignoreTimezone=false`** (standard timezone handling):

- The FormViewer converts 14:30 UTC to 11:30 São Paulo local time
- The display immediately shows **11:30 AM** (wrong)
- The stored value is updated to `"2026-03-15T11:30:00"` (shifted)

**For fields with `ignoreTimezone=true`** (the "ignore timezone" setting):

- The display widget shows the time as-is: **2:30 PM** (appears correct)
- But internally, the FormViewer has already parsed the Z and shifted the stored value to `"2026-03-15T11:30:00"`
- On first open, the user sees the correct time and trusts it
- When they save, the shifted stored value (11:30 AM) overwrites the original in the database
- On reopen, the display now shows **11:30 AM** — the time has "changed" without the user editing it

This second scenario — where the display appears correct but the underlying data is silently corrupted — is the most difficult to detect, and is exactly what Freshdesk #124697 describes.

### Step by Step — São Paulo (UTC-3)

```
1. Developer script sends to postForms:    "2026-03-15T14:30:00"   (intended: 2:30 PM)
        ↓
2. Database stores:                        2026-03-15 14:30:00.000 (correct — no Z, no format)
        ↓
3. User opens record in Forms → browser requests data from Controls endpoint
        ↓
4. Controls returns:                       "2026-03-15T14:30:00Z"  (Z added — serialization artifact)
        ↓
5. FormViewer interprets Z as UTC:         14:30 UTC = 11:30 São Paulo local
        ↓
6. Stored value becomes:                   "2026-03-15T11:30:00"   (shifted -3 hours)
        ↓
7. User saves form (without editing the date)
        ↓
8. Database permanently stores:            2026-03-15 11:30:00.000 (original 2:30 PM lost forever)
```

### When the Date Itself Changes (Midnight-Crossing)

For early-morning times, the shift can cross the date boundary — the stored **date** changes, not just the time:

| API Input               | Timezone  | Display on First Open | Stored Value After Open | Date Changed?                |
| ----------------------- | --------- | --------------------- | ----------------------- | ---------------------------- |
| `"2026-03-15T02:00:00"` | São Paulo | 02:00 AM (correct)    | `"2026-03-14T23:00:00"` | **Yes — stored as March 14** |
| `"2026-03-15T02:00:00"` | Mumbai    | 02:00 AM (correct)    | `"2026-03-15T07:30:00"` | No — same day                |

In São Paulo, any time between `T00:00:00` and `T02:59:59` will have the stored date shift to the previous calendar day. For larger timezone offsets (e.g., Los Angeles at UTC-8), the window is wider.

### Date-Only Fields Are Immune

Date-only fields (`enableTime=false`) display correctly in all timezones, even for `postForms`-created records. The FormViewer's date-only parsing path extracts just the date portion and ignores any timezone information. The Z suffix from the Controls serialization is discarded along with the time component, so it never causes a shift.

### After Corruption, the Value Stabilizes

Once a user opens and saves a `postForms`-created record, the shifted value becomes the new database value. Subsequent opens and saves do not shift it further — the corruption is a one-time event on first save, then stable. This was confirmed by testing multiple open/save cycles on the same record.

### Why Records Created by `forminstance/` and the Forms UI Are Safe

Records created through `forminstance/` or the Forms UI are serialized by Controls as `"03/15/2026 2:30:00 PM"` (US date format, no Z suffix). The FormViewer parses this as local time — no UTC conversion, no shift. The stored value matches what the user sees.

### How Does Controls Know Which Endpoint Created the Record?

The form data table (`dbo.DateTest`) contains no flag or column that distinguishes records by creation endpoint. A column-by-column comparison shows identical metadata (same user, same field values — only internal IDs and timestamps differ). The serialization decision must be based on hidden metadata in VV's internal system tables (revision history, form instance tracking, or similar). The specific table or flag has not been identified — this is an open question for the product team.

### Relationship to Forms Calendar Bugs

This bug connects to three bugs documented in the Forms calendar investigation:

- **[FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md)** (incorrect Z on GetFieldValue): After the shift, if a developer script reads the field with `GetFieldValue()`, it gets the already-shifted value with an additional incorrect Z appended. Round-tripping via `SetFieldValue(GetFieldValue())` would drift the value further. WEBSERVICE-BUG-1 feeds into FORM-BUG-5 — the shifted value from WEBSERVICE-BUG-1 becomes the input that FORM-BUG-5 further corrupts.

- **[FORM-BUG-4](../../forms-calendar/analysis/bug-4-legacy-save-format.md)** (Z stripped on save): When the user saves the form, the save function strips the Z from the shifted value before storing it — making the corruption permanent and timezone-ambiguous. WEBSERVICE-BUG-1 produces the shifted value; FORM-BUG-4 bakes it into the database.

- **[FORM-BUG-1](../../forms-calendar/analysis/bug-1-timezone-stripping.md)** (Z stripped on load): The Z-stripping in the load path is the same class of defect — both the V1 inline code and this serialization bug treat Z as something to reinterpret rather than preserve. WEBSERVICE-BUG-1 and FORM-BUG-1 are independent mechanisms (different code paths, different layers) that produce the same category of error.

---

## Verification

Verified via automated test harness and manual browser inspection on the demo environment at `vvdemo.visualvault.com`, across two timezones (São Paulo/BRT UTC-3, Mumbai/IST UTC+5:30). Testing covered three areas: API-to-Forms cross-layer behavior (8 tests — 2 PASS, 6 FAIL across field configurations and timezones), `postForms` vs `forminstance/` comparison (15 comparison rows — `postForms` 6 FAIL on date+time, `forminstance/` 0 FAIL across all configurations), and save-and-stabilize reproduction matching Freshdesk #124697 (confirmed: "ignore timezone" fields display correctly on first open but store shifted values that appear on reopen). Direct database inspection confirmed that `postForms` records store the correct value until opened in Forms, and that `postForms` and `forminstance/` records have identical database values — only the Controls serialization differs.

**Limitations**: The metadata or code path that Controls uses to decide serialization format has not been identified. The form data table shows no distinguishing columns between `postForms` and `forminstance/` records. Testing was performed on the demo environment only — other environments have not been verified.

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The defective behavior involves two components interacting. The server-side serialization code and the client-side form data are shown in [The Core Issue](#the-core-issue-the-server-adds-an-incorrect-utc-marker) above. This section adds architectural context.

### Component 1: Server-Side Serialization Inconsistency

The `FormInstance/Controls` endpoint adds a `Z` suffix to date/time values in records created by `postForms`, but not to records created by `forminstance/` or the Forms UI:

```
Database value (identical):       2026-03-15 14:30:00.000

Controls output for postForms:    "2026-03-15T14:30:00Z"      ← Z added (incorrect)
Controls output for forminstance: "03/15/2026 2:30:00 PM"      ← no Z (correct)
Controls output for Forms UI:     "03/15/2026 2:30:00 PM"      ← no Z (correct)
```

The Z is incorrect because the SQL Server `datetime` column is timezone-unaware — it stores a numeric timestamp with no timezone concept. Adding Z claims the value is UTC, but the column has no timezone context.

**File locations**: The Controls endpoint is server-side .NET code, not available in this repository. The branching logic that determines serialization format has not been located — it is likely in VV's internal revision or form instance tracking tables.

### Component 2: The Forms Frontend Trusts the Z

The FormViewer JavaScript code has a function called `initCalendarValueV1()` (line ~102886 in `main.js`) that processes field values when a form is loaded. When it receives a string ending in `Z`, it treats the Z as a genuine UTC marker. For fields with standard timezone handling (`ignoreTimezone=false`), it converts the UTC time to the user's local time — shifting the value. For fields with `ignoreTimezone=true`, the display is preserved but the internal stored value is still shifted.

Neither component is independently wrong in all cases — the defect emerges from their interaction. The Controls endpoint should not add Z to a timezone-unaware value, and the FormViewer should not unconditionally trust Z from a source that does not guarantee UTC.

---

## Appendix: Field Configuration Reference

The test form fields referenced in this document use the following configurations:

| Config | Field   | enableTime | ignoreTimezone | Description                 | Affected? |
| ------ | ------- | ---------- | -------------- | --------------------------- | --------- |
| A      | Field7  | —          | —              | Date-only baseline          | No        |
| B      | Field10 | —          | ✅             | Date-only + ignoreTZ        | No        |
| C      | Field6  | ✅         | —              | DateTime UTC (control)      | **Yes**   |
| D      | Field5  | ✅         | ✅             | DateTime + ignoreTZ         | **Yes**   |
| E      | Field12 | —          | —              | Legacy date-only            | No        |
| F      | Field11 | —          | ✅             | Legacy date-only + ignoreTZ | No        |
| G      | Field14 | ✅         | —              | Legacy DateTime             | **Yes**   |
| H      | Field13 | ✅         | ✅             | Legacy DateTime + ignoreTZ  | **Yes**   |

All date+time configurations (C, D, G, H) are affected. All date-only configurations (A, B, E, F) are immune. The `ignoreTimezone` and `useLegacy` settings do not change whether the bug occurs — they only change whether the shifted value is visible on first open or hidden until reopen.

---

## Workarounds and Fix Recommendations

See [ws-bug-1-fix-recommendations.md](ws-bug-1-fix-recommendations.md) for workarounds, proposed fix, and impact assessment.
