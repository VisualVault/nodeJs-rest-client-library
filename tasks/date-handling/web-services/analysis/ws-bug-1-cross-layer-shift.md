# WS-BUG-1: Cross-Layer Datetime Shift (postForms Z Suffix)

## Classification

| Field                  | Value                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**           | HIGH                                                                                                                            |
| **Evidence**           | `[LIVE]` — Confirmed via WS-4 and WS-10 browser verification in BRT and IST                                                     |
| **Component**          | VV Server (core API) + FormViewer (V1 init path)                                                                                |
| **Code Path**          | `postForms()` → DB stores correct value → `FormInstance/Controls` serializes with Z → `initCalendarValueV1()` interprets as UTC |
| **Affected Configs**   | C, D, G, H (all DateTime configs). Date-only A, B, E, F are immune (CB-10).                                                     |
| **Affected TZs**       | All non-UTC timezones. Shift magnitude = TZ offset.                                                                             |
| **Affected Scenarios** | Any script creating/updating DateTime fields via `postForms` where users view records in Forms                                  |
| **Related Bugs**       | Root cause: WS-4 (endpoint serialization inconsistency). Amplified by Forms Bug #5 (fake Z on GFV for Config D).                |
| **Freshdesk**          | #124697 / WADNR-10407                                                                                                           |

---

## Summary

When a datetime value is written via `postForms()` — for example `"2026-03-15T14:30:00"` — the database stores the correct value: `2026-03-15 14:30:00.000` (SQL Server `datetime`, no timezone). The value is identical to what `forminstance/` or the Forms UI would store for the same input.

The problem occurs when a user opens the record in the Forms UI. The `FormInstance/Controls` endpoint — which Forms V1 uses to read field values — serializes the value as `"2026-03-15T14:30:00Z"` (with Z suffix) for records created by `postForms`, but as `"03/15/2026 2:30:00 PM"` (US format, no Z) for records created by `forminstance/`. The Z is incorrect — the DB column is timezone-unaware — but Forms V1 takes it literally, interprets the value as UTC, and converts to the user's local time. The rawValue is permanently shifted by the user's timezone offset. If the user saves the form, the shifted value overwrites the original in the database.

This is the most impactful web services date handling defect. It affects **every production script** that writes datetime values via `postForms` where any user outside UTC+0 subsequently opens the record in Forms. The field's client-side configuration (`ignoreTZ`, `enableTime`, `useLegacy`) has no effect — the bug is in the server's serialization layer, not in field settings. It is the confirmed root cause of Freshdesk #124697 (WADNR-10407).

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

### Component 1: `FormInstance/Controls` serializes postForms-created records with Z

The database stores all date fields as SQL Server `datetime` columns — a binary numeric type with no timezone concept. Both `postForms` and `forminstance/` write **identical `datetime` values** for the same input (confirmed via DB dump: DateTest-001679 = DateTest-001680 = `2026-03-15 14:30:00.000`).

However, the `FormInstance/Controls` endpoint (which Forms V1 uses to read field values) **serializes the same `datetime` value differently** depending on which endpoint created the record:

```
DB value:                     2026-03-15 14:30:00.000    (identical for both)
Controls for postForms:       "2026-03-15T14:30:00Z"     (ISO+Z — triggers shift)
Controls for forminstance/:   "03/15/2026 14:30:00"      (US format — no shift)
```

**How does Controls know which endpoint created the record?** The form data table (`dbo.DateTest`) contains no flag or column that distinguishes records by creation endpoint — a column-by-column comparison of postForms vs forminstance/ records shows identical metadata (same user, same field values — only DhDocID/DhID/timestamps differ). The serialization decision must be based on **hidden metadata in VV's internal system tables** (revision history, form instance tracking, or similar) that are not part of the form data table. We have not identified the specific table or flag — this is an open question for the product team.

This serialization difference is confirmed across all 8 field configurations (CB-6). The `getForms` API normalizes both to ISO+Z, masking the difference.

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
Script sends:             "2026-03-15T14:30:00"            (intended as local/agnostic)
     ↓ postForms
DB stores:                2026-03-15 14:30:00.000          (SQL datetime — no Z, no format)
     ↓ FormInstance/Controls serialization
Controls returns:         "2026-03-15T14:30:00Z"           (ISO+Z — serialization artifact)
     ↓ Forms V1 initCalendarValueV1
V1 interprets Z as UTC:   new Date("...T14:30:00Z")        → UTC 14:30 = BRT 11:30
     ↓ getSaveValue()
rawValue (BRT):           "2026-03-15T11:30:00"            (shifted -3h)
rawValue (IST):           "2026-03-15T20:00:00"            (shifted +5:30h)
     ↓ user saves form
DB permanently stores:    2026-03-15 11:30:00.000          (shifted — original 14:30 lost)
```

**DB dump evidence**: DateTest-001613 (postForms, never opened) = `14:30:00.000`. DateTest-001737 (postForms → Forms save BRT) = `11:30:00.000`. The shift is real in the database.

````

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
````

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
- Root cause difference: `FormInstance/Controls` serializes postForms records as ISO+Z, forminstance/ records as US format (CB-29). DB values are identical.

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

| CB    | Description                                                                                                                     | Source          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| CB-8  | API Z normalization causes cross-layer datetime shift on Forms load                                                             | WS-4, WS-10     |
| CB-10 | Bug #7 does NOT manifest on Forms load path for date-only — immune to this bug                                                  | WS-4            |
| CB-11 | `ignoreTZ=true` preserves display but not rawValue for API-stored datetimes                                                     | WS-4            |
| CB-29 | `FormInstance/Controls` serializes the same `datetime` value differently by write path: ISO+Z (postForms) vs US (forminstance/) | WS-10 + DB dump |
| CB-31 | `forminstance/` records are immune — V1 parses US format as local time                                                          | WS-10           |
| CB-32 | Config D first-open mutation exactly matches Freshdesk #124697                                                                  | WS-10           |

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
- **CSV/bulk imports**: Data migrated via `postForms` will have correct API read-back (`getForms` normalizes both serialization formats — CB-30), but silently corrupted when viewed or edited in Forms.
- **Audit trail**: The form revision history will show the shift as a user edit, even though the user did not change the value.

---

## Workarounds

### Empirical finding: `ignoreTZ` does NOT affect storage

Testing confirmed that `getSaveValue()` produces **identical DB values** for Config C (`ignoreTZ=false`) and Config D (`ignoreTZ=true`) given the same input. The `ignoreTZ` flag affects **display only**, not what's written to the database.

| Write Path                                | Config C stored | Config D stored | Identical? |
| ----------------------------------------- | :-------------: | :-------------: | :--------: |
| `postForms` (never opened in Forms)       |  `T14:30:00Z`   |  `T14:30:00Z`   |    Yes     |
| `forminstance/` (never opened in Forms)   |  `T14:30:00Z`   |  `T14:30:00Z`   |    Yes     |
| Forms UI (`SetFieldValue` + save, BRT)    |  `T14:30:00Z`   |  `T14:30:00Z`   |    Yes     |
| `postForms` → opened in Forms BRT → saved |  `T11:30:00Z`   |  `T11:30:00Z`   |    Yes     |

Verified 2026-04-06: records DateTest-001737 (postForms→Forms save), DateTest-001679/1680 (WS-10), DateTest-001740/1748 (Forms UI).

### Workaround 1: Use `forminstance/` endpoint (recommended for all DateTime configs)

The `forminstance/` endpoint stores datetime values in US format without Z suffix (`"03/15/2026 14:30:00"`). Forms V1 parses US format as local time — no UTC conversion, no shift. This works for **both** `ignoreTZ=true` and `ignoreTZ=false` fields because the DB stores the same value regardless of the flag.

```javascript
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

**Query consistency note**: `forminstance/` stores the input value as-is (local time without TZ context). This is consistent with how the Forms UI itself saves records. Records created via `forminstance/` and records created via the Forms UI will have identical storage for the same input — queries work consistently across both.

**Cross-TZ caveat**: Since `forminstance/` stores local time without TZ context, two users in different timezones entering "2:30 PM" both store `T14:30:00`. This is the same behavior as Forms-native saves — the VV platform does not store timezone context for any write path through `forminstance/`.

### Workaround 2: Date-only fields are immune

Config A, B, E, F (`enableTime=false`) all display correctly in every timezone (CB-10). No workaround needed.

### Workaround 3: API-only consumption

If the datetime field is only read by scripts via `getForms()` (never opened in Forms by a human), no corruption occurs. The API round-trip is drift-free (CB-9). The shift only manifests when the value crosses from API to Forms UI.

---

## Proposed Fix

### Recommended: Fix `FormInstance/Controls` serialization (server-side)

The root cause is that `FormInstance/Controls` serializes the same SQL Server `datetime` value differently based on which endpoint created the record. The Z it adds to postForms records is incorrect — the DB column is `datetime` (timezone-unaware), so no value in it is "UTC." The fix:

**Remove the creation-path-dependent serialization logic in Controls.** All records should be serialized the same way, regardless of whether they were created by `postForms`, `forminstance/`, or the Forms UI.

```
Current (broken):
  postForms record:     Controls returns "2026-03-15T14:30:00Z"     (Z added — incorrect)
  forminstance/ record: Controls returns "03/15/2026 2:30:00 PM"    (no Z — correct)

Fixed:
  ANY record:           Controls returns "03/15/2026 2:30:00 PM"    (no Z — consistent)
```

**Why this is the right fix:**

- The Z is a lie — the DB `datetime` column has no timezone context
- forminstance/ serialization (US format, no Z) is already correct and consistent with Forms UI saves
- One change in one code path fixes all existing and future records
- No client-side changes needed — Forms V1 already handles US format correctly
- No developer-side changes needed — scripts don't need to add offsets

**What needs to happen:**

1. Identify the metadata or code path that Controls uses to decide the serialization format (not in the `dbo.DateTest` table — likely in VV's internal revision/instance tracking tables)
2. Remove or bypass that branching logic
3. Apply consistent serialization (US format, no Z) for all records

### Alternative: Fix Forms V1 client-side (defensive)

If the Controls serialization cannot be changed, Forms V1 could be modified to not treat Z as a real UTC indicator when the source is a `datetime` column:

```javascript
// Current V1: treats Z as UTC, converts to local
new Date("2026-03-15T14:30:00Z")  → UTC 14:30 → local 11:30 BRT (wrong)

// Fixed V1: strip Z before parsing (treat all values as local)
let value = input.replace("Z", "");
new Date(value)  → local 14:30 BRT (correct)
```

This is a defensive fix — it works, but it papers over the inconsistent serialization rather than fixing it. It also changes behavior for every calendar field on every form load, requiring extensive regression testing.

### NOT recommended: requiring developers to send TZ offsets

Requiring scripts to always include offsets (e.g., `"T14:30:00-03:00"`) puts the burden on developers to work around a platform bug. It also doesn't help with the Freshdesk #124697 scenario (existing records already stored without offsets).

---

## Fix Impact Assessment

### What Changes If Fixed (Controls serialization fix)

- All records display consistently in Forms regardless of creation endpoint
- Freshdesk #124697 behavior eliminated
- The `forminstance/` workaround becomes unnecessary
- No developer-side changes needed — existing scripts work as-is

### Backwards Compatibility Risk

**LOW for Controls fix**: Existing postForms records currently have their `datetime` value serialized as ISO+Z by Controls. After the fix, they would be serialized as US format. Forms V1 would parse them as local time instead of UTC — which means existing shifted-then-saved records (like DateTest-001737 with `11:30:00` in the DB) would display as `11:30 AM` in both the old and new behavior. Records that have NOT been opened+saved yet (DB still has the original value) would now display correctly.

**Risk area**: Applications that read `FormInstance/Controls` directly (not through Forms V1) and parse the ISO+Z format would need to handle the US format instead. This is an uncommon pattern but should be checked.

### Regression Risk

**LOW**: The fix is in the Controls serialization layer, not in Forms V1 or the DB. The change affects how a `datetime` value is formatted as a string — not the value itself. Testing should verify:

- Forms display is correct for records created by all endpoints
- `getForms` API (separate from Controls) is unaffected
- Dashboard display (uses server-rendered format, not Controls) is unaffected

### Migration Consideration

No data migration needed. The DB values are correct — only the serialization was wrong. After the fix, all existing records display correctly without any data changes.
