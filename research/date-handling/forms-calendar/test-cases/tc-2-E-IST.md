# TC-2-E-IST — Config E, Typed Input, IST: -1 day stored (Bug #7); GFV unchanged, legacy date-only format

## Environment Specs

| Parameter               | Value                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                   |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, India Standard Time. No DST.                                   |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                   |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                   |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false`   |
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
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField12"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                          | Test Data                                                                                                         | Expected Result                                                      | ✓   |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --- |
| 1   | Complete setup                                  | See Preconditions P1–P6                                                                                           | All P1–P6 checks pass                                                | ☐   |
| 2   | Click the target field input (identified in P6) | Click center of `<FIELD_NAME>` text input                                                                         | Field receives focus; `document.activeElement.id === '<FIELD_NAME>'` | ☐   |
| 3   | Type the date string                            | `03/15/2026` (type as a single continuous string — legacy fields use a plain text input, not a masked DatePicker) | Field input displays `03/15/2026`                                    | ☐   |
| 4   | Press Tab to confirm                            | `Tab` key                                                                                                         | Focus moves to next field; `<FIELD_NAME>` input retains `03/15/2026` | ☐   |
| 5   | Capture raw stored value                        | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` ``                                              | `"2026-03-15"`                                                       | ☐   |
| 6   | Capture GetFieldValue                           | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                                                                     | `"2026-03-15"`                                                       | ☐   |
| 7   | Capture isoRef and confirm timezone             | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                                                              | `"2026-03-14T18:30:00.000Z"` — confirms IST active                   | ☐   |

> **Legacy input widget difference**: Config E fields (`useLegacy=true`) render as a plain HTML text input, not the Kendo masked DatePicker used by modern-path configs (A/B/C/D). There are no separate month/day/year segments — type the full `MM/dd/yyyy` string in one pass. The field does not auto-advance between segments. After Tab, the change handler commits the value.

> **Bug #2 cross-reference**: The popup for this same field (Config E, IST) stores `"2026-03-14T18:30:00.000Z"` (full UTC datetime via `toISOString()`). The typed input stores `"2026-03-14"` (date-only string). These are different formats for the same intended date — Bug #2 (popup vs typed asymmetry) is confirmed for `useLegacy=true` in IST, with the additional complication that Bug #7 shifts the date by -1 day in both paths.

---

## Fail Conditions

**FAIL-1 (Bug #7 active — -1 day shift):**
Step 5 returns `"2026-03-14"` — stored one day earlier than typed.

- **Interpretation**: The typed date string `03/15/2026` is parsed as local IST midnight via `moment(input).toDate()`. `getSaveValue()` then extracts the UTC date via `toISOString()`, which in IST (UTC+5:30) falls on March 14. The display still shows `03/15/2026` while storage holds `"2026-03-14"`. This is Bug #7 — same root cause as non-legacy configs A/B in IST. Confirms Bug #7 affects the legacy typed input path identically.

**FAIL-2 (isoRef shows non-IST offset):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns any value other than `"2026-03-14T18:30:00.000Z"`.

- **Interpretation**: The browser timezone is not IST (UTC+5:30). The test is running under the wrong timezone. Abort, fix P1/P2, reload the form from the template URL and rerun.

**FAIL-3 (typing not accepted — field stays empty):**
Raw value is `""` after Tab.

- **Interpretation**: The click did not land on the correct input element. Verify `document.activeElement.id === '<FIELD_NAME>'` before typing. Use the scrollIntoView + focus approach to ensure the correct element is active.

**FAIL-4 (GetFieldValue transforms the value):**
`GetFieldValue` returns a value different from the raw stored value (e.g., appends `.000Z` or changes the format).

- **Interpretation**: Config E (`enableTime=false`) is outside the Bug #5 surface. `getCalendarFieldValue()` should return the raw value unchanged for date-only fields. If a transformation is seen, the field's `enableTime` flag may have changed — re-verify P6 returns a field with `enableTime=false`.

**FAIL-5 (wrong stored format — UTC datetime):**
Raw value is `"2026-03-14T18:30:00.000Z"` — the UTC datetime format from the popup path.

- **Interpretation**: The typed input triggered the same code path as the calendar popup (`calChangeSetValue` instead of `calChange`). This would mean Bug #2 does NOT apply for typed input via this mechanism. Document the actual value — do not modify the input method.

---

## Related

| Reference                                | Location                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| Matrix row                               | `../matrix.md` — row `2-E-IST`                                               |
| Run file                                 | `../results.md § Session 2026-03-31 (IST)` — index entry                     |
| Bug #7 analysis                          | `analysis.md` — Bug #7 (Date-only SetFieldValue wrong day in UTC+ timezones) |
| Bug #2 analysis                          | `analysis.md` — Bug #2 (Inconsistent popup vs typed handlers)                |
| Sibling TC — same config, popup, IST     | [`tc-1-E-IST.md`](tc-1-E-IST.md) — FAIL (legacy popup stores UTC datetime)   |
| Sibling TC — same config, typed, BRT     | [`tc-2-E-BRT.md`](tc-2-E-BRT.md) — PASS (no shift in BRT)                    |
| Sibling TC — modern path typed, IST      | [`tc-2-A-IST.md`](tc-2-A-IST.md) — FAIL (Bug #7, -1 day)                     |
| Sibling TC — legacy typed, IST, ignoreTZ | `matrix.md` row `2-F-IST` (pending)                                          |
| Field config reference                   | `research/date-handling/CLAUDE.md` § Test Form Fields                        |
