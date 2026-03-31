# TC-2-G-IST — Config G, Typed Input, IST: local midnight stored correctly; typed vs popup inconsistent (Bug #2)

## Environment Specs

| Parameter               | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST (India Standard Time). No DST (India does not observe DST). |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false`     |
| **Scenario**            | 2026-03-15, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00Z` UTC         |

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
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before continuing.

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
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField14"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                                      | Test Data                                                            | Expected Result                                                        | ✓   |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | --- |
| 1   | Complete setup                                              | See Preconditions P1–P6                                              | All P1–P6 checks pass                                                  | ☐   |
| 2   | Click the input area of the target field (identified in P6) | `<FIELD_NAME>`                                                       | Field receives focus; cursor active in text input                      | ☐   |
| 3   | Select all existing text and type full date-time string     | `03/15/2026 12:00 AM`                                                | Field displays `03/15/2026 12:00 AM`                                   | ☐   |
| 4   | Press Tab to confirm                                        | —                                                                    | Focus moves to next field; target field displays `03/15/2026 12:00 AM` | ☐   |
| 5   | Capture raw stored value                                    | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15T00:00:00"`                                                | ☐   |
| 6   | Capture GetFieldValue output                                | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-15T00:00:00"`                                                | ☐   |
| 7   | Capture isoRef and confirm timezone                         | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active                     | ☐   |

> **Legacy input note**: Config G (`useLegacy=true`, `enableTime=true`) uses a legacy Kendo DateTimePicker that accepts typed input as a plain text string (no segment-by-segment editing). Type the full date-time string `03/15/2026 12:00 AM` in one pass, then Tab to confirm. The Kendo widget parses the string on blur and creates a Date object for local midnight, which then flows through `calChange()` → `getSaveValue()`.

> **Typed vs popup path difference**: The legacy popup (tc-1-G-IST) bypasses `getSaveValue()` and stores the raw `toISOString()` output (`"2026-03-14T18:30:00.000Z"`). Typed input goes through `getSaveValue()` which formats as local time without Z suffix (`"2026-03-15T00:00:00"`). This is Bug #2 — the two input methods produce structurally different stored values for the same intended date.

## Fail Conditions

**FAIL-1 (Bug #2 absent — typed stores same as popup):**
Raw value is `"2026-03-14T18:30:00.000Z"` (UTC datetime with Z suffix) instead of `"2026-03-15T00:00:00"`.

- Interpretation: The typed input path is bypassing `getSaveValue()` and storing raw `toISOString()` — same as the popup path. This would mean Bug #2 is NOT present for legacy DateTime typed input. Compare against tc-1-G-IST (popup) to confirm both paths produce the same result.

**FAIL-2 (UTC-equivalent shift stored):**
Raw value is `"2026-03-14T18:30:00"` (UTC equivalent without Z) instead of `"2026-03-15T00:00:00"`.

- Interpretation: `getSaveValue()` received the Date object's `toISOString()` output (`"2026-03-14T18:30:00.000Z"`) and formatted it without converting back to local time — stripped Z but preserved UTC hours. This would indicate `moment()` parsed the Z-string as UTC and `.format()` output UTC instead of local. Unexpected — `moment()` should convert to local on format.

**FAIL-3 (TZ not IST):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns a value other than `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not `Asia/Calcutta`. BRT would return `"2026-03-15T03:00:00.000Z"`, UTC+0 would return `"2026-03-15T00:00:00.000Z"`. Abort, re-run P1 and P2 in full.

**FAIL-4 (V2 active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 code path is active. This test was written for V1 behavior. Check that the form URL has no `?ObjectID=` parameter and re-verify the account's server flag.

**FAIL-5 (GetFieldValue transforms the value):**
`GetFieldValue` returns a value different from the raw stored value.

- Interpretation: Config G (`useLegacy=true`, `enableTime=true`, `ignoreTimezone=false`) should return the raw value unchanged — `getCalendarFieldValue()` falls through to `return value` when `useLegacy=true`. If a transformation is seen, verify P6 returned a field with `useLegacy=true`.

## Related

| Reference                                               | Location                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Matrix row                                              | `../matrix.md` — row `2-G-IST`                                               |
| Run 1 results                                           | `runs/tc-2-G-IST-run-1.md`                                                   |
| Summary                                                 | `summaries/tc-2-G-IST.md`                                                    |
| Bug #2 (inconsistent popup vs typed handlers)           | `analysis.md` § Bug #2                                                       |
| Bug #4 (legacy save format strips Z)                    | `analysis.md` § Bug #4                                                       |
| Sibling — Config G, popup, IST                          | [`tc-1-G-IST.md`](tc-1-G-IST.md) — FAIL-1 (legacy popup stores UTC datetime) |
| Sibling — Config H, typed, IST (same legacy + ignoreTZ) | `matrix.md` row `2-H-IST` — PENDING                                          |
| Sibling — Config G, typed, BRT                          | `matrix.md` row `2-G-BRT` — PENDING                                          |
| Sibling — Config C, typed, IST (non-legacy equivalent)  | `matrix.md` row `2-C-IST` — PENDING                                          |
| Field config reference                                  | `tasks/date-handling/CLAUDE.md` — Test Form Fields                           |
