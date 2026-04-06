# WS-BUG-1: Cross-Layer Datetime Shift (postForms Z Suffix)

## Classification

| Field                  | Value                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**           | HIGH                                                                                                                                                                  |
| **Evidence**           | `[LIVE]` — Confirmed via WS-4 and WS-10 browser verification in BRT and IST                                                                                           |
| **Component**          | VV Server (core API) + FormViewer (V1 init path)                                                                                                                      |
| **Code Path**          | `postForms()` → server appends Z → `initCalendarValueV1()` interprets as UTC                                                                                          |
| **Affected Configs**   | C, D, G, H (all DateTime configs). Date-only A, B, E, F are immune (CB-10).                                                                                           |
| **Affected TZs**       | All non-UTC timezones. Shift magnitude = TZ offset.                                                                                                                   |
| **Affected Scenarios** | Any script creating/updating DateTime fields via `postForms` where users view records in Forms                                                                        |
| **Related Bugs**       | Root cause: WS-BUG-4 (endpoint format mismatch). Amplified by Forms Bug #5 (fake Z on GFV for Config D). Upstream: Forms Bug #1 (Z stripping in `parseDateString()`). |
| **Freshdesk**          | #124697 / WADNR-10407                                                                                                                                                 |

---

## Summary

When a datetime value is written via `postForms()` — for example `"2026-03-15T14:30:00"` — the VV server appends a Z suffix to the stored value: `"2026-03-15T14:30:00Z"`. The developer intended the time as local or timezone-agnostic, but the Z marks it as UTC.

When a user opens this record in the Forms UI, the V1 calendar init code (`initCalendarValueV1`) reads the Z suffix, interprets the value as real UTC, and converts it to the user's local time. The rawValue stored in the form component is permanently shifted by the user's timezone offset. If the user saves the form, the shifted value is committed to the database, permanently corrupting the original time.

This is the most impactful web services date handling defect. It affects **every production script** that writes datetime values via `postForms` where any user outside UTC+0 subsequently opens the record in Forms. It is the confirmed root cause of Freshdesk #124697 (WADNR-10407).

---

## Who Is Affected

- **Every VV customer** using `postForms` (or `postFormRevision`) to write datetime fields (`enableTime=true`) that are later viewed in the Forms UI
- **Users outside UTC+0** see the shift. The magnitude is their TZ offset:
    - BRT (UTC-3): time shifts back 3 hours
    - IST (UTC+5:30): time shifts forward 5.5 hours
    - PST (UTC-8): time shifts back 8 hours
    - UTC+0: no visible shift (coincidental correctness)
- **Freshdesk #124697** (WA DNR, John Sevilla) independently confirmed this defect in production with hundreds of thousands of records migrated via `postForms`
- **Date-only fields are immune** — Config A (date-only) displays correctly in all timezones (CB-10). Only DateTime configs (C, D, G, H) are affected.

---

## Root Cause

This is a **two-component chain**. Neither component is independently wrong — the defect emerges from their interaction.

### Component 1: Server appends Z to offset-less datetime strings

When `postForms()` receives a datetime string without a timezone indicator (e.g., `"2026-03-15T14:30:00"`), the VV server normalizes it by appending Z:

```
Input:   "2026-03-15T14:30:00"     (no timezone — ambiguous)
Stored:  "2026-03-15T14:30:00Z"    (server assumes UTC)
```

This normalization is confirmed across all 8 field configurations — the server ignores `enableTime`, `ignoreTimezone`, and `useLegacy` flags entirely (CB-6). It is also timezone-independent: BRT, IST, and UTC server environments all produce identical stored values (CB-4).

### Component 2: Forms V1 interprets Z as real UTC and converts to local

When a user opens the record in the Forms UI, `initCalendarValueV1()` (line ~102886 in `main.js`) processes the stored value through `parseDateString()` (line ~104126):

```javascript
// parseDateString() — CalendarValueService
let stripped = input.replace('Z', ''); // Strips Z suffix

if (ignoreTimezone) {
    result = moment(stripped); // Parses as LOCAL time
} else {
    result = moment(stripped).tz('UTC', true).local(); // Re-labels as UTC, converts to local
}
```

**For `ignoreTimezone=false` (Config C, G)**:
The `.tz("UTC", true).local()` chain re-labels the Z-stripped value as UTC and converts to local time. The display shows the local equivalent:

- `14:30 UTC` → `11:30 BRT` (display and rawValue both shifted)

**For `ignoreTimezone=true` (Config D, H)**:
The `moment(stripped)` call parses as local time. The Kendo picker's `ignoreTimezone` flag prevents display conversion, so the **display appears correct** (shows 2:30 PM). But `getSaveValue()` internally stores the local→UTC converted time in rawValue:

- rawValue = `"2026-03-15T11:30:00"` (BRT) — shifted, but invisible until save+reopen

### The Chain

```
Script sends:           "2026-03-15T14:30:00"          (intended as local/agnostic)
     ↓ postForms
Server stores:          "2026-03-15T14:30:00Z"          (Z appended — now marked UTC)
     ↓ getForms → Forms V1
parseDateString():      strips Z → "2026-03-15T14:30:00" → parses as local
     ↓ getSaveValue()
rawValue (BRT):         "2026-03-15T11:30:00"            (shifted -3h)
rawValue (IST):         "2026-03-15T20:00:00"            (shifted +5:30h)
     ↓ user saves form
DB permanently stores:  shifted value (original lost)
```

---

## Expected vs Actual Behavior

### Standard DateTime (Config C, `ignoreTZ=false`)

| Input Sent              | TZ  | API Stored        | Expected Display | Actual Display | Expected rawValue | Actual rawValue  |   Shift    |
| ----------------------- | :-: | ----------------- | ---------------- | -------------- | ----------------- | ---------------- | :--------: |
| `"2026-03-15T14:30:00"` | BRT | `"...T14:30:00Z"` | `02:30 PM`       | `11:30 AM`     | `"...T14:30:00"`  | `"...T11:30:00"` |  **-3h**   |
| `"2026-03-15T14:30:00"` | IST | `"...T14:30:00Z"` | `02:30 PM`       | `08:00 PM`     | `"...T14:30:00"`  | `"...T20:00:00"` | **+5:30h** |

### ignoreTZ DateTime (Config D, `ignoreTZ=true`) — Freshdesk #124697 scenario

| Input Sent              | TZ  | API Stored        | Display (1st open) | Display (after save) | rawValue (all opens) |   Shift    |
| ----------------------- | :-: | ----------------- | :----------------: | :------------------: | -------------------- | :--------: |
| `"2026-03-15T14:30:00"` | BRT | `"...T14:30:00Z"` |     `02:30 PM`     |    **`11:30 AM`**    | `"...T11:30:00"`     |  **-3h**   |
| `"2026-03-15T14:30:00"` | IST | `"...T14:30:00Z"` |     `02:30 PM`     |    **`08:00 PM`**    | `"...T20:00:00"`     | **+5:30h** |

### Midnight-Crossing Variant (Config D, early-morning UTC times)

| Input Sent              | TZ  | API Stored        | Display              | rawValue                |  Date Crossed?   |
| ----------------------- | :-: | ----------------- | -------------------- | ----------------------- | :--------------: |
| `"2026-03-15T02:00:00"` | BRT | `"...T02:00:00Z"` | `02:00 AM` (correct) | `"2026-03-14T23:00:00"` | **Yes — Mar 14** |
| `"2026-03-15T02:00:00"` | IST | `"...T02:00:00Z"` | `02:00 AM` (correct) | `"2026-03-15T07:30:00"` |  No — same day   |

The midnight-crossing case is critical for CSV/data imports: any datetime between `T00:00:00Z` and `T02:59:59Z` will display correctly in BRT but store the **previous calendar day**. The import looks correct in Forms, but the underlying stored date is wrong.

### Date-Only (Config A) — Immune

| Input Sent     | TZ  | API Stored        | Display      | rawValue       | Status |
| -------------- | :-: | ----------------- | ------------ | -------------- | :----: |
| `"2026-03-15"` | BRT | `"...T00:00:00Z"` | `03/15/2026` | `"2026-03-15"` |  PASS  |
| `"2026-03-15"` | IST | `"...T00:00:00Z"` | `03/15/2026` | `"2026-03-15"` |  PASS  |

---

## Steps to Reproduce

### Via Direct Runner (API-only — confirms server Z normalization)

```bash
# 1. Create a record with a DateTime value
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-1 --configs D --input-date "2026-03-15T14:30:00"

# 2. Note the record name from output (e.g., DateTest-001566)

# 3. Read back and confirm Z appended
node tasks/date-handling/web-services/run-ws-test.js \
  --action WS-2 --configs D --record-id DateTest-001566
# → datafield5 = "2026-03-15T14:30:00Z"
```

### Via Browser (confirms cross-layer shift)

1. Open the created record by DataID in Chrome (BRT timezone)
2. Open DevTools console
3. Run: `VV.Form.VV.FormPartition.getValueObjectValue('Field5')`
    - Expected: `"2026-03-15T14:30:00"` — Actual: `"2026-03-15T11:30:00"` (shifted -3h)
4. Run: `VV.Form.GetFieldValue('Field5')`
    - Returns: `"2026-03-15T11:30:00.000Z"` (shifted + fake Z from Bug #5)
5. Save the form and reopen
    - Display changes from `02:30 PM` → `11:30 AM` (shifted value now in DB)

### Reproduction Records

| Record          | DataID                                 | Created By | Input                   | Purpose                   |
| --------------- | -------------------------------------- | ---------- | ----------------------- | ------------------------- |
| DateTest-000931 | —                                      | WS-4 run   | `"2026-03-15T14:30:00"` | Configs C, D, H           |
| DateTest-001566 | `9b940223-b431-f111-ba23-0e3ceb11fc25` | WS-10 run  | `"2026-03-15T14:30:00"` | Configs A, C, D, H        |
| DateTest-001568 | `735ca12d-b431-f111-ba23-0e3ceb11fc25` | WS-10 run  | `"2026-03-15T14:30:00"` | Save-and-stabilize (C, D) |

---

## Test Evidence

### WS-4: API→Forms Cross-Layer (8 tests, 2 PASS / 6 FAIL)

Run: [`ws-4-batch-run-1.md`](../runs/ws-4-batch-run-1.md) — 2026-04-02, BRT+IST

| Slot       | Config | TZ  | Status | Notes                                         |
| ---------- | :----: | :-: | :----: | --------------------------------------------- |
| ws-4-A-BRT |   A    | BRT |  PASS  | Date-only immune                              |
| ws-4-A-IST |   A    | IST |  PASS  | Date-only immune                              |
| ws-4-C-BRT |   C    | BRT |  FAIL  | Display: 11:30 AM (shifted -3h)               |
| ws-4-C-IST |   C    | IST |  FAIL  | Display: 8:00 PM (shifted +5:30h)             |
| ws-4-D-BRT |   D    | BRT |  FAIL  | Display: 2:30 PM (correct), rawValue: shifted |
| ws-4-D-IST |   D    | IST |  FAIL  | Display: 2:30 PM (correct), rawValue: shifted |
| ws-4-H-BRT |   H    | BRT |  FAIL  | Legacy — same as D minus fake Z               |
| ws-4-H-IST |   H    | IST |  FAIL  | Legacy — same as D minus fake Z               |

### WS-10A: postForms vs forminstance/ (8 postForms + 7 forminstance/ comparison rows)

Run: [`ws-10-batch-run-1.md`](../runs/ws-10-batch-run-1.md) + browser verification — 2026-04-06

- **postForms**: 2 PASS (date-only), 6 FAIL (DateTime) — identical to WS-4 findings
- **forminstance/**: 7 PASS, 0 FAIL — **zero shift** for any config/TZ combination
- Root cause difference: postForms stores ISO+Z, forminstance/ stores US format (CB-29)

### WS-10C: Save-and-Stabilize (2 tests, 0 PASS / 2 FAIL)

| Slot         | Config | Snap 1 Display | Snap 2 Display | rawValue (all)   |        Matches #124697?        |
| ------------ | :----: | :------------: | :------------: | ---------------- | :----------------------------: |
| ws-10c-C-BRT |   C    |    11:30 AM    |    11:30 AM    | `"...T11:30:00"` | No (shift visible immediately) |
| ws-10c-D-BRT |   D    |  **02:30 PM**  |  **11:30 AM**  | `"...T11:30:00"` |     **Yes — exact match**      |

### Midnight-Crossing Variant

Run: [`cat10-gaps-run-1.md`](../runs/cat10-gaps-run-1.md) — Test 3

| Slot           | TZ  | Display            | rawValue                | Date Crossed? |
| -------------- | :-: | ------------------ | ----------------------- | :-----------: |
| ws-4-D-mid-BRT | BRT | 02:00 AM (correct) | `"2026-03-14T23:00:00"` |    **Yes**    |
| ws-4-D-mid-IST | IST | 02:00 AM (correct) | `"2026-03-15T07:30:00"` |      No       |

### Confirmed Behaviors

| CB    | Description                                                                                   | Source      |
| ----- | --------------------------------------------------------------------------------------------- | ----------- |
| CB-8  | API Z normalization causes cross-layer datetime shift on Forms load                           | WS-4, WS-10 |
| CB-10 | Bug #7 does NOT manifest on Forms load path for date-only — immune to this bug                | WS-4        |
| CB-11 | `ignoreTZ=true` preserves display but not rawValue for API-stored datetimes                   | WS-4        |
| CB-29 | `postForms` and `forminstance/` store different physical formats for identical logical values | WS-10       |
| CB-31 | `forminstance/` records are immune — V1 parses US format as local time                        | WS-10       |
| CB-32 | Config D first-open mutation exactly matches Freshdesk #124697                                | WS-10       |

---

## Impact Analysis

### Data Integrity

- **Permanent corruption on first save**: The rawValue is shifted on form load. If the user saves (even without editing the date field), the shifted value replaces the original in the database. The original time is lost.
- **Shift magnitude is proportional to TZ offset**: BRT = -3h, IST = +5:30h, PST = -8h, JST = +9h. Larger offsets cause larger shifts.
- **Midnight crossing**: For early-morning UTC times (`T00:00:00Z` through `T02:59:59Z` in BRT, wider windows in larger offsets), the rawValue shifts to the **previous calendar day**. The date itself changes, not just the time.
- **One-time corruption, then stable**: After the first save+reopen cycle, the shifted value is the new DB value. Subsequent opens and saves do not drift further (CB-32 confirms stability).

### User-Visible Impact by Config

| Config | `ignoreTZ` | 1st Open Display  | After Save Display | User Experience                                                          |
| :----: | :--------: | :---------------: | :----------------: | ------------------------------------------------------------------------ |
|   C    |   false    |   Shifted time    | Same shifted time  | User sees wrong time immediately — may notice                            |
|   D    |    true    | **Original time** |  **Shifted time**  | User sees correct time, saves, then it changes — **confusing** (#124697) |
|   G    |   false    |   Shifted time    | Same shifted time  | Legacy — same as C                                                       |
|   H    |    true    | **Original time** |  **Shifted time**  | Legacy — same as D (minus fake Z on GFV)                                 |

Config D is the most dangerous: the user sees the correct time on first open, trusts it, saves, and only discovers the mutation when they reopen. This is exactly what Freshdesk #124697 describes.

### Downstream Effects

- **Forms Bug #5 compounds the issue** for Config D: `GetFieldValue()` appends a fake Z to the already-shifted local time, creating a value like `"2026-03-15T11:30:00.000Z"` — doubly wrong (shifted time marked as UTC). Any script that round-trips via `SetFieldValue(GetFieldValue())` will drift further.
- **CSV/bulk imports**: Data migrated via `postForms` will have correct API read-back (`getForms` normalizes both storage formats — CB-30), but silently corrupted when viewed or edited in Forms.
- **Audit trail**: The form revision history will show the shift as a user edit, even though the user did not change the value.

---

## Workarounds

### Workaround 1: Use `forminstance/` endpoint (recommended)

The `forminstance/` endpoint (FormsAPI at `preformsapi.visualvault.com`) stores datetime values in US format without Z suffix. Forms V1 parses US format as local time — no UTC conversion occurs, no shift.

**Payload format** (different from `postForms`):

```javascript
// postForms payload (core API):
const data = { Field5: '2026-03-15T14:30:00' };
await vvClient.forms.postForms(params, data, templateId);

// forminstance/ payload (FormsAPI — direct HTTP):
const payload = {
    formTemplateId: '<revision-id>', // NOT the template GUID — the revision ID
    formName: '',
    fields: [{ key: 'Field5', value: '2026-03-15T14:30:00' }],
};
// POST to https://preformsapi.visualvault.com/forminstance/
```

**Limitations**:

- No SDK method — requires direct HTTP call to a different server
- No equivalent for `postFormRevision` (updates) — only new record creation
- Requires FormsAPI registration for the form template on the target environment

### Workaround 2: Date-only fields are immune

If the field is date-only (`enableTime=false`), no workaround is needed. Config A, B, E, F all display correctly in every timezone (CB-10).

### Workaround 3: API-only consumption

If the datetime field is only read by scripts via `getForms()` (never opened in Forms by a human), no corruption occurs. The API round-trip is drift-free (CB-9). The issue only manifests when the value crosses from API to Forms UI.

### Workaround 4: Send pre-shifted values (fragile)

If you know the user's timezone, you can pre-shift the value to compensate:

```javascript
// For BRT user (UTC-3): send UTC equivalent so Forms shift produces local time
// Intended local time: 14:30 BRT
// Send: 14:30 + 3h = 17:30 UTC
const data = { Field5: '2026-03-15T17:30:00' };
// Server stores: "2026-03-15T17:30:00Z"
// Forms converts: 17:30 UTC → 14:30 BRT ← correct display
```

**Not recommended** — fragile, requires knowing the user's timezone at write time, breaks for users in other timezones, and breaks if the bug is ever fixed.

---

## Proposed Fix

### Option A: Fix Forms V1 `initCalendarValueV1` (client-side)

Modify `parseDateString()` to preserve the Z suffix and parse the string as-is, rather than stripping Z and re-interpreting:

```javascript
// CURRENT (broken):
let stripped = input.replace('Z', '');
result = moment(stripped); // Parses as local — wrong

// FIXED:
if (input.endsWith('Z') || input.includes('+') || input.includes('-', 11)) {
    // Has timezone info — parse as-is
    result = moment(input); // Moment handles Z and offsets correctly
} else {
    // No timezone — treat as local (backwards compatible)
    result = moment(input);
}
```

**Pros**: Fixes the issue for all existing data. No server changes needed.
**Cons**: Changes behavior for every calendar field on form load. Requires extensive regression testing.

### Option B: Fix server normalization (server-side)

Stop appending Z to offset-less datetime strings. Store them without timezone indicator:

```
Current:  "2026-03-15T14:30:00"  →  stored as "2026-03-15T14:30:00Z"
Fixed:    "2026-03-15T14:30:00"  →  stored as "2026-03-15T14:30:00"
```

**Pros**: The source of the problem. All downstream consumers see the value as intended.
**Cons**: Changes storage format for all new records. Existing Z-suffixed records remain shifted. May affect other consumers that expect Z.

### Option C: Both (recommended)

1. Fix the server to not append Z to ambiguous inputs (or use the FormsAPI storage format consistently)
2. Fix `parseDateString()` to handle both Z and Z-less values correctly
3. Existing data with Z is correctly parsed by the fixed Forms code
4. New data without Z is also correctly parsed

### V2 Code Path Status

The V2 code path (`initCalendarValueV2`, gated by `useUpdatedCalendarValueLogic`) uses `parseDateString()` with a `.tz("UTC", true).local()` recovery for `ignoreTimezone=false`. This partially addresses the issue for non-ignoreTZ configs but does not fix the `ignoreTimezone=true` path (Config D/H — the Freshdesk scenario).

---

## Fix Impact Assessment

### What Changes If Fixed

- DateTime values written via `postForms` display correctly in Forms regardless of user timezone
- Freshdesk #124697 behavior eliminated
- The `forminstance/` workaround becomes unnecessary (though still functional)
- Config D/H users no longer experience the "time changes after save" pattern

### Backwards Compatibility Risk

**HIGH**: Existing records in the database have the Z suffix. If only the server is fixed (Option B), old records still have Z and will still shift. If only Forms is fixed (Option A), new and old records display correctly. Option C handles both.

Additionally, some applications may have implemented compensating logic (pre-shifting values, post-read adjustments). A fix could cause these workarounds to double-correct.

### Regression Risk

- `parseDateString()` is called on **every form load** for **every calendar field**. A change here affects all forms across the platform.
- Must be tested across all 8 configurations × multiple timezones × all code paths (saved data, preset, URL parameter, SetFieldValue)
- Must verify that the `ignoreTimezone=false` branch still produces correct display for Config C/G

### Migration Consideration

For large-scale customers (like WA DNR with Freshdesk #124697), existing records written via `postForms` have Z-suffixed values that were correct at write time but display incorrectly. A Forms-side fix (Option A/C) would retroactively fix these records without data migration. A server-only fix (Option B) would not help existing records.
