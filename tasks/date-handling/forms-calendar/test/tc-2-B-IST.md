# TC-2-B-IST — Config B, Typed Input, IST: -1 day stored same as Config A (Bug #7); GFV unchanged

## Environment Specs

| Parameter               | Value                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                   |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, India Standard Time. No DST.                                   |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                   |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                   |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`   |
| **Scenario**            | 2026-03-15, IST midnight — `2026-03-15T00:00:00 GMT+0530` = `2026-03-14T18:30:00.000Z` UTC |

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
            f.enableTime === false &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField10"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                                                                                          | Test Data                                                            | Expected Result                                                        | ✓   |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                                                                  | See Preconditions P1–P6                                              | All P1–P6 checks pass                                                  | ☐   |
| 2   | Click the input area of the target field (identified in P6) — click to the left of the calendar icon, not on it | `<FIELD_NAME>`                                                       | Field enters segment-edit mode; "month" segment is highlighted         | ☐   |
| 3   | Type month segment                                                                                              | `03`                                                                 | Field displays `03/day/year`; cursor advances to "day" segment         | ☐   |
| 4   | Type day segment                                                                                                | `15`                                                                 | Field displays `03/15/year`; cursor advances to "year" segment         | ☐   |
| 5   | Type year segment                                                                                               | `2026`                                                               | Field displays `03/15/2026`; year segment is highlighted               | ☐   |
| 6   | Press Tab to confirm                                                                                            | —                                                                    | Focus moves to next field; target field displays `03/15/2026`          | ☐   |
| 7   | Capture raw stored value                                                                                        | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-14"` — Bug #7: -1 day shift                                  | ☐   |
| 8   | Capture GetFieldValue output                                                                                    | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-14"` — same as raw; no transformation for date-only Config B | ☐   |
| 9   | Capture isoRef                                                                                                  | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active                     | ☐   |

> **Segment targeting note**: Click the input portion of the field (left side), not the calendar icon (right side). The Kendo DatePicker activates segment-edit mode on the first click. Config B is at row 8 of the form — the last field. If the field shows a full date already (e.g., from a prior interaction), click once to focus, then click again on the month segment to restart entry.
>
> **Display note**: After Tab, the field displays `03/15/2026` — the user-intended date. The Kendo picker renders from its internal Date object (March 15 IST local midnight), not from the stored value. The stored value is `"2026-03-14"` (shifted). The display discrepancy is not visible until form reload.

---

## Fail Conditions

**FAIL-1 (Bug #7 absent — wrong date stored):**
Raw stored value is `"2026-03-15"` instead of `"2026-03-14"`.

- **Interpretation**: `normalizeCalValue()` did not apply a local-midnight conversion, or the conversion happened to land on the correct UTC day. Verify isoRef returns `"2026-03-14T18:30:00.000Z"` to confirm IST is active. If isoRef shows `"2026-03-15T00:00:00.000Z"` instead, the system timezone is UTC+0, not IST — abort and fix P1/P2.

**FAIL-2 (isoRef shows non-IST offset):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns any value other than `"2026-03-14T18:30:00.000Z"`.

- **Interpretation**: The browser timezone is not IST (UTC+5:30). The test is running under the wrong timezone. Abort, fix P1/P2, reload the form from the template URL and rerun.

**FAIL-3 (Config B result differs from Config A — unexpected asymmetry):**
Raw stored value is `"2026-03-13"` (two days earlier) or `"2026-03-15"` (no shift) instead of `"2026-03-14"`.

- **Interpretation**: Config A (2-A-IST, Test 8.1) and Config B should produce identical storage behavior — `ignoreTimezone` has no effect on the date-only save path. If Config B produces a different shift from Config A (both run in IST), the code path for `ignoreTimezone=true` date-only fields differs unexpectedly. Re-run 2-A-IST in the same session to directly compare.

**FAIL-4 (GetFieldValue transforms the value):**
`GetFieldValue` returns a value different from the raw stored value.

- **Interpretation**: Config B (`enableTime=false`) is outside the Bug #5 surface. `getCalendarFieldValue()` should return the raw value unchanged for date-only fields. If a transformation is seen (e.g., appended `.000Z`), verify the field's `enableTime` flag is still `false` — re-check P6 returns a field with `enableTime=false`.

**FAIL-5 (Segment entry did not activate — wrong field targeted):**
After clicking, the field does not enter segment-edit mode (still shows `MM/dd/yyyy` placeholder), or the click activated a different row.

- **Interpretation**: The click may have landed on the calendar icon or in the gap between rows 7 and 8. Config B (DataField10) is the last row in the form. Try clicking further left within the input area (approximately left two-thirds). Confirm via P6 which field name to target.

---

## Related

| Reference                            | Location                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Matrix row                           | `matrix.md` — row `2-B-IST`                                                  |
| Live test evidence                   | `results.md § Test 8.2`                                                      |
| Bug #7 analysis                      | `analysis.md` — Bug #7 (Date-only SetFieldValue wrong day in UTC+ timezones) |
| Sibling TC — same config, popup, IST | [`tc-1-B-IST.md`](tc-1-B-IST.md) — FAIL (Bug #7, -1 day)                     |
| Sibling TC — Config A, typed, IST    | [`tc-2-A-IST.md`](tc-2-A-IST.md) — FAIL (Bug #7, same result)                |
| Sibling TC — same config, typed, BRT | `tc-1-2-typed-input-brt.md` — PASS (no shift)                                |
| Field config reference               | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                     |
