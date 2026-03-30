# TC-2.1 — Config A, Form Load, BRT: initial values stored as Date objects; GetFieldValue returns Date.toString() (format unpredictable)

## Environment Specs

| Parameter               | Required Value                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                                                                                                                         |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (Brazil abolished DST in April 2019).                                                                                                                            |
| **Platform**            | VisualVault FormViewer, Build `20260304.1`                                                                                                                                                                       |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                                                                                                                         |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=true`                                                                                                                         |
| **Scenario**            | Preset: `2026-03-01`, BRT midnight — `2026-03-01T00:00:00-0300` = `2026-03-01T03:00:00Z` UTC. Current Date: varies per run — observed `2026-03-30T16:38:58-0300` = `2026-03-30T19:38:58Z` UTC on 2026-03-30 run. |

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

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate target fields by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === true
    )
    .map((f) => f.name);
// Expected: ["DataField1", "DataField2", "DataField3", "DataField4"]
// P6 returns 4 fields. DataField1/DataField3 are "Current Date" defaults.
// DataField2/DataField4 are "Preset 3/1/2026" defaults.
// Use DataField1 as <FIELD_NAME> reference for single-field snippets.
// All four are captured in Test Steps.
```

> P6 returns more than one field. This test intentionally captures all four. The four fields share the same config but differ by initial value type (Current Date vs Preset). If P6 returns no fields, the test form does not support this configuration — stop and report.

## Test Steps

| #   | Action                                                              | Test Data                                                                                                                                                                                 | Expected Result                                                                                                                                                   | ✓   |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                                                                                                                                                   | All P1–P6 checks pass                                                                                                                                             | ☐   |
| 2   | Observe form after template URL loads                               | —                                                                                                                                                                                         | Tab title changes from `"Viewer"` to `"DateTest-XXXXXX"`; `"Unsaved / Changes: 4"` indicator visible (initial values are pre-loaded as pending changes)           | ☐   |
| 3   | Verify raw value type for all four target fields (identified in P6) | `['DataField1','DataField2','DataField3','DataField4'].map(n => { var r = VV.Form.VV.FormPartition.getValueObjectValue(n); return n + ': ' + (r instanceof Date ? 'Date' : typeof r); })` | `["DataField1: Date", "DataField2: Date", "DataField3: Date", "DataField4: Date"]`                                                                                | ☐   |
| 4   | Capture raw ISO — Current Date fields (DataField1, DataField3)      | `['DataField1','DataField3'].map(n => n + ': ' + VV.Form.VV.FormPartition.getValueObjectValue(n).toISOString())`                                                                          | `["DataField1: 2026-03-30T1X:XX:XX.XXXZ", "DataField3: 2026-03-30T1X:XX:XX.XXXZ"]` — ISO date portion must be `2026-03-30`; time portion varies by form-load time | ☐   |
| 5   | Capture raw ISO — Preset Date fields (DataField2, DataField4)       | `['DataField2','DataField4'].map(n => n + ': ' + VV.Form.VV.FormPartition.getValueObjectValue(n).toISOString())`                                                                          | `["DataField2: 2026-03-01T03:00:00.000Z", "DataField4: 2026-03-01T03:00:00.000Z"]`                                                                                | ☐   |
| 6   | Capture GetFieldValue — Current Date field                          | `String(VV.Form.GetFieldValue('DataField1'))`                                                                                                                                             | `"Mon Mar 30 2026 HH:MM:SS GMT-0300 (Brasilia Standard Time)"` — Date.toString() format; not ISO; date portion must be `Mon Mar 30 2026`; time varies per run     | ☐   |
| 7   | Capture GetFieldValue — Preset Date field                           | `String(VV.Form.GetFieldValue('DataField2'))`                                                                                                                                             | `"Sun Mar 01 2026 00:00:00 GMT-0300 (Brasilia Standard Time)"`                                                                                                    | ☐   |
| 8   | Verify display values                                               | Screenshot                                                                                                                                                                                | First field (Current Date): `03/30/2026`; second field (Preset): `03/01/2026`; third (Current Date): `03/30/2026`; fourth (Preset): `03/01/2026`                  | ☐   |
| 9   | Confirm BRT timezone active                                         | `new Date(2026, 2, 30, 0, 0, 0).toISOString()`                                                                                                                                            | `"2026-03-30T03:00:00.000Z"` — confirms BRT active                                                                                                                | ☐   |

> Steps 4 and 6 document Current Date fields whose exact timestamp varies per run: `new Date()` is called at form-load time. Verify the **date portion** (`2026-03-30`) matches the date the test is run in BRT — do not fail on the time portion.

> `String()` is required around `GetFieldValue()` in steps 6–7 because `getCalendarFieldValue()` returns the raw Date object unchanged for `enableTime=false` fields. Without `String()`, DevTools renders it as a Date object rather than showing the `.toString()` output.

## Fail Conditions

**FAIL-1 (raw value is not a Date object):**
Step 3 returns any type other than `"Date"` for one or more fields (e.g., `"string"` or `"object"` via `[object Object]`).

- Interpretation: The initial value mechanism changed. Fields now store strings instead of Date objects on fresh form load. GetFieldValue behavior (steps 6–7) and downstream behavior (post-save reload) would also change. Cross-reference against `initCalendarValueV1()` (~line 102886 in main.js) to check what the init path now stores.

**FAIL-2 (GetFieldValue returns ISO string instead of Date.toString() — unlabeled behavioral finding):**
Steps 6 or 7 return a value in ISO format (e.g., `"2026-03-30"` or `"2026-03-30T00:00:00.000Z"`) instead of the `Date.toString()` pattern `"DDD MMM DD YYYY HH:MM:SS GMT±HHMM (Zone Name)"`.

- Interpretation: `getCalendarFieldValue()` (~line 104114 in main.js) changed its return path for `enableTime=false` fields when the raw value is a Date object. In V1, this path returns the raw value unchanged — which coerces to `.toString()` when passed through `String()`. A change here would affect every developer using `GetFieldValue()` on initial-value date fields before save.

**FAIL-3 (Preset date shows wrong day for UTC+ users — Bug #1 latent risk):**
After saving and reopening this form from a UTC+ timezone, the Preset date fields display the wrong day (one day early — e.g., `02/28/2026` instead of `03/01/2026`).

- Interpretation: Not triggered by this test (fresh load only). Bug #1 manifests at reload: `parseDateString()` (~line 104126) strips the Z from `"2026-03-01T03:00:00.000Z"`, re-parses as local midnight, then `getSaveValue()` extracts the UTC date. For UTC+ users, local midnight of `T03:00:00` is the previous UTC day. This test documents the stored value before the save/reload cycle — a future TC should cover the reload path.

**FAIL-4 (TZ environment check):**
Step 9 returns anything other than `"2026-03-30T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT (UTC-3). Re-check P1 and restart Chrome (P2). If the offset shows UTC+, the preset field raw ISO (`2026-03-01T03:00:00.000Z`) will resolve to a different local day on display — the test becomes invalid until the environment is corrected.

## Related

| Reference                                | Location                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| Source test block                        | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.1 (~line 109) |
| Bug analysis — Scenario 5 (Preset Date)  | `tasks/date-handling/forms-calendar/analysis.md` — Scenario 5 (~line 162)   |
| Bug analysis — Scenario 6 (Current Date) | `tasks/date-handling/forms-calendar/analysis.md` — Scenario 6 (~line 183)   |
| Bug #1 — parseDateString Z stripping     | `tasks/date-handling/forms-calendar/analysis.md` — Bug #1                   |
| Bug #4 — getSaveValue Z stripping        | `tasks/date-handling/forms-calendar/analysis.md` — Bug #4                   |
| Field config reference                   | `tasks/date-handling/CLAUDE.md` — Test Form Fields table (~line 205)        |
| TC-1.1 — Config A, Calendar Popup, BRT   | `tasks/date-handling/forms-calendar/test/tc-1-1-calendar-popup-brt.md`      |
| TC-1.2 — Config A, Typed Input, BRT      | `tasks/date-handling/forms-calendar/test/tc-1-2-typed-input-brt.md`         |
| TC-1.3 — Config A, Round-Trip, BRT       | `tasks/date-handling/forms-calendar/test/tc-1-3-roundtrip-brt.md`           |
