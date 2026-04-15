# TC-2-H-IST — Config H, Typed Input, IST: local midnight stored correctly; GFV same (no fake Z); Bug #2 format diff vs popup

## Environment Specs

| Parameter               | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST (India Standard Time). No DST (India does not observe DST). |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                    |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`      |
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
            f.ignoreTimezone === true &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField13"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                          | Test Data                                                            | Expected Result                                    | ✓   |
| --- | ----------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                                  | See Preconditions P1–P6                                              | All P1–P6 checks pass                              | ☐   |
| 2   | Click the target field input (identified in P6) | `<FIELD_NAME>` input (placeholder `MM/dd/yyyy hh:mm a`)              | Field gains focus; cursor active in input          | ☐   |
| 3   | Type the date and time value                    | Type `03/15/2026 12:00 AM`                                           | Field displays `03/15/2026 12:00 AM`               | ☐   |
| 4   | Press Tab to confirm entry                      | `Tab` key                                                            | Focus moves to next field; value committed         | ☐   |
| 5   | Capture raw stored value                        | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15T00:00:00"`                            | ☐   |
| 6   | Capture GetFieldValue                           | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-15T00:00:00"`                            | ☐   |
| 7   | Capture isoRef and confirm timezone             | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> Config H is a legacy field (`useLegacy=true`) with a plain textbox input. Unlike non-legacy Kendo spinbutton fields, there is no segment-by-segment entry — type the full date string in one pass and Tab to confirm.

> Bug #2 (inconsistent handlers) is confirmed by comparing this result with tc-1-H-IST: popup stored `"2026-03-14T18:30:00.000Z"` (raw UTC with Z) while typed input stores `"2026-03-15T00:00:00"` (local midnight without Z). Same logical date, completely different format. This typed result is the correct format; the popup result is the buggy one.

## Fail Conditions

**FAIL-1 (UTC-equivalent stored instead of local midnight):**
Raw value is `"2026-03-14T18:30:00"` (UTC equivalent of IST midnight, without Z) instead of `"2026-03-15T00:00:00"`.

- Interpretation: The typed path is stripping Z from `toISOString()` but keeping the UTC time components, rather than formatting as local time. This would mean `getSaveValue()` treats the ISO string as a raw string (strip Z) rather than extracting local-time components. Compare with tc-2-G-IST (Config G, same but `ignoreTimezone=false`) to determine whether `ignoreTimezone` affects the typed path for legacy fields. Recovery: document exact value and compare with non-legacy sibling tc-2-D-IST.

**FAIL-2 (Raw UTC datetime with Z — popup format):**
Raw value is `"2026-03-14T18:30:00.000Z"` (identical to popup result from tc-1-H-IST).

- Interpretation: The typed path is bypassing `getSaveValue()` and storing raw `toISOString()`, same as the popup path. This would mean Bug #2 is NOT present for Config H — both paths store identically. Compare with tc-2-E-IST (legacy date-only typed stored `"2026-03-14"`, different from popup `"2026-03-14T18:30:00.000Z"`) to understand why DateTime legacy differs.

**FAIL-3 (TZ not IST):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns a value other than `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not `Asia/Calcutta`. Abort, re-run P1 and P2 in full.

**FAIL-4 (V2 active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 code path is active. This test was written for V1 behavior. Check that the form URL has no `?ObjectID=` parameter and re-verify the account's server flag.

**FAIL-5 (Empty or invalid value):**
Raw value is `""`, `null`, `"Invalid Date"`, or `undefined`.

- Interpretation: The typed value was not accepted by the field. Verify the input format matches `MM/dd/yyyy hh:mm a` and that the Tab key was pressed to commit. Clear the field and retry from step 2.

## Related

| Reference                                        | Location                                              |
| ------------------------------------------------ | ----------------------------------------------------- |
| Matrix row                                       | `../matrix.md` — row `2-H-IST`                        |
| Run 1 results                                    | `runs/tc-2-H-IST-run-1.md`                            |
| Summary                                          | `summaries/tc-2-H-IST.md`                             |
| Bug #2 (inconsistent popup vs typed handlers)    | `analysis.md` § Bug #2                                |
| Bug #4 (legacy save format strips Z)             | `analysis.md` § Bug #4                                |
| Sibling — Config H, BRT (typed)                  | `tc-2-H-BRT.md` (PENDING)                             |
| Sibling — Config H, IST (popup)                  | `tc-1-H-IST.md`                                       |
| Sibling — Config G, IST (typed, ignoreTZ=false)  | `tc-2-G-IST.md` (PENDING)                             |
| Sibling — Config E, IST (legacy date-only typed) | `tc-2-E-IST.md`                                       |
| Field config reference                           | `research/date-handling/CLAUDE.md` § Test Form Fields |
