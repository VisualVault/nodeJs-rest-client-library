# WEBSERVICE-BUG-1: Date/Time Values Shift When Records Created by API Are Opened in Forms

## What Happens

A developer script creates a form record through the VisualVault REST API, writing a date/time value like `"2026-03-15T14:30:00"` (2:30 PM, March 15). The database stores **the correct value**: `2026-03-15 14:30:00.000`. So far, everything is fine.

The problem occurs when a user opens this record in the VisualVault Forms UI. The form displays **11:30 AM** instead of 2:30 PM (in São Paulo, UTC-3) — a 3-hour backward shift. If the user saves the form — even without touching the date field — the shifted value **permanently overwrites the original** in the database. The correct 2:30 PM is gone, replaced by 11:30 AM.

The most common date/time field configuration ("ignore timezone" enabled) makes this worse: the first open looks deceptively correct — the display shows 2:30 PM. But internally, the value has already been shifted to 11:30 AM. The user trusts the display, saves, and only discovers the mutation when they reopen the record and see 11:30 AM. **This is exactly the behavior reported in Freshdesk #124697** (WADNR-10407), where hundreds of thousands of records migrated via the API had their times corrupted after users opened them in Forms.

**This is the most impactful web services date handling defect.** It affects every production script that writes date/time values via the `postForms` API endpoint where any user outside UTC+0 subsequently opens the record in Forms. Date-only fields (fields that store a date without a time component) are immune.

---

## Severity: HIGH

Permanent data corruption on first save. Affects every API-created record with date/time fields when opened by a non-UTC+0 user. Confirmed root cause of Freshdesk #124697.

---

## Who Is Affected

- **Every VV customer** using the `postForms` (or `postFormRevision`) API endpoint to write date/time fields that are later viewed in the Forms UI
- **Users outside UTC+0** see the shift. The magnitude equals their timezone offset:

| Timezone                 | Shift When Opening an API-Created Record |
| ------------------------ | ---------------------------------------- |
| São Paulo (BRT, UTC-3)   | -3 hours (2:30 PM becomes 11:30 AM)      |
| New York (EST, UTC-5)    | -5 hours                                 |
| Los Angeles (PST, UTC-8) | -8 hours                                 |
| Mumbai (IST, UTC+5:30)   | +5:30 hours (2:30 PM becomes 8:00 PM)    |
| Tokyo (JST, UTC+9)       | +9 hours                                 |
| London (UTC+0)           | No shift (coincidental correctness)      |

- **Freshdesk #124697** (WA DNR, John Sevilla) independently confirmed this defect in production
- **Date-only fields are immune** — fields configured to store only a date (no time component) display correctly in all timezones regardless of which endpoint created the record

---

## Background

### Two Ways to Create Form Records via API

VisualVault has two REST API endpoints that developer scripts can use to create form records:

1. **`postForms`** — The standard endpoint available through the VV Node.js SDK (`vvClient.forms.postForms()`). This is what most developer scripts use. It's part of the main VV REST API.

2. **`forminstance/`** — An alternative endpoint that creates records through a different server path (the FormsAPI server). It requires separate registration and direct HTTP calls — there's no SDK wrapper for it.

Both endpoints write **identical values** to the database. This was confirmed by creating records through each endpoint with the same input and comparing the database rows column by column — the stored `datetime` values are byte-for-byte identical.

The critical difference is not in how the data is _written_, but in how it is _read back_ when a user opens the record in the Forms UI. More on this below.

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

### The Core Issue: The Server Adds a Fake UTC Marker

The `FormInstance/Controls` server endpoint serializes the **same database value** differently depending on which API endpoint created the record:

| How the Record Was Created | Database Value            | Controls Sends to Browser         |
| -------------------------- | ------------------------- | --------------------------------- |
| `postForms` API            | `2026-03-15 14:30:00.000` | `"2026-03-15T14:30:00Z"` (with Z) |
| `forminstance/` API        | `2026-03-15 14:30:00.000` | `"03/15/2026 2:30:00 PM"` (no Z)  |
| Forms UI (user typed it)   | `2026-03-15 14:30:00.000` | `"03/15/2026 2:30:00 PM"` (no Z)  |

The database values are identical in all three cases. The difference is only in how Controls formats the string.

The `Z` suffix on `postForms` records is **incorrect**. The SQL Server `datetime` column is timezone-unaware — it stores a number, not a timezone. No value in it is "UTC" or "local" — it's just a timestamp without context. But Controls adds the `Z` anyway, and the Forms frontend takes it at face value.

### What Happens in the Browser

When the FormViewer receives `"2026-03-15T14:30:00Z"`, it interprets the Z as a genuine UTC marker. It then converts 14:30 UTC to the user's local time:

**For fields with `ignoreTimezone=false`** (standard timezone handling):

- The FormViewer converts 14:30 UTC → 11:30 São Paulo local time
- The display immediately shows **11:30 AM** (wrong)
- The stored value is updated to `"2026-03-15T11:30:00"` (shifted)

**For fields with `ignoreTimezone=true`** (the "ignore timezone" setting):

- The display widget shows the time as-is: **2:30 PM** (appears correct)
- But internally, the FormViewer has already parsed the Z and shifted the stored value to `"2026-03-15T11:30:00"`
- On first open, the user sees the correct time and trusts it
- When they save, the shifted stored value (11:30 AM) overwrites the original in the database
- On reopen, the display now shows **11:30 AM** — the time has "changed" without the user editing it

This second scenario — where the display looks correct but the underlying data is silently corrupted — is exactly what Freshdesk #124697 describes.

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

### Why Records Created by `forminstance/` and the Forms UI Are Safe

Records created through `forminstance/` or the Forms UI are serialized by Controls as `"03/15/2026 2:30:00 PM"` (US date format, no Z suffix). The FormViewer parses this as local time — no UTC conversion, no shift. The stored value matches what the user sees.

### When the Date Itself Changes (Midnight-Crossing)

For early-morning times, the shift can cross the date boundary — the stored **date** changes, not just the time:

| API Input               | Timezone  | Display on First Open | Stored Value After Open | Date Changed?                |
| ----------------------- | --------- | --------------------- | ----------------------- | ---------------------------- |
| `"2026-03-15T02:00:00"` | São Paulo | 02:00 AM (correct)    | `"2026-03-14T23:00:00"` | **Yes — stored as March 14** |
| `"2026-03-15T02:00:00"` | Mumbai    | 02:00 AM (correct)    | `"2026-03-15T07:30:00"` | No — same day                |

In São Paulo, any time between `T00:00:00` and `T02:59:59` will have the stored date shift to the **previous calendar day**. For larger timezone offsets (e.g., Los Angeles at UTC-8), the window is wider. For bulk data imports, the records look correct in Forms on first open but store the wrong calendar day.

### Date-Only Fields Are Immune

Date-only fields (`enableTime=false`) display correctly in all timezones, even for `postForms`-created records. The FormViewer's date-only parsing path extracts just the date portion and ignores any timezone information. The Z suffix from the Controls serialization is discarded along with the time component, so it never causes a shift.

### After Corruption, the Value Stabilizes

Once a user opens and saves a `postForms`-created record, the shifted value becomes the new database value. Subsequent opens and saves do not shift it further — the corruption is a one-time event on first save, then stable. This was confirmed by testing multiple open/save cycles on the same record.

---

## Steps to Reproduce

### 1. Create a Record via the API

Using the test harness:

```bash
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-1 --configs D --input-date "2026-03-15T14:30:00"
```

Or via any script that calls `vvClient.forms.postForms()` with a date/time field value.

Note the record name from the output (e.g., DateTest-001566).

### 2. Read Back via API — Confirm Z Was Added

```bash
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-2 --configs D --record-id DateTest-001566
```

The API response shows the value with Z appended: `"2026-03-15T14:30:00Z"`.

### 3. Open in Browser — Observe the Shift

Open the record in Chrome (with system timezone set to São Paulo). In DevTools console:

```javascript
// Check the stored value held by the FormViewer
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// Expected: "2026-03-15T14:30:00"
// Actual:   "2026-03-15T11:30:00"  ← shifted -3 hours
```

For a field with `ignoreTimezone=true`: the display shows 2:30 PM (looks correct), but the stored value above is already 11:30 AM.

### 4. Save and Reopen — Corruption Is Permanent

Save the form without editing the date field. Reopen. For `ignoreTimezone=true` fields, the display now shows **11:30 AM** instead of the original 2:30 PM. The database has been permanently overwritten.

---

## Workarounds

### Recommended: Use the `forminstance/` Endpoint Instead of `postForms`

The `forminstance/` endpoint stores datetime values in a format that the Forms frontend parses without timezone conversion. Records created through `forminstance/` display correctly in all timezones — zero shift, zero corruption.

```javascript
// forminstance/ payload (direct HTTP to the FormsAPI server):
const payload = {
    formTemplateId: '<revision-id>', // The template's revision ID, not the template GUID
    formName: '',
    fields: [{ key: 'Field5', value: '2026-03-15T14:30:00' }],
};
// POST to https://preformsapi.visualvault.com/forminstance/
```

**Limitations**:

- No SDK wrapper — requires direct HTTP calls to a different server than the main VV API
- Only supports new record creation — there is no `forminstance/` equivalent for updating existing records
- Requires FormsAPI registration for the form template on the target environment

**Important finding**: The `ignoreTimezone` field setting does not affect what gets stored in the database. Both `ignoreTimezone=true` and `ignoreTimezone=false` fields store identical database values for the same input. This was verified by comparing records created through all write paths (`postForms`, `forminstance/`, Forms UI). This means the `forminstance/` workaround works for all date/time field configurations.

### Use Date-Only Fields When Time Is Not Needed

Fields configured to store only a date (no time component) display correctly in all timezones regardless of which endpoint created the record. If the use case only requires a date, switching to a date-only field eliminates this bug entirely.

### Keep Records API-Only (No Human Opens Them in Forms)

If the date/time field is only read by scripts via the `getForms` API (never opened in the Forms UI by a human), no corruption occurs. The `getForms` API normalizes all serialization formats consistently, and the API round-trip is drift-free. The shift only manifests when the value crosses from the API layer to the Forms UI.

---

## Test Evidence

### API-to-Forms Cross-Layer Tests (8 tests — 2 PASS, 6 FAIL)

Records created via `postForms`, then opened in the Forms UI in two timezones. Each row tests a different field configuration:

| Field Configuration                             | Timezone  | Status | What Happened                                                      |
| ----------------------------------------------- | --------- | :----: | ------------------------------------------------------------------ |
| Date-only (`enableTime=false`)                  | São Paulo |  PASS  | Immune — date displays correctly                                   |
| Date-only (`enableTime=false`)                  | Mumbai    |  PASS  | Immune — date displays correctly                                   |
| Date+time, standard TZ (`ignoreTimezone=false`) | São Paulo |  FAIL  | Display: 11:30 AM instead of 2:30 PM (-3h shift)                   |
| Date+time, standard TZ (`ignoreTimezone=false`) | Mumbai    |  FAIL  | Display: 8:00 PM instead of 2:30 PM (+5:30h shift)                 |
| Date+time, ignore TZ (`ignoreTimezone=true`)    | São Paulo |  FAIL  | Display: 2:30 PM (looks correct), stored value: 11:30 AM (shifted) |
| Date+time, ignore TZ (`ignoreTimezone=true`)    | Mumbai    |  FAIL  | Display: 2:30 PM (looks correct), stored value: 8:00 PM (shifted)  |
| Date+time, legacy + standard TZ                 | São Paulo |  FAIL  | Same as standard TZ above                                          |
| Date+time, legacy + ignore TZ                   | Mumbai    |  FAIL  | Same as ignore TZ above                                            |

### `postForms` vs `forminstance/` Comparison (15 comparison rows)

Both endpoints write identical database values. The difference is only in how the Controls endpoint serializes them:

- **`postForms` records**: 2 PASS (date-only), 6 FAIL (date+time) — same results as above
- **`forminstance/` records**: 7 PASS, 0 FAIL — **zero shift** for any configuration or timezone

This confirms the root cause: the Controls endpoint serializes `postForms` records with a Z suffix (triggering the shift), while `forminstance/` records get a US date format (no Z, no shift). The database values are identical.

### Save-and-Stabilize Test (Freshdesk #124697 Reproduction)

Verifying the exact behavior reported in the support ticket — open a `postForms`-created record, save it, reopen:

| Field Configuration    | 1st Open Display | After Save+Reopen Display | Matches Freshdesk #124697?                 |
| ---------------------- | :--------------: | :-----------------------: | ------------------------------------------ |
| Date+time, standard TZ |     11:30 AM     |         11:30 AM          | No — shift is visible immediately          |
| Date+time, ignore TZ   |   **02:30 PM**   |       **11:30 AM**        | **Yes — exact match of reported behavior** |

The "ignore timezone" configuration is the most dangerous: the display looks correct on first open, the user saves trusting it, and the time changes on reopen.

### Database Dump Evidence

Direct database inspection confirmed:

- Record created by `postForms` (never opened in Forms): database = `14:30:00.000` — **correct**
- Same record after being opened and saved in Forms (São Paulo): database = `11:30:00.000` — **shifted, original permanently lost**
- Column-by-column comparison of `postForms` vs `forminstance/` records: **identical database values**, only the Controls serialization differs

### How Does Controls Know Which Endpoint Created the Record?

The form data table (`dbo.DateTest`) contains no flag or column that distinguishes records by creation endpoint. A column-by-column comparison shows identical metadata (same user, same field values — only internal IDs and timestamps differ). The serialization decision must be based on **hidden metadata in VV's internal system tables** (revision history, form instance tracking, or similar). The specific table or flag has not been identified — this is an open question for the product team.

---

## Technical Root Cause

### Component 1: Server-Side Serialization Inconsistency

The `FormInstance/Controls` endpoint adds a `Z` suffix to date/time values in records created by `postForms`, but not to records created by `forminstance/` or the Forms UI:

```
Database value (identical):       2026-03-15 14:30:00.000

Controls output for postForms:    "2026-03-15T14:30:00Z"      ← Z added (incorrect)
Controls output for forminstance: "03/15/2026 2:30:00 PM"      ← no Z (correct)
Controls output for Forms UI:     "03/15/2026 2:30:00 PM"      ← no Z (correct)
```

The Z is incorrect because the SQL Server `datetime` column is timezone-unaware — it stores a numeric timestamp with no timezone concept. Adding Z claims the value is UTC, but it could be any timezone (or no timezone at all).

### Component 2: The Forms Frontend Trusts the Z

The FormViewer JavaScript code that runs in the browser has a function called `initCalendarValueV1()` that processes field values when a form is loaded. This is part of the current production code path (called "V1" — the FormViewer has two code path versions, and V1 is the default for all standard forms).

When `initCalendarValueV1` receives a string ending in `Z`, it treats the Z as a real UTC marker. For fields with standard timezone handling (`ignoreTimezone=false`), it converts the UTC time to the user's local time — shifting the value. For fields with `ignoreTimezone=true`, the display is preserved but the internal stored value is still shifted.

Neither component is independently wrong in all cases — the defect emerges from their interaction. The Controls endpoint shouldn't add Z to a timezone-unaware value, and the FormViewer shouldn't blindly trust Z from a source that doesn't guarantee UTC.

### Interaction with Forms Calendar Bugs

This bug connects to three bugs documented in the Forms calendar investigation:

- **[FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md)** (fake Z on GetFieldValue): After the shift, if a developer script reads the field with `GetFieldValue()`, it gets the already-shifted value with an additional fake Z appended. Round-tripping via `SetFieldValue(GetFieldValue())` would drift the value further.

- **[FORM-BUG-4](../../forms-calendar/analysis/bug-4-legacy-save-format.md)** (Z stripped on save): When the user saves the form, the save function strips the Z from the shifted value before storing it — making the corruption permanent and timezone-ambiguous.

- **[FORM-BUG-1](../../forms-calendar/analysis/bug-1-timezone-stripping.md)** (Z stripped on load): The Z-stripping in the load path is conceptually the same operation — both the V1 inline code and this serialization bug treat Z as something to reinterpret rather than preserve.

---

## Proposed Fix

### Recommended: Fix the Controls Serialization (Server-Side)

Remove the creation-path-dependent serialization logic in the `FormInstance/Controls` endpoint. All records should be serialized the same way, regardless of which endpoint created them:

```
Current (broken):
  postForms record:     Controls returns "2026-03-15T14:30:00Z"     (Z added — incorrect)
  forminstance/ record: Controls returns "03/15/2026 2:30:00 PM"    (no Z — correct)
  Forms UI record:      Controls returns "03/15/2026 2:30:00 PM"    (no Z — correct)

Fixed:
  ALL records:          Controls returns "03/15/2026 2:30:00 PM"    (no Z — consistent)
```

**Why this is the right fix:**

- The Z is a lie — the `datetime` column has no timezone context
- The `forminstance/` and Forms UI serialization (US format, no Z) is already correct and consistent
- One change in one server code path fixes all existing and future records
- No client-side changes needed — the FormViewer already handles the US format correctly
- No developer-side changes needed — existing scripts work as-is

**What needs to happen:**

1. Identify the metadata or code path that Controls uses to decide the serialization format (it's not in the form data table — likely in VV's internal revision/instance tracking tables)
2. Remove or bypass that branching logic
3. Apply consistent serialization (US format, no Z) for all records

### Alternative: Fix the Forms Frontend (Defensive)

If the Controls serialization cannot be changed, the FormViewer could be modified to strip the Z before parsing, treating all values as local time regardless of the Z suffix. This works but papers over the inconsistent serialization rather than fixing it, and requires regression testing across all form load scenarios.

### Not Recommended: Require Developers to Send Timezone Offsets

Requiring scripts to include offsets (e.g., `"T14:30:00-03:00"`) places the burden on developers and doesn't help with existing records already stored without offsets.

---

## Fix Impact Assessment

### What Changes If Fixed (Controls Serialization Fix)

- All records display consistently in Forms regardless of which endpoint created them
- Freshdesk #124697 behavior eliminated for all future form opens
- The `forminstance/` workaround becomes unnecessary
- No developer-side changes needed — existing scripts work as-is

### Backwards Compatibility Risk: LOW

The database values are correct — only the serialization was wrong. After the fix, existing `postForms` records that were **never opened in Forms** will now display correctly. Records that **were already opened and saved** have the shifted value permanently in the database (e.g., `11:30:00` instead of `14:30:00`). These cannot be automatically fixed because the system cannot distinguish "shifted by this bug" from "intentionally entered as 11:30."

**Risk area**: Applications that read `FormInstance/Controls` directly (not through the Forms UI) and parse the ISO+Z format would need to handle the US format instead. This is an uncommon pattern but should be checked.

### No Data Migration Needed

The fix is in the serialization layer, not in the database. Existing database values are correct (for records never opened in Forms) or already permanently shifted (for records that were opened and saved). No data changes are required.
