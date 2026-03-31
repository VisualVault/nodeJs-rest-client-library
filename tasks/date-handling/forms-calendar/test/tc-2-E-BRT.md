# TC-2-E-BRT — Config E, Typed Input, BRT: legacy typed path stores date-only string; differs from popup (Bug #2 confirmed for useLegacy=true)

## Environment Specs

| Parameter               | Value                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                        |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT (Brasilia Standard Time). No DST active (Brazil abolished DST in 2019).        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                        |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                        |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false`                        |
| **Scenario**            | 2026-03-15, BRT midnight — typed as `03/15/2026` into a plain text input (legacy widget, not masked DatePicker) |

## Preconditions

**P1 — Set system timezone to `America/Sao_Paulo`:**

macOS:

```bash
sudo systemsetup -settimezone America/Sao_Paulo
```

Windows (run as Administrator):

```bat
tzutil /s "E. South America Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "E. South America Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone America/Sao_Paulo
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT-0300
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

## Test Steps

| #   | Action                                          | Test Data                                                                                                         | Expected Result                                                      | ✓   |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --- |
| 1   | Complete setup                                  | See Preconditions P1–P6                                                                                           | All P1–P6 checks pass                                                | ☐   |
| 2   | Click the target field input (identified in P6) | Click center of `<FIELD_NAME>` text input                                                                         | Field receives focus; `document.activeElement.id === '<FIELD_NAME>'` | ☐   |
| 3   | Type the date string                            | `03/15/2026` (type as a single continuous string — legacy fields use a plain text input, not a masked DatePicker) | Field input displays `03/15/2026`                                    | ☐   |
| 4   | Press Tab to confirm                            | `Tab` key                                                                                                         | Focus moves to next field; `<FIELD_NAME>` input retains `03/15/2026` | ☐   |
| 5   | Capture raw stored value                        | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` ``                                              | `"2026-03-15"`                                                       | ☐   |
| 6   | Capture GetFieldValue                           | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                                                                     | `"2026-03-15"`                                                       | ☐   |
| 7   | Capture isoRef and confirm timezone             | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                                                              | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                   | ☐   |

> **Legacy input widget difference**: Config E fields (`useLegacy=true`) render as a plain HTML text input, not the Kendo masked DatePicker used by modern-path configs (A/B/C/D). There are no separate month/day/year segments — type the full `MM/dd/yyyy` string in one pass. The field does not auto-advance between segments. After Tab, the raw stored value will be a date-only string `"2026-03-15"`, not the UTC datetime string `"2026-03-15T03:00:00.000Z"` that the calendar popup stores for the same field (see tc-1-E-BRT.md — Bug #2).

> **Bug #2 cross-reference**: The popup for this same field (Config E, BRT) stores `"2026-03-15T03:00:00.000Z"`. The typed input stores `"2026-03-15"`. These are different formats for the same intended date on the same field — confirmed inconsistency between `calChangeSetValue()` (popup path) and `calChange()` (typed path) for `useLegacy=true`.

## Fail Conditions

**FAIL-1 (TZ not BRT):**
isoRef returns `"2026-03-15T00:00:00.000Z"` (UTC+0) or `"2026-03-14T18:30:00.000Z"` (IST) instead of `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not America/Sao_Paulo. Abort, re-run P1 and P2 in full.

**FAIL-2 (typing not accepted — field stays empty):**
Raw value is `""` after Tab.

- Interpretation: The click did not land on the correct input element. Verify `document.activeElement.id === '<FIELD_NAME>'` before typing. Use the scrollIntoView + focus approach to ensure the correct element is active.

**FAIL-3 (wrong stored format — UTC datetime):**
Raw value is `"2026-03-15T03:00:00.000Z"` — the UTC datetime format from the popup path.

- Interpretation: The typed input triggered the same code path as the calendar popup (calChangeSetValue instead of calChange). This would mean Bug #2 does NOT apply for typed input via this mechanism. Document the actual value — do not modify the input method.

**FAIL-4 (date shifted):**
Raw value contains `"2026-03-14"` or `"2026-03-16"`.

- Interpretation: Bug #7 would not affect BRT (UTC-3) for date-only strings. A shift indicates an unexpected code path or mistyped input. Verify the typed value was `03/15/2026` exactly.

**FAIL-5 (field rejects input — shows invalid or partial value):**
Raw value is `""` but field input shows partial text (e.g., `03/`).

- Interpretation: The form may validate the date string before committing. Ensure the full `03/15/2026` was typed before pressing Tab. The legacy plain text input may have date validation on blur.

## Related

| Reference                                     | Location                                           |
| --------------------------------------------- | -------------------------------------------------- |
| Matrix row                                    | `matrix.md` — row `2-E-BRT`                        |
| Live test session                             | `results.md` § Test 9.2                            |
| Sibling — popup path (Bug #2 counterpart)     | `tc-1-E-BRT.md`                                    |
| Bug #2 (inconsistent popup vs typed handlers) | `analysis.md` § Bug #2                             |
| Bug #7 (SetFieldValue wrong day UTC+)         | `analysis.md` § Bug #7                             |
| Sibling — modern path typed BRT               | `tc-2-A-BRT.md`, `tc-2-B-BRT.md`                   |
| Sibling — legacy typed BRT Config F           | `tc-2-F-BRT.md` (pending)                          |
| Field config reference                        | `tasks/date-handling/CLAUDE.md` § Test Form Fields |
