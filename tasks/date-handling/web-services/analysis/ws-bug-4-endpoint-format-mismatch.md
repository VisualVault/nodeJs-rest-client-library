# WEBSERVICE-BUG-4: Two API Endpoints Store the Same Value but Produce Different Behavior in Forms

## What Happens

The VisualVault platform has two REST API endpoints for creating form records. A developer sends the exact same date/time input — `"2026-03-15T14:30:00"` (2:30 PM, March 15) — through both endpoints. Both return success. Both store identical values in the database.

But when a user opens these two records in the VisualVault Forms UI:

- The record created through the standard endpoint shows the **wrong time** — shifted by the user's timezone offset (e.g., 11:30 AM instead of 2:30 PM in São Paulo)
- The record created through the alternative endpoint shows the **correct time** — 2:30 PM

The choice of which API endpoint to use — a decision that should be purely a developer preference — silently determines whether date/time values will be correct when users view the record in Forms. This is the architectural root cause behind the date shift described in [WEBSERVICE-BUG-1](ws-bug-1-cross-layer-shift.md).

---

## When This Applies

Three conditions must all be true for the endpoint inconsistency to produce different behavior:

### 1. Records are created through `postForms` (the standard SDK endpoint)

VisualVault provides two independent REST API endpoints for creating form records:

- **`postForms`** — The standard endpoint available through the VV Node.js SDK (`vvClient.forms.postForms()`). This is what most developer scripts use. It is part of the main VV REST API (e.g., `vvdemo.visualvault.com`). Also has an update method: `postFormRevision()`.

- **`forminstance/`** — An alternative endpoint on a separate server (the FormsAPI server, e.g., `preformsapi.visualvault.com`). Requires direct HTTP calls — there is no SDK wrapper. Only supports new record creation (no update equivalent). Requires separate FormsAPI registration for the form template.

Both endpoints write identical values to the database — confirmed by column-by-column comparison of actual SQL Server rows. The difference is in how an intermediate server layer formats the value before sending it to the browser (see [The Problem in Detail](#the-problem-in-detail)).

Only `postForms` records are affected. `forminstance/` records and records created through the Forms UI display correctly in all timezones.

### 2. The field stores a time component (date+time, not date-only)

Date-only fields (`enableTime=false`) display correctly regardless of which endpoint created the record. The formatting difference exists in the server layer, but the Forms frontend's date-only parsing path discards timezone information along with the time component. The inconsistency only produces different visible behavior for date+time fields.

### 3. A user opens the record in the Forms UI from a non-UTC timezone

The `getForms` API (the standard API for reading form data in scripts) normalizes both formats to the same output — `"2026-03-15T14:30:00Z"` — regardless of which endpoint created the record. A developer testing their script with `getForms` sees identical values for both endpoints and has no indication that the Forms UI will behave differently.

The formatting inconsistency only surfaces when the Forms frontend (FormViewer) receives the value through the `FormInstance/Controls` internal endpoint. At UTC+0, the inconsistent formatting produces no visible shift (coincidental correctness).

---

## Severity: HIGH

Design flaw — the choice of API endpoint silently determines whether date/time values will be correct in the Forms UI. The `getForms` API normalizes both formats, so developers testing via API have no indication of the problem. Discovery only happens when a user opens the record in Forms, potentially months after creation. Confirmed architectural root cause of [WEBSERVICE-BUG-1](ws-bug-1-cross-layer-shift.md) and Freshdesk #124697.

---

## How to Reproduce

### 1. Create Records via Both Endpoints

```javascript
// postForms (standard SDK method)
const data = { Field5: '2026-03-15T14:30:00' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
// → Record created (e.g., DateTest-001583)

// forminstance/ (direct HTTP to FormsAPI server)
const payload = {
    formTemplateId: '<revision-id>', // NOT the template GUID — the revision ID
    formName: '',
    fields: [{ key: 'Field5', value: '2026-03-15T14:30:00' }],
};
// POST to https://preformsapi.visualvault.com/forminstance/
// → Record created (e.g., DateTest-001584)
```

### 2. Read Both via API — Observe Identical Values

```javascript
// Both return "2026-03-15T14:30:00Z" — indistinguishable via API
const r1 = await vvClient.forms.getForms({ fields: 'dataField5', q: "instanceName eq 'DateTest-001583'" }, TEMPLATE_ID);
// datafield5 = "2026-03-15T14:30:00Z"

const r2 = await vvClient.forms.getForms({ fields: 'dataField5', q: "instanceName eq 'DateTest-001584'" }, TEMPLATE_ID);
// datafield5 = "2026-03-15T14:30:00Z"  ← identical
```

### 3. Open Both in the Forms UI — Observe Different Behavior

Open each record in Chrome (system timezone set to São Paulo, UTC-3). In DevTools console:

```javascript
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// postForms record:      "2026-03-15T11:30:00"   ← shifted -3 hours
// forminstance/ record:  "2026-03-15T14:30:00"   ← correct
```

- **Expected**: Both records display 2:30 PM (same input, same database value)
- **Actual**: `postForms` record shows 11:30 AM; `forminstance/` record shows 2:30 PM

### Automated

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Background

### How the Forms UI Reads Field Values

When a user opens a form record in the browser, the Forms application (FormViewer) does **not** read field values through the `postForms`/`getForms` API. Instead, it uses an internal endpoint called `FormInstance/Controls` on the FormsAPI server.

The Controls endpoint reads the raw `datetime` value from the SQL Server database and converts it to a string for the browser. This is where the inconsistency lives: Controls formats the same database value differently depending on which endpoint created the record.

### What Are "Stored Value" and "Displayed Value"?

Two values are important to distinguish throughout this document:

- **Stored value**: The date/time string held in the FormViewer's internal data structure (called "rawValue" in the code). This is what gets sent to the server when the user saves. Inspect it with `VV.Form.VV.FormPartition.getValueObjectValue('FieldName')`.

- **Displayed value**: What the user sees in the calendar field on screen. The FormViewer may convert the stored value (e.g., from UTC to local time) before displaying it.

### The API Read Path Masks the Inconsistency

The `getForms` API normalizes both serialization formats to ISO+Z before returning them to scripts:

```
postForms record:      DB = 2026-03-15 14:30:00.000   → getForms returns "2026-03-15T14:30:00Z"
forminstance/ record:  DB = 2026-03-15 14:30:00.000   → getForms returns "2026-03-15T14:30:00Z"
```

A developer testing their script with `getForms` sees identical read-back values for both endpoints. The problem only surfaces when a user opens the record in the Forms UI — potentially months after the data was created. This normalization is well-designed for API consistency but masks the serialization inconsistency in the Controls layer.

---

## The Problem in Detail

### Same Database Value, Different Formatting

The Controls endpoint applies different string formatting based on hidden metadata that tracks which endpoint created the record:

| How the Record Was Created | Database Value (identical) | Controls Sends to Browser                              |
| -------------------------- | -------------------------- | ------------------------------------------------------ |
| `postForms`                | `2026-03-15 14:30:00.000`  | `"2026-03-15T14:30:00Z"` (ISO with Z — triggers shift) |
| `forminstance/`            | `2026-03-15 14:30:00.000`  | `"03/15/2026 14:30:00"` (US format, no Z — correct)    |
| Forms UI (user typed it)   | `2026-03-15 14:30:00.000`  | `"03/15/2026 14:30:00"` (US format, no Z — correct)    |

The Z suffix on `postForms` records is incorrect — the SQL Server `datetime` column is timezone-unaware. No value in it is "UTC." But Controls adds the Z to `postForms` records only.

### How the FormViewer Reacts to Each Format

The FormViewer's initialization code (the current production code path, V1) is format-sensitive — it parses the string it receives from Controls and handles different formats differently:

**ISO with Z** (from `postForms` records):
The FormViewer sees the Z, interprets it as a real UTC marker, and converts to the user's local time. In São Paulo (UTC-3), `14:30 UTC` becomes `11:30 local` — a 3-hour backward shift. The stored value is permanently changed to 11:30.

**US format without Z** (from `forminstance/` and Forms UI records):
The FormViewer sees no timezone marker, parses the value as local time. `14:30` stays as `14:30`. No conversion, no shift.

### How Controls Decides the Format

The form data table in the database contains no flag or column that distinguishes records by creation endpoint — a column-by-column comparison of `postForms` vs `forminstance/` records shows identical metadata (same user, same field values, only internal IDs and timestamps differ). The serialization decision must be based on hidden metadata in VV's internal system tables (revision history, form instance tracking, or similar). The specific table or flag has not been identified — this is an open question for the product team.

### No Shared Serialization Contract

The VV platform correctly stores identical `datetime` values regardless of write path — the database layer is consistent. But the `FormInstance/Controls` serialization layer applies different string formats based on hidden creation-path metadata. This is not a defect in either endpoint individually — it is an inconsistency in the layer that sits between the database and the Forms frontend.

The absence of a consistent serialization contract means:

- Any new endpoint could introduce yet another format via its own metadata
- Format-sensitive consumers (like the Forms frontend) produce unpredictable results depending on which endpoint created the record
- The platform's behavior depends on hidden metadata invisible to developers and absent from the form data table

### Relationship to WEBSERVICE-BUG-1

WEBSERVICE-BUG-4 describes the **architectural cause** — the inconsistent serialization between endpoints. [WEBSERVICE-BUG-1](ws-bug-1-cross-layer-shift.md) describes the **user-facing consequence** — the date/time shift and permanent data corruption when `postForms` records are opened in Forms.

Fixing WEBSERVICE-BUG-4 (unifying the Controls serialization) automatically fixes WEBSERVICE-BUG-1. They share the same proposed fix — see the companion document.

---

## Verification

Verified via the test harness and manual browser inspection on the demo environment at `vvdemo.visualvault.com`, across two timezones (São Paulo/BRT UTC-3, Mumbai/IST UTC+5:30). Records were created through both `postForms` and `forminstance/` with the same input (`"2026-03-15T14:30:00"`), read back via the `getForms` API to confirm identical values, then opened in the Forms UI to compare behavior.

API read-back confirmed that `getForms` returns identical values for both endpoints — the normalization masks the serialization difference from scripts. In the Forms UI, `forminstance/` records achieved a 100% PASS rate across all field configurations and timezones (date+time standard TZ, date+time ignore TZ, date+time legacy + ignore TZ). `postForms` records failed for every date+time configuration in every non-UTC timezone — shifted by the user's timezone offset (e.g., -3h in São Paulo, +5:30h in Mumbai). Date-only fields passed for both endpoints.

Database dump comparison (2026-04-06) confirmed identical `datetime` values in both records, with no visible flag in the form data table distinguishing records by creation endpoint. The serialization decision by Controls must be based on hidden metadata in VV's internal system tables.

**Limitations**: The hidden metadata mechanism has not been identified. Testing was performed on the demo environment only. Other environments have not been verified.

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The `FormInstance/Controls` endpoint on the FormsAPI server applies different string serialization formats to the same database `datetime` value based on hidden creation-path metadata:

- `postForms` records: serialized as `"2026-03-15T14:30:00Z"` (ISO with incorrect Z suffix)
- `forminstance/` records: serialized as `"03/15/2026 14:30:00"` (US format, no Z)
- Forms UI records: serialized as `"03/15/2026 14:30:00"` (US format, no Z)

The Z suffix is incorrect because the SQL Server `datetime` column is timezone-unaware — it stores a numeric timestamp with no timezone context.

**File locations**: The Controls endpoint and its serialization logic are server-side .NET code, not available in this repository. The hidden metadata that determines the serialization format is not in the form data table (`dbo.DateTest`) — it is likely in VV's internal revision or form instance tracking tables. Neither the .NET code nor the metadata table has been identified.

The Forms frontend (`main.js`, function `initCalendarValueV1()` at line ~102886) is format-sensitive — it treats Z-suffixed strings as UTC and converts to local time, while US-formatted strings are parsed as local time without conversion. This format sensitivity is correct behavior in isolation; the defect is in the inconsistent serialization that feeds it different formats for identical database values.

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

All date+time configurations (C, D, G, H) are affected by the endpoint inconsistency. All date-only configurations (A, B, E, F) display correctly regardless of which endpoint created the record.

---

## Workarounds and Fix Recommendations

See [ws-bug-4-fix-recommendations.md](ws-bug-4-fix-recommendations.md) for workarounds, endpoint selection guide, proposed fix, and impact assessment.
