# WS-4: postForms vs forminstance/ Storage Format Inconsistency (Design Flaw)

## Classification

| Field                  | Value                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**               | Design Flaw                                                                                                                                   |
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

The VisualVault platform has two independent endpoints for creating form records. Both accept the same datetime input, both return success, and both store **identical SQL `datetime` values** in the database (confirmed via DB dump and SSMS schema inspection, 2026-04-06). However, the FormsAPI's `FormInstance/Controls` endpoint **serializes its HTTP response differently** depending on which write endpoint created the record:

| Endpoint                   | Server                        | Input                   | DB Value (identical)      | `FormInstance/Controls` Response           |
| -------------------------- | ----------------------------- | ----------------------- | ------------------------- | ------------------------------------------ |
| `postForms` (core API)     | `vvdemo.visualvault.com`      | `"2026-03-15T14:30:00"` | `2026-03-15 14:30:00.000` | `"2026-03-15T14:30:00Z"` (ISO 8601 + Z)    |
| `forminstance/` (FormsAPI) | `preformsapi.visualvault.com` | `"2026-03-15T14:30:00"` | `2026-03-15 14:30:00.000` | `"03/15/2026 14:30:00"` (US format, no TZ) |

The core API read path (`getForms`) normalizes both to ISO+Z on read, masking the serialization divergence from API consumers. The difference is only visible through the `FormInstance/Controls` endpoint or — critically — through the Forms UI, which parses the serialized format directly.

Forms V1 (`initCalendarValueV1`) is **format-sensitive**:

- ISO+Z → interpreted as UTC → converted to local time → **shifted** (WS-BUG-1)
- US format (no TZ) → interpreted as local time → **no conversion** → preserved

This is why the Freshdesk #124697 workaround (switching from `postForms` to `forminstance/`) eliminates the datetime shift — it changes the Controls serialization format (not the DB value), which changes how Forms V1 parses the value.

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

Both endpoints store the same SQL Server `datetime` value (`2026-03-15 14:30:00.000`). The core API read path (`getForms`) serializes it as ISO+Z for both:

```
postForms record:      DB = 2026-03-15 14:30:00.000   → getForms returns "2026-03-15T14:30:00Z"
forminstance/ record:  DB = 2026-03-15 14:30:00.000   → getForms returns "2026-03-15T14:30:00Z"
```

Both return identical values. The serialization difference is only visible through `FormInstance/Controls`, which formats the same DB value differently based on creation-path metadata.

### Forms V1 reads via Controls, not the normalized getForms API

When a user opens a form, Forms V1 does NOT go through the `getForms` API. It reads field values via `FormInstance/Controls`, which serializes the same DB `datetime` value differently depending on creation path. The `initCalendarValueV1` function then parses this serialized string format-sensitively:

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

| CB    | Description                                                                                                                                                   | Source          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| CB-29 | `FormInstance/Controls` returns different string formats for the same SQL `datetime` value: ISO+Z (postForms) vs US (forminstance/). DB values are identical. | WS-10 + DB dump |
| CB-30 | Core API read (`getForms`) normalizes both serialization formats to ISO+Z, masking the difference                                                             | WS-10           |
| CB-31 | `forminstance/` records are immune to CB-8 — Forms V1 parses US format as local time (no UTC conversion)                                                      | WS-10           |

---

## Impact Analysis

### Architectural: Two Write Paths, No Contract

The VV platform stores identical `datetime` values in SQL Server regardless of write path — but the `FormInstance/Controls` serialization layer applies different string formats based on hidden creation-path metadata. This is not a bug in either endpoint individually — it's an inconsistency in the serialization layer that sits between the DB and Forms V1.

The absence of consistent serialization means:

- Any new endpoint could introduce yet another serialization format via its own metadata
- Format-sensitive consumers (like Forms V1) produce unpredictable results depending on which endpoint created the record
- The platform's behavior depends on hidden metadata that is invisible to developers and not in the form data table

### Read Path Masking: Hidden Divergence

The `getForms` normalization is well-intentioned (consistent API output) but creates a false sense of consistency. Developers testing their scripts via API see identical read-back values for both endpoints. They have no reason to suspect the Controls serialization differs. The problem only surfaces when a user opens the record in Forms — potentially months after the data was created.

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

The DB values are identical regardless of endpoint. The fix is in the `FormInstance/Controls` serialization layer — see [WS-BUG-1 Proposed Fix](ws-bug-1-cross-layer-shift.md#proposed-fix) for the full recommendation.

**Summary**: Remove the creation-path-dependent serialization logic in Controls. All records should be serialized the same way (US format, no Z) regardless of which endpoint created them. This is a single code path change — no DB migration, no client-side changes, no developer-side changes.

---

## Fix Impact Assessment

### What Changes If Fixed

- Controls serializes all records consistently — no format depends on creation path
- WS-BUG-1 (cross-layer shift) is eliminated as a direct consequence
- The `forminstance/` workaround for Freshdesk #124697 becomes unnecessary
- Developers can choose endpoints based on API preference, not date handling side effects

### Backwards Compatibility Risk

**LOW**: The DB values are not changing — only the Controls serialization. Existing postForms records that have already been opened+saved (shifted values in DB) will continue to display their shifted values. Existing postForms records that have NOT been opened in Forms will now display correctly (no more false Z).

**Risk area**: Applications that read `FormInstance/Controls` directly and parse the ISO+Z format would need to handle the US format. This is uncommon but should be checked.

### Regression Risk

**LOW**: The fix is in the Controls serialization layer only. Testing should verify:

- Forms display is correct for records created by all endpoints
- `getForms` API (separate from Controls) is unaffected
- Dashboard display (server-rendered, not via Controls) is unaffected

### Open Question

The metadata that Controls uses to decide the serialization format is not in the form data table (`dbo.DateTest`). It's likely in VV's internal revision/instance tracking tables. The product team needs to identify where this branching logic lives.
