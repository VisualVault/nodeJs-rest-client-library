# TC-2-D-IST — Config D, Typed Input, IST: local midnight stored (same as C-IST); GFV appends fake Z (Bug #5)

## Environment Specs

| Parameter               | Value                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, India Standard Time. No DST.                                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | 2026-03-15, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00.000Z` UTC |

---

## Preconditions

**P1 — Set system timezone to `Asia/Calcutta`:**

macOS:

```bash
sudo systemsetup -settimezone Asia/Calcutta
```

Windows (run as Administrator):

```bat
tzutil /s "India Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "India Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone Asia/Calcutta
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT+0530"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before proceeding.

**P5 — Verify code path** (DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField5"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                                                                                          | Test Data                                                            | Expected Result                                                                  | ✓   |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                                                                  | See Preconditions P1–P6                                              | All P1–P6 checks pass                                                            | ☐   |
| 2   | Click the input area of the target field (identified in P6) — click to the left of the calendar icon, not on it | `<FIELD_NAME>`                                                       | Field enters segment-edit mode; "month" segment is highlighted                   | ☐   |
| 3   | Type month segment                                                                                              | `03`                                                                 | Field displays `03/dd/yyyy hh:mm a`; cursor advances to "day" segment            | ☐   |
| 4   | Type day segment                                                                                                | `15`                                                                 | Field displays `03/15/yyyy hh:mm a`; cursor advances to "year" segment           | ☐   |
| 5   | Type year segment                                                                                               | `2026`                                                               | Field displays `03/15/2026 hh:mm a`; cursor advances to "hour" segment           | ☐   |
| 6   | Type hour segment                                                                                               | `12`                                                                 | Field displays `03/15/2026 12:mm AM`; cursor advances to "minute" segment        | ☐   |
| 7   | Type minute segment                                                                                             | `00`                                                                 | Field displays `03/15/2026 12:00 AM`; cursor advances to "AM/PM" segment         | ☐   |
| 8   | Type AM/PM segment                                                                                              | `A`                                                                  | Field displays `03/15/2026 12:00 AM`; AM/PM segment shows AM                     | ☐   |
| 9   | Press Tab to confirm                                                                                            | —                                                                    | Focus moves to next field; target field displays `03/15/2026 12:00 AM`           | ☐   |
| 10  | Capture raw stored value                                                                                        | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15T00:00:00"` — local midnight stored, same as Config C                | ☐   |
| 11  | Capture GetFieldValue output                                                                                    | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-15T00:00:00"` — raw stored value returned unchanged (correct behavior) | ☐   |
| 12  | Capture timezone reference                                                                                      | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active                               | ☐   |

> **Segment targeting note**: Click the input portion of the field (left side), not the calendar icon (right side). The Kendo DateTimePicker activates segment-edit mode on the first click. Each segment auto-advances after a complete value is typed.

---

## Fail Conditions

**FAIL-1 (Bug #5 — fake Z appended to GetFieldValue):**
Step 11: `GetFieldValue()` returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`. The `.000Z` suffix is added by `getCalendarFieldValue()` when `enableTime=true && ignoreTimezone=true && !useLegacy`.

- Interpretation: Bug #5 confirmed. The fake Z makes the local midnight value look like a UTC timestamp. In IST (UTC+5:30), a `SetFieldValue(GetFieldValue())` round-trip would shift the date forward by +5:30h per trip (the system re-parses `"2026-03-15T00:00:00.000Z"` as UTC midnight, converts to IST = 5:30 AM Mar 15, then stores the local time). After ~4.4 trips the date rolls over to the next day. Expected Result in Step 11 shows the correct (no-bug) value; this FAIL condition documents the buggy observed value.

**FAIL-2 (Wrong storage format — UTC offset stored instead of local midnight):**
Raw stored value is `"2026-03-14T18:30:00"` (the UTC equivalent of IST midnight).

- Interpretation: `getSaveValue()` behavior changed — it is now stripping Z from `toISOString()` output instead of formatting local time. Verify the VV build number matches 20260304.1 and compare with Config C-IST behavior (2-C-IST stores `"2026-03-15T00:00:00"` — if that changed too, it's a systematic change).

**FAIL-3 (Wrong time selected — time other than midnight stored):**
Raw stored value is `"2026-03-15T<HH:mm:ss>"` where `HH:mm:ss` ≠ `00:00:00`.

- Interpretation: A segment was typed incorrectly (wrong hour or minute), or the AM/PM segment was set to PM. Re-focus the field, verify each segment value, and ensure the display reads `03/15/2026 12:00 AM` before pressing Tab.

**FAIL-4 (Timezone environment invalid):**
Step 12 returns `"2026-03-15T00:00:00.000Z"` (UTC midnight, no IST offset).

- Interpretation: Test ran under UTC, not IST. Steps 10/11 may appear correct but represent the wrong timezone context. Abort, fix Preconditions P1–P2, and re-run.

**FAIL-5 (Bug #6 — GetFieldValue returns "Invalid Date" for empty field):**
Before typing any value, `GetFieldValue()` returns the string `"Invalid Date"` (truthy) instead of `""`.

- Interpretation: Bug #6 confirmed. `getCalendarFieldValue()` attempts to format an empty/null value and produces `"Invalid Date"`. This is a separate bug from Bug #5 — it affects empty Config D fields. It does not block this test (the test sets a value before reading GFV), but note its presence.

---

## Related

| Reference                            | Location                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Matrix row                           | `../matrix.md` — row `2-D-IST`                                                                   |
| Run file                             | `results.md` § Session 2026-03-31 (IST) index entry                                              |
| Summary                              | [`summaries/tc-2-D-IST.md`](summaries/tc-2-D-IST.md)                                             |
| Bug #5 analysis                      | `analysis.md` — Bug #5 (Inconsistent Developer API — fake Z in getCalendarFieldValue)            |
| Bug #6 analysis                      | `analysis.md` — Bug #6 (GetFieldValue returns "Invalid Date" for empty Config D)                 |
| Sibling TC — same config, popup, IST | [`tc-1-D-IST.md`](tc-1-D-IST.md) — FAIL (Bug #5, same storage `"2026-03-15T00:00:00"`)           |
| Sibling TC — same config, typed, BRT | `matrix.md` row `2-D-BRT` — PASS (`"2026-03-15T00:00:00"`, fake Z coincidentally correct in BRT) |
| Sibling TC — Config C, typed, IST    | [`tc-2-C-IST.md`](tc-2-C-IST.md) — PASS (same storage, no fake Z — `ignoreTimezone=false`)       |
| Field config reference               | `research/date-handling/CLAUDE.md` — Test Form Fields table, Config D                            |
