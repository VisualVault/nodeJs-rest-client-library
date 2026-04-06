# WS-BUG-4: postForms vs forminstance/ Storage Format Mismatch

## Classification

| Field                  | Value                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**           | HIGH                                                                                                                                          |
| **Evidence**           | `[LIVE]` — Confirmed via WS-10 endpoint comparison + browser verification in BRT and IST                                                      |
| **Component**          | VV Server — core API (`postForms` at `vvdemo.*`) vs FormsAPI (`forminstance/` at `preformsapi.*`)                                             |
| **Code Path**          | Two independent write paths with no shared date normalization layer                                                                           |
| **Affected Configs**   | C, D, G, H (DateTime configs — the format difference triggers divergent Forms V1 behavior). Date-only A, B, E, F are functionally unaffected. |
| **Affected TZs**       | All non-UTC timezones (the format difference causes TZ-dependent behavior in Forms V1)                                                        |
| **Affected Scenarios** | Any developer choosing between `postForms` and `forminstance/` for form creation                                                              |
| **Related Bugs**       | Root cause of WS-BUG-1 (cross-layer datetime shift). Explains the Freshdesk #124697 workaround mechanism.                                     |
| **Freshdesk**          | #124697 / WADNR-10407                                                                                                                         |

---

## Summary

The VisualVault platform has two independent endpoints for creating form records. Both accept the same datetime input, both return success, and both produce identical results when read back via `getForms()`. But they store the value in **different physical formats** in the database:

| Endpoint                   | Server                        | Input                   | Stored Format                              |
| -------------------------- | ----------------------------- | ----------------------- | ------------------------------------------ |
| `postForms` (core API)     | `vvdemo.visualvault.com`      | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` (ISO 8601 + Z)    |
| `forminstance/` (FormsAPI) | `preformsapi.visualvault.com` | `"2026-03-15T14:30:00"` | `"03/15/2026 14:30:00"` (US format, no TZ) |

The core API read path (`getForms`) normalizes both formats to ISO+Z on read, completely masking the storage divergence from API consumers. The difference is only visible through the `FormInstance/Controls` endpoint or — critically — through the Forms UI, which parses the stored format directly.

Forms V1 (`initCalendarValueV1`) is **format-sensitive**:

- ISO+Z → interpreted as UTC → converted to local time → **shifted** (WS-BUG-1)
- US format (no TZ) → interpreted as local time → **no conversion** → preserved

This is why the Freshdesk #124697 workaround (switching from `postForms` to `forminstance/`) eliminates the datetime shift — it changes the storage format, which changes how Forms V1 parses the value.

---

## Who Is Affected

### Developers choosing between endpoints

Any developer creating form records via the API must choose between `postForms` and `forminstance/`. Without knowledge of this bug, the choice appears to be purely an API preference. In reality, the choice determines whether datetime values will be corrupted when viewed in Forms.

### The Freshdesk #124697 customer base

Freshdesk #124697 (WA DNR, John Sevilla) reports datetime mutation for records created via `postForms`. The recommended workaround — switching to `forminstance/` — works precisely because of this format mismatch. Any customer who followed that workaround is relying on this inconsistency.

### Date-only fields: functionally unaffected

For date-only configs (A, B, E, F), the format difference exists but does not cause behavioral divergence in Forms. Both `"2026-03-15T00:00:00Z"` (postForms) and `"03/15/2026 14:30:00"` (forminstance/) resolve to the correct calendar date `03/15/2026` on display. The rawValue differs (ISO date string vs US format string), but the display date is correct in both cases.

---

## Root Cause

### Two independent write paths, no shared normalization

The VV platform has two completely separate code paths for writing form data:

**Core API** (`postForms` at `vvdemo.visualvault.com`):

- Endpoint: `POST /api/v1/{customerAlias}/{databaseAlias}/formtemplates/{id}/forms`
- Date normalization: converts to ISO 8601, appends Z suffix
- Storage: `"2026-03-15T14:30:00Z"`

**FormsAPI** (`forminstance/` at `preformsapi.visualvault.com`):

- Endpoint: `POST /forminstance/`
- Date normalization: converts to US format, no timezone indicator
- Storage: `"03/15/2026 14:30:00"`

There is no shared date normalization layer between these paths. Each endpoint writes field values in its own format directly to the database.

### Read path masks the divergence

The core API read path (`getForms`) normalizes all date values to ISO+Z format on retrieval:

```
postForms record:      DB has "2026-03-15T14:30:00Z"   → getForms returns "2026-03-15T14:30:00Z"
forminstance/ record:  DB has "03/15/2026 14:30:00"     → getForms returns "2026-03-15T14:30:00Z"
```

Both return identical values. The storage difference is invisible to any consumer using `getForms()`. Only `FormInstance/Controls` (which returns raw field values) reveals the actual stored format.

### Forms V1 reads raw storage, not normalized API output

When a user opens a form, Forms V1 does NOT go through the `getForms` API. It reads the raw stored value via `FormInstance/Controls`, which preserves the original storage format. The `initCalendarValueV1` function then parses this format-sensitively:

```javascript
// For postForms records (ISO+Z format):
// input = "2026-03-15T14:30:00Z"
let stripped = input.replace('Z', ''); // → "2026-03-15T14:30:00"
// if ignoreTimezone=false:
result = moment(stripped).tz('UTC', true).local(); // → local time (shifted)
// if ignoreTimezone=true:
result = moment(stripped); // → local time (but display preserved by ignoreTZ flag)

// For forminstance/ records (US format):
// input = "03/15/2026 14:30:00"
let stripped = input.replace('Z', ''); // → "03/15/2026 14:30:00" (no Z to strip)
result = moment(stripped); // → local time parse → 14:30 local (correct, no shift)
```

The US format has no Z to strip and no UTC marker, so it's parsed as local time — which is what the developer intended.

---

## Expected vs Actual Behavior

### Storage Format Comparison (same input, different endpoints)

| Aspect              | postForms                | forminstance/            |
| ------------------- | ------------------------ | ------------------------ |
| **Input**           | `"2026-03-15T14:30:00"`  | `"2026-03-15T14:30:00"`  |
| **Stored format**   | `"2026-03-15T14:30:00Z"` | `"03/15/2026 14:30:00"`  |
| **getForms return** | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` |
| **storedMatch**     | —                        | `true` (CB-30)           |

### Forms V1 Behavior Comparison (BRT, UTC-3)

| Config | Endpoint      |    Display     | rawValue             | GFV                       | Status |
| :----: | ------------- | :------------: | -------------------- | ------------------------- | :----: |
|   C    | postForms     |   `11:30 AM`   | `"...T11:30:00"`     | `"...T14:30:00.000Z"`     |  FAIL  |
|   C    | forminstance/ | **`02:30 PM`** | **`"...T14:30:00"`** | `"...T17:30:00.000Z"`     |  PASS  |
|   D    | postForms     |   `02:30 PM`   | `"...T11:30:00"`     | `"...T11:30:00.000Z"`     |  FAIL  |
|   D    | forminstance/ | **`02:30 PM`** | **`"...T14:30:00"`** | **`"...T14:30:00.000Z"`** |  PASS  |
|   H    | postForms     |   `02:30 PM`   | `"...T11:30:00"`     | `"...T11:30:00"`          |  FAIL  |
|   H    | forminstance/ | **`02:30 PM`** | **`"...T14:30:00"`** | `"...T14:30:00"`          |  PASS  |

### Forms V1 Behavior Comparison (IST, UTC+5:30)

| Config | Endpoint      |    Display     | rawValue             | Status |
| :----: | ------------- | :------------: | -------------------- | :----: |
|   C    | postForms     |   `08:00 PM`   | `"...T20:00:00"`     |  FAIL  |
|   C    | forminstance/ | **`02:30 PM`** | **`"...T14:30:00"`** |  PASS  |
|   D    | postForms     |   `02:30 PM`   | `"...T20:00:00"`     |  FAIL  |
|   D    | forminstance/ | **`02:30 PM`** | **`"...T14:30:00"`** |  PASS  |
|   H    | postForms     |   `02:30 PM`   | `"...T20:00:00"`     |  FAIL  |
|   H    | forminstance/ | **`02:30 PM`** | **`"...T14:30:00"`** |  PASS  |

**Pattern**: `forminstance/` records always preserve the original rawValue (`T14:30:00`) regardless of timezone. `postForms` records always shift rawValue by the user's TZ offset.

---

## Steps to Reproduce

### 1. Create records via both endpoints

```javascript
// postForms (core API) — via SDK
const data = { Field5: '2026-03-15T14:30:00' };
const resp = await vvClient.forms.postForms({}, data, TEMPLATE_ID);
// Record created, e.g., DateTest-001583

// forminstance/ (FormsAPI) — direct HTTP
const payload = {
    formTemplateId: '<revision-id>', // NOT the template GUID
    formName: '',
    fields: [{ key: 'Field5', value: '2026-03-15T14:30:00' }],
};
// POST https://preformsapi.visualvault.com/forminstance/
// Record created, e.g., DateTest-001584
```

### 2. Read both via getForms — observe identical values

```javascript
// Both return "2026-03-15T14:30:00Z" — indistinguishable via API
const params = { fields: 'dataField5', q: `instanceName eq 'DateTest-001583'` };
const r1 = await vvClient.forms.getForms(params, TEMPLATE_ID);
// datafield5 = "2026-03-15T14:30:00Z"

const params2 = { fields: 'dataField5', q: `instanceName eq 'DateTest-001584'` };
const r2 = await vvClient.forms.getForms(params2, TEMPLATE_ID);
// datafield5 = "2026-03-15T14:30:00Z"  ← SAME as r1
```

### 3. Open both in Forms browser — observe different behavior

Open each record by DataID URL in Chrome (BRT timezone). Run in DevTools console:

```javascript
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// postForms record:      "2026-03-15T11:30:00"   (shifted -3h)
// forminstance/ record:  "2026-03-15T14:30:00"   (preserved)
```

### Reproduction Records

| Record          | DataID | Endpoint      | Input                   |
| --------------- | ------ | ------------- | ----------------------- |
| DateTest-001583 | —      | postForms     | `"2026-03-15T14:30:00"` |
| DateTest-001584 | —      | forminstance/ | `"2026-03-15T14:30:00"` |

---

## Test Evidence

### WS-10A: Endpoint Comparison (8 postForms + 7 forminstance/ rows)

Run: [`ws-10-batch-run-1.md`](../runs/ws-10-batch-run-1.md) + browser verification — 2026-04-06

| Dimension  |   postForms   | forminstance/ |
| ---------- | :-----------: | :-----------: |
| Total rows |       8       |       7       |
| PASS       | 2 (date-only) |  **7 (all)**  |
| FAIL       | 6 (DateTime)  |     **0**     |

The forminstance/ endpoint achieves **100% PASS rate** across all configs and timezones. The postForms endpoint fails for every DateTime config in every non-UTC timezone.

### WS-10B: Side-by-Side Comparison

Initially BLOCKED in the batch run (`forminstance/` returned 500 on vvdemo). Resolved post-run via browser verification with `verify-ws10-browser.js`.

| Slot         | Config | TZ  | postForms rawValue | forminstance/ rawValue | Match? |
| ------------ | :----: | :-: | ------------------ | ---------------------- | :----: |
| ws-10b-C-BRT |   C    | BRT | `"...T11:30:00"`   | `"...T14:30:00"`       |   No   |
| ws-10b-D-BRT |   D    | BRT | `"...T11:30:00"`   | `"...T14:30:00"`       |   No   |

Both records had identical `getForms` output (`storedMatch=true`), confirming the read path normalization masks the storage difference (CB-30).

### Confirmed Behaviors

| CB    | Description                                                                                                                    | Source |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| CB-29 | `postForms` and `forminstance/` store dates in different physical formats. `FormInstance/Controls` reveals: ISO+Z vs US format | WS-10  |
| CB-30 | Core API read (`getForms`) normalizes both formats to ISO+Z, masking the storage difference                                    | WS-10  |
| CB-31 | `forminstance/` records are immune to CB-8 — Forms V1 parses US format as local time (no UTC conversion)                       | WS-10  |

---

## Impact Analysis

### Architectural: Two Write Paths, No Contract

The VV platform lacks a unified date storage contract. Two endpoints that create the same type of record (form instances) store dates in incompatible formats. This is not a bug in either endpoint individually — it's a systemic design inconsistency.

The absence of a shared normalization layer means:

- Any new endpoint or code path could introduce yet another storage format
- Format-sensitive consumers (like Forms V1) produce unpredictable results depending on which endpoint created the record
- The platform's behavior depends on implementation details that are invisible to developers

### Read Path Masking: Hidden Divergence

The `getForms` normalization is well-intentioned (consistent API output) but creates a false sense of consistency. Developers testing their scripts via API see identical read-back values for both endpoints. They have no reason to suspect the storage formats differ. The problem only surfaces when a user opens the record in Forms — potentially months after the data was created.

### Workaround Dependency

The Freshdesk #124697 workaround ("use `forminstance/` instead of `postForms`") relies entirely on this inconsistency. If the formats were unified (as a fix would require), the workaround would either:

- Become unnecessary (if unified to a format Forms V1 handles correctly)
- Break (if unified to ISO+Z, the same format that causes the shift)

Any fix must consider customers who have already migrated to `forminstance/` based on this workaround.

### Date-Only Fields: Format Differs but Behavior Matches

For date-only configs, the stored formats still differ:

- postForms: `"2026-03-15T00:00:00Z"` → Forms V1 strips time → `"2026-03-15"` → correct
- forminstance/: `"03/15/2026 14:30:00"` → Forms V1 strips time → `"03/15/2026"` → correct (different rawValue format, same display)

The behavioral divergence only manifests for DateTime configs where the time component matters.

---

## Workarounds

### Use `forminstance/` for DateTime fields viewed in Forms (recommended)

The `forminstance/` endpoint stores dates in US format without Z suffix. Forms V1 parses this as local time — no UTC conversion, no shift.

**Payload format** (different from `postForms`):

```javascript
const payload = {
    formTemplateId: '<revision-id>', // The form template's REVISION ID
    formName: '', // Empty string for auto-generated name
    fields: [
        { key: 'Field5', value: '2026-03-15T14:30:00' },
        { key: 'Field6', value: '2026-03-15T14:30:00' },
    ],
};

// POST to FormsAPI server (different from core API)
// https://preformsapi.visualvault.com/forminstance/
// Content-Type: application/json
// Authorization: Bearer <token>
```

**Key differences from `postForms`**:

| Aspect         | `postForms` (core API)              | `forminstance/` (FormsAPI)                    |
| -------------- | ----------------------------------- | --------------------------------------------- |
| Server         | `vvdemo.visualvault.com`            | `preformsapi.visualvault.com`                 |
| SDK method     | `vvClient.forms.postForms()`        | None — direct HTTP                            |
| Field format   | `{ Field5: "value" }` (flat object) | `[{ key: "Field5", value: "value" }]` (array) |
| Template ID    | Template GUID                       | **Revision ID** (not the same)                |
| Update support | `postFormRevision()`                | **No equivalent**                             |
| Auth           | Same OAuth token                    | Same OAuth token                              |

**Limitations**:

- No SDK method — requires manual HTTP request construction
- No update/revision endpoint — only new record creation
- Requires the form template to be registered in FormsAPI on the target environment
- The revision ID (not template GUID) must be used as `formTemplateId`

### Use `postForms` for API-only workflows

If the DateTime field is only consumed by scripts via `getForms()` and never opened in Forms by a user, `postForms` is safe. The API round-trip is drift-free (CB-9). The format mismatch only matters when the value crosses to the Forms UI.

### Endpoint selection guide

| Use Case                             |    Recommended     | Why                                     |
| ------------------------------------ | :----------------: | --------------------------------------- |
| DateTime fields viewed in Forms      |  `forminstance/`   | Avoids WS-BUG-1 shift                   |
| Date-only fields                     |       Either       | Both produce correct display            |
| DateTime fields consumed only by API |       Either       | No cross-layer issue                    |
| Updating existing records            | `postFormRevision` | `forminstance/` has no revision support |

---

## Proposed Fix

### Option A: Unify storage format (server-side)

Align both endpoints to store dates in the same format. Two sub-choices:

**A1: Unify to US format (no TZ)**:

```
postForms:      "2026-03-15T14:30:00"  → stored as "03/15/2026 14:30:00"
forminstance/:  "2026-03-15T14:30:00"  → stored as "03/15/2026 14:30:00" (no change)
```

Forms V1 parses US format as local time → no shift. This effectively applies the `forminstance/` behavior to `postForms`.

**A2: Unify to ISO without Z**:

```
postForms:      "2026-03-15T14:30:00"  → stored as "2026-03-15T14:30:00" (no Z)
forminstance/:  "2026-03-15T14:30:00"  → stored as "2026-03-15T14:30:00" (changed)
```

Requires Forms V1 to handle Z-less ISO correctly (it currently does — `moment("2026-03-15T14:30:00")` parses as local).

**Pros**: Eliminates format divergence at the source. All downstream consumers see consistent data.
**Cons**: Changes storage format for one endpoint — existing data in the old format remains. Requires Forms V1 to handle both old and new formats during transition.

### Option B: Fix Forms V1 to handle both formats correctly (client-side)

Modify `initCalendarValueV1` / `parseDateString()` to correctly interpret both ISO+Z and US formats without shifting:

```javascript
// CURRENT: strips Z unconditionally, re-parses as local
let stripped = input.replace('Z', '');

// FIXED: detect format and parse appropriately
if (input.match(/^\d{4}-\d{2}-\d{2}T/)) {
    // ISO format — if Z present, it's real UTC; parse as UTC
    result = moment.utc(input);
} else {
    // US format — parse as local (current behavior, correct)
    result = moment(input);
}
```

**Pros**: Fixes both existing and new data. No server changes. No data migration.
**Cons**: Changes `parseDateString()` which runs on every form load for every calendar field. Extensive regression testing required.

### Option C: Both — unify storage + fix Forms (recommended)

1. **Server**: Stop appending Z to `postForms` datetime values (align with forminstance/ behavior)
2. **Forms**: Fix `parseDateString()` to handle both ISO+Z (old data) and US/ISO-no-Z (new data)
3. **Transition**: Old postForms data (with Z) is correctly parsed by fixed Forms code. New data (without Z) is also correct. Both endpoints produce consistent results.

---

## Fix Impact Assessment

### What Changes If Fixed

- `postForms` and `forminstance/` produce identical storage formats → consistent Forms behavior
- WS-BUG-1 (cross-layer shift) is eliminated as a side effect
- The `forminstance/` workaround for Freshdesk #124697 becomes unnecessary
- Developers can choose endpoints based on API preference, not date handling side effects

### Backwards Compatibility Risk

**HIGH**: The database contains records in both formats:

- Records created via `postForms`: ISO+Z format (e.g., `"2026-03-15T14:30:00Z"`)
- Records created via `forminstance/`: US format (e.g., `"03/15/2026 14:30:00"`)
- Records created via Forms UI save: may be in either format depending on how the field was populated

A Forms-side fix (Option B/C) must handle both formats correctly. A server-only fix (Option A) does not help existing ISO+Z records.

### Regression Risk

**MEDIUM**: Server-side format change affects all new `postForms` writes. Client-side `parseDateString()` change affects all form loads. Both paths are high-traffic and require comprehensive testing:

- All 8 field configurations across BRT/IST/UTC
- Records created via both endpoints (old and new format)
- Round-trip integrity (write → read → display → save → read)
- OData query behavior on both formats

### Migration Consideration

Existing `postForms` records with ISO+Z format will continue to exist in the database indefinitely. The Forms-side fix must correctly parse ISO+Z **forever** — even after the server stops producing it — because old records are never automatically reformatted. There is no practical migration path for billions of existing field values.

Customers who migrated from `postForms` to `forminstance/` (per #124697 workaround) will have records in both formats in the same form template. Their queries, reports, and dashboards already deal with this mixed state.
