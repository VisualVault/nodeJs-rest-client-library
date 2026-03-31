# TC-2-F-IST — Config F, Typed Input, IST: -1 day stored same as E-IST (Bug #7); GFV unchanged, differs from popup format (Bug #2)

## Environment Specs

| Parameter               | Value                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                   |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, India Standard Time. No DST.                                   |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                   |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                   |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`    |
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
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField11"]
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

> **Legacy input widget difference**: Config F fields (`useLegacy=true`) render as a plain HTML text input, not the Kendo masked DatePicker used by modern-path configs (A/B/C/D). There are no separate month/day/year segments — type the full `MM/dd/yyyy` string in one pass. The field does not auto-advance between segments. After Tab, the raw stored value will be a date-only string `"2026-03-14"` (Bug #7), not the UTC datetime string `"2026-03-14T18:30:00.000Z"` that the calendar popup stores for the same field (see tc-1-F-IST.md — Bug #2).

> **Bug #2 cross-reference**: The popup for this same field (Config F, IST) stores `"2026-03-14T18:30:00.000Z"` (raw `toISOString()`). The typed input stores `"2026-03-14"` (through `getSaveValue()`). These are different formats for the same intended date on the same field — confirmed inconsistency between `calChangeSetValue()` (popup path) and `calChange()` (typed path) for `useLegacy=true`.

---

## Fail Conditions

**FAIL-1 (Bug #7 active — -1 day shift):**
Step 5 returns `"2026-03-14"` — stored one day earlier than typed.

- Interpretation: The typed date string was parsed to a `Date` at local IST midnight (2026-03-15T00:00:00 GMT+0530 = 2026-03-14T18:30:00Z). `calChange()` called `toISOString()` → `"2026-03-14T18:30:00.000Z"`. `getSaveValue(enableTime=false)` stripped everything after `T` → `"2026-03-14"`. Display still shows `03/15/2026` while storage holds `"2026-03-14"`. This is Bug #7.

**FAIL-2 (isoRef shows non-IST offset):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns any value other than `"2026-03-14T18:30:00.000Z"`.

- Interpretation: The browser timezone is not IST (UTC+5:30). The test is running under the wrong timezone. Abort, fix P1/P2, reload the form from the template URL and rerun.

**FAIL-3 (Bug #2 — typed and popup produce different formats):**
Raw stored value from typed input is `"2026-03-14"` (date-only string), while the popup test (1-F-IST) produces `"2026-03-14T18:30:00.000Z"` (UTC datetime string). Both represent the same shifted date but in different storage formats.

- Interpretation: Bug #2 is confirmed for `useLegacy=true` in IST. The popup handler (`calChangeSetValue`) stores raw `toISOString()` directly (with Z and time), while the typed handler (`calChange`) routes through `getSaveValue()` which strips to date-only for `enableTime=false`. This format inconsistency means the same field stores data differently depending on input method. On reload, the popup-stored value (`"2026-03-14T18:30:00.000Z"`) will be re-parsed differently from the typed-stored value (`"2026-03-14"`).

**FAIL-4 (typing not accepted — field stays empty):**
Raw value is `""` after Tab.

- Interpretation: The click did not land on the correct input element. Verify `document.activeElement.id === '<FIELD_NAME>'` before typing. Use the scrollIntoView + focus approach to ensure the correct element is active.

**FAIL-5 (GetFieldValue transforms the value):**
`GetFieldValue` returns a value different from the raw stored value (e.g., appends `.000Z` or changes the format).

- Interpretation: Config F (`enableTime=false`) is outside the Bug #5 surface. `getCalendarFieldValue()` should return the raw value unchanged for date-only fields. If a transformation is seen, the field's `enableTime` flag may have changed — re-verify P6 returns a field with `enableTime=false`.

---

## Related

| Reference                                  | Location                                           |
| ------------------------------------------ | -------------------------------------------------- |
| Matrix row                                 | `../matrix.md` — row `2-F-IST`                     |
| Run file                                   | `runs/tc-2-F-IST-run-1.md`                         |
| Summary                                    | `summaries/tc-2-F-IST.md`                          |
| Bug #7 analysis                            | `analysis.md` § Bug #7                             |
| Bug #2 analysis                            | `analysis.md` § Bug #2                             |
| Sibling — popup path (Bug #2 counterpart)  | [`tc-1-F-IST.md`](tc-1-F-IST.md)                   |
| Sibling — same config, typed, BRT          | `matrix.md` row `2-F-BRT` (pending)                |
| Sibling — modern path typed IST (Config A) | [`tc-2-A-IST.md`](tc-2-A-IST.md) — FAIL (Bug #7)   |
| Sibling — modern path typed IST (Config B) | [`tc-2-B-IST.md`](tc-2-B-IST.md) — FAIL (Bug #7)   |
| Sibling — legacy typed BRT (Config E)      | [`tc-2-E-BRT.md`](tc-2-E-BRT.md) — PASS            |
| Sibling — legacy typed IST (Config E)      | `matrix.md` row `2-E-IST` (pending)                |
| Field config reference                     | `tasks/date-handling/CLAUDE.md` § Test Form Fields |
