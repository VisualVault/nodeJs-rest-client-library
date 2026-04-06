# WEBSERVICE-BUG-4: Two API Endpoints Store the Same Value but Produce Different Behavior in Forms

## What Happens

The VisualVault platform has two REST API endpoints for creating form records: `postForms` (the standard endpoint in the VV SDK) and `forminstance/` (an alternative endpoint on a separate server). A developer sends the exact same date/time input — `"2026-03-15T14:30:00"` — through both endpoints. Both return success. Both store **identical values** in the database (confirmed by inspecting the actual SQL Server rows).

But when a user opens these two records in the VisualVault Forms UI:

- The `postForms` record shows the **wrong time** — shifted by the user's timezone offset (e.g., 11:30 AM instead of 2:30 PM in São Paulo)
- The `forminstance/` record shows the **correct time** — 2:30 PM

The database values are identical. The difference is in how an intermediate server layer formats the value before sending it to the browser. This formatting layer adds a UTC timezone marker (`Z`) to `postForms` records but not to `forminstance/` records. The Forms frontend interprets the Z as real UTC and converts to local time — producing the shift described in [WEBSERVICE-BUG-1](ws-bug-1-cross-layer-shift.md).

This is the architectural root cause behind WEBSERVICE-BUG-1 and explains why the Freshdesk #124697 workaround (switching from `postForms` to `forminstance/`) eliminates the datetime shift — it changes how the value is formatted for the browser, not what's stored in the database.

---

## Severity: HIGH (Design Flaw)

The choice of which API endpoint to use — a decision that should be purely a developer preference — silently determines whether date/time values will be corrupted when users open records in Forms.

---

## Who Is Affected

- **Developers choosing between endpoints**: Without knowledge of this bug, the choice between `postForms` and `forminstance/` appears to be purely an API preference (SDK convenience vs direct HTTP). In reality, the choice determines whether date/time values will be corrupted when viewed in Forms.
- **Customers who followed the Freshdesk #124697 workaround**: The recommended workaround was to switch from `postForms` to `forminstance/`. These customers are now relying on this inconsistency — any fix that unifies the formatting must not break their existing setup.
- **Date-only fields are not affected**: Fields configured to store only a date (no time) display correctly regardless of which endpoint created the record. The formatting difference exists but both formats resolve to the same calendar date.

---

## Background

### The Two API Endpoints

VisualVault provides two independent REST API endpoints for creating form records:

**`postForms`** (standard endpoint):

- Server: the main VV API server (e.g., `vvdemo.visualvault.com`)
- Access: via the VV Node.js SDK (`vvClient.forms.postForms()`) or direct HTTP
- Also has an update method: `postFormRevision()`

**`forminstance/`** (alternative endpoint):

- Server: a separate FormsAPI server (e.g., `preformsapi.visualvault.com`)
- Access: direct HTTP only — no SDK wrapper
- Only supports new record creation — no update/revision equivalent
- Requires separate FormsAPI registration for the form template

Both endpoints accept the same date/time input and both write to the same SQL Server database table. The stored `datetime` values are byte-for-byte identical — confirmed by inspecting actual database rows.

### How the Forms UI Reads Field Values

When a user opens a form record in the browser, the Forms application (FormViewer) does **not** read field values through the `postForms`/`getForms` API. Instead, it uses an internal endpoint called `FormInstance/Controls` on the FormsAPI server.

The Controls endpoint reads the raw `datetime` value from the SQL Server database and converts it to a string for the browser. This is where the problem lives: Controls formats the **same database value** differently depending on which endpoint created the record.

### What Are "Stored Value" and "Displayed Value"?

Two values are important to distinguish throughout this document:

- **Stored value**: The date/time string held in the FormViewer's internal data structure (called "rawValue" in the code). This is what gets sent to the server when the user saves. You can inspect it in the browser console with `VV.Form.VV.FormPartition.getValueObjectValue('FieldName')`.

- **Displayed value**: What the user sees in the calendar field on screen. The FormViewer may convert the stored value (e.g., from UTC to local time) before displaying it.

---

## The Problem in Detail

### Same Database Value, Different Formatting

The Controls endpoint applies different string formatting based on hidden metadata that tracks which endpoint created the record:

| How the Record Was Created | Database Value (identical) | Controls Sends to Browser                                  |
| -------------------------- | -------------------------- | ---------------------------------------------------------- |
| `postForms`                | `2026-03-15 14:30:00.000`  | `"2026-03-15T14:30:00Z"` (ISO with Z — **triggers shift**) |
| `forminstance/`            | `2026-03-15 14:30:00.000`  | `"03/15/2026 14:30:00"` (US format, no Z — **safe**)       |
| Forms UI (user typed it)   | `2026-03-15 14:30:00.000`  | `"03/15/2026 14:30:00"` (US format, no Z — **safe**)       |

The Z suffix on `postForms` records is incorrect — the SQL Server `datetime` column is timezone-unaware. No value in it is "UTC." But Controls adds the Z anyway.

### How the FormViewer Reacts to Each Format

The FormViewer's initialization code (the current production code path, called "V1") is **format-sensitive** — it parses the string it receives from Controls and handles different formats differently:

**ISO with Z** (from `postForms` records):
The FormViewer sees the Z, interprets it as a real UTC marker, and converts to the user's local time. In São Paulo (UTC-3), `14:30 UTC` becomes `11:30 local` — a 3-hour backward shift. The stored value is permanently changed to 11:30.

**US format without Z** (from `forminstance/` and Forms UI records):
The FormViewer sees no timezone marker, parses the value as local time. `14:30` stays as `14:30`. No conversion, no shift.

### The API Read Path Hides the Problem

The `getForms` API (the standard API for reading form data in scripts) normalizes both formats to ISO+Z:

```
postForms record:      DB = 2026-03-15 14:30:00.000   → getForms returns "2026-03-15T14:30:00Z"
forminstance/ record:  DB = 2026-03-15 14:30:00.000   → getForms returns "2026-03-15T14:30:00Z"
```

A developer testing their script with `getForms` sees identical read-back values for both endpoints. They have no reason to suspect the Controls serialization differs. The problem only surfaces when a user opens the record in the Forms UI — potentially months after the data was created.

### How Controls Decides the Format

The form data table in the database contains no flag or column that distinguishes records by creation endpoint — a column-by-column comparison of `postForms` vs `forminstance/` records shows identical metadata (same user, same field values, only internal IDs and timestamps differ). The serialization decision must be based on **hidden metadata in VV's internal system tables** (revision history, form instance tracking, or similar). The specific table or flag has not been identified — this is an open question for the product team.

---

## Steps to Reproduce

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
// datafield5 = "2026-03-15T14:30:00Z"  ← SAME
```

### 3. Open Both in the Forms UI — Observe Different Behavior

Open each record in Chrome (São Paulo timezone). In DevTools console:

```javascript
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// postForms record:      "2026-03-15T11:30:00"   ← shifted -3 hours
// forminstance/ record:  "2026-03-15T14:30:00"   ← preserved correctly
```

---

## Workarounds

### Use `forminstance/` for Date+Time Fields Viewed in Forms (Recommended)

The `forminstance/` endpoint stores dates in a format that the Forms frontend parses without timezone conversion. Records created through `forminstance/` display correctly in all timezones.

**Key differences between the two endpoints:**

| Aspect         | `postForms` (standard SDK)          | `forminstance/` (FormsAPI)                     |
| -------------- | ----------------------------------- | ---------------------------------------------- |
| Server         | Main VV API server                  | Separate FormsAPI server                       |
| SDK method     | `vvClient.forms.postForms()`        | None — direct HTTP only                        |
| Field format   | `{ Field5: "value" }` (flat object) | `[{ key: "Field5", value: "value" }]` (array)  |
| Template ID    | Template GUID                       | **Revision ID** (different from template GUID) |
| Update support | `postFormRevision()`                | **No equivalent** — new records only           |
| Authentication | Same OAuth token                    | Same OAuth token                               |

**Limitations:**

- No SDK wrapper — requires manual HTTP request construction
- No update/revision endpoint — only supports new record creation
- Requires the form template to be registered in FormsAPI on the target environment
- Must use the revision ID (not template GUID) as `formTemplateId`

### Use `postForms` for API-Only Workflows

If the date+time field is only consumed by scripts via the `getForms` API and never opened in Forms by a user, `postForms` is safe. The API read path normalizes both formats identically. The serialization mismatch only matters when the value crosses to the Forms UI.

### Endpoint Selection Guide

| Use Case                                  | Recommended Endpoint | Why                                             |
| ----------------------------------------- | :------------------: | ----------------------------------------------- |
| Date+time fields viewed in Forms          |   `forminstance/`    | Avoids the cross-layer shift (WEBSERVICE-BUG-1) |
| Date-only fields                          |        Either        | Both produce correct display                    |
| Date+time fields consumed only by scripts |        Either        | API read path normalizes both formats           |
| Updating existing records                 |  `postFormRevision`  | `forminstance/` has no revision/update support  |

---

## Test Evidence

### Endpoint Comparison — postForms vs forminstance/

Both endpoints were tested with the same input (`"2026-03-15T14:30:00"`) across multiple field configurations and timezones. Records were read back via the API, then opened in the Forms UI to compare behavior.

**API read-back**: Both endpoints return identical values via `getForms` — the API read path normalizes both serialization formats, masking the difference from scripts.

**Forms UI behavior** (São Paulo, UTC-3):

| Field Type                    | Endpoint      | Displayed Time | Stored Value (internal)               | Status |
| ----------------------------- | ------------- | :------------: | ------------------------------------- | :----: |
| Date+time, standard TZ        | postForms     |    11:30 AM    | `"...T11:30:00"` (shifted)            |  FAIL  |
| Date+time, standard TZ        | forminstance/ |  **02:30 PM**  | **`"...T14:30:00"`** (correct)        |  PASS  |
| Date+time, ignore TZ          | postForms     |    02:30 PM    | `"...T11:30:00"` (shifted internally) |  FAIL  |
| Date+time, ignore TZ          | forminstance/ |  **02:30 PM**  | **`"...T14:30:00"`** (correct)        |  PASS  |
| Date+time, legacy + ignore TZ | postForms     |    02:30 PM    | `"...T11:30:00"` (shifted internally) |  FAIL  |
| Date+time, legacy + ignore TZ | forminstance/ |  **02:30 PM**  | **`"...T14:30:00"`** (correct)        |  PASS  |

**Forms UI behavior** (Mumbai, UTC+5:30):

| Field Type             | Endpoint      | Displayed Time | Stored Value (internal)               | Status |
| ---------------------- | ------------- | :------------: | ------------------------------------- | :----: |
| Date+time, standard TZ | postForms     |    08:00 PM    | `"...T20:00:00"` (shifted)            |  FAIL  |
| Date+time, standard TZ | forminstance/ |  **02:30 PM**  | **`"...T14:30:00"`** (correct)        |  PASS  |
| Date+time, ignore TZ   | postForms     |    02:30 PM    | `"...T20:00:00"` (shifted internally) |  FAIL  |
| Date+time, ignore TZ   | forminstance/ |  **02:30 PM**  | **`"...T14:30:00"`** (correct)        |  PASS  |

**Pattern**: `forminstance/` records always preserve the original stored value regardless of timezone. `postForms` records always shift by the user's timezone offset.

**Overall results**: `forminstance/` achieves **100% PASS rate** across all field configurations and timezones. `postForms` fails for every date+time configuration in every non-UTC timezone. Date-only fields pass for both endpoints.

### Database Verification

Database dump comparison (2026-04-06) of records created by each endpoint with identical input:

- Both records have identical `datetime` values in the database
- Both records have identical metadata in the form data table (same user, same field values)
- Only internal IDs and timestamps differ — no visible flag distinguishes them by creation endpoint
- The serialization decision by Controls must be based on hidden metadata in VV's internal system tables

---

## Impact Analysis

### Architectural: Two Write Paths, No Shared Serialization Contract

The VV platform correctly stores identical `datetime` values regardless of write path — the database layer is consistent. But the `FormInstance/Controls` serialization layer applies different string formats based on hidden creation-path metadata. This is not a bug in either endpoint individually — it's an inconsistency in the layer that sits between the database and the Forms frontend.

The absence of a consistent serialization contract means:

- Any new endpoint could introduce yet another format via its own metadata
- Format-sensitive consumers (like the Forms frontend) produce unpredictable results depending on which endpoint created the record
- The platform's behavior depends on hidden metadata invisible to developers and absent from the form data table

### The API Read Path Creates a False Sense of Consistency

The `getForms` API normalizes both serialization formats to ISO+Z before returning them to scripts. This is well-intentioned (consistent API output) but means developers testing their scripts via API see identical values for both endpoints. They have no reason to suspect the Forms UI will behave differently. The problem only surfaces when a user opens the record — potentially months after creation.

### Workaround Dependency

Customers who followed the Freshdesk #124697 workaround (switch to `forminstance/`) are relying on this inconsistency. Any fix that unifies the serialization must either:

- Unify to the `forminstance/` format (US, no Z) — workaround becomes unnecessary, existing setup preserved
- Unify to the `postForms` format (ISO+Z) — workaround breaks, must be combined with a Forms frontend fix

---

## Proposed Fix

The database values are correct — only the Controls serialization is inconsistent. The fix is in the `FormInstance/Controls` layer. See [WEBSERVICE-BUG-1 — Proposed Fix](ws-bug-1-cross-layer-shift.md#proposed-fix) for the full recommendation.

**Summary**: Remove the creation-path-dependent serialization logic in Controls. All records should be serialized the same way (US format, no Z) regardless of which endpoint created them. This is a single server-side code path change — no database migration, no client-side changes, no developer-side changes.

**What needs to happen:**

1. Identify the hidden metadata that Controls uses to decide the serialization format (not in the form data table — likely in VV's internal revision/instance tracking tables)
2. Remove or bypass that branching logic
3. Apply consistent serialization for all records

---

## Fix Impact Assessment

### What Changes If Fixed

- Controls serializes all records consistently — no format depends on creation path
- [WEBSERVICE-BUG-1](ws-bug-1-cross-layer-shift.md) (cross-layer shift) is eliminated as a direct consequence
- The `forminstance/` workaround for Freshdesk #124697 becomes unnecessary
- Developers can choose endpoints based on API preference, not date handling side effects

### Backwards Compatibility Risk: LOW

The database values are not changing — only the Controls serialization. Records already opened and saved by users (with shifted values permanently in the database) will continue to display their shifted values. Records not yet opened in Forms will now display correctly.

**Risk area**: Applications that read `FormInstance/Controls` directly (not through the Forms UI) and parse the ISO+Z format would need to handle the US format. This is an uncommon pattern but should be checked.

### Open Question for the Product Team

The metadata that Controls uses to decide the serialization format is not in the form data table. It's likely in VV's internal revision or instance tracking tables. The product team needs to identify where this branching logic lives before the fix can be implemented.
