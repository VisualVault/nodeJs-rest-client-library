# TC-6-D-BRT — Config D, Current Date, BRT: correct Date stored; GFV adds fake Z (-3h shift, Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                   |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST (abolished 2019).                                 |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                   |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                   |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=true`     |
| **Scenario**            | Current Date default — field auto-populates with today's date and time on fresh form load. |

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
// PASS: output contains "GMT-0300"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field** (DevTools console, after form loads):

> Config D with `enableInitialValue=true` uses **DataField18** (Current Date DateTime field, `ignoreTimezone=true`) — verify it exists:

```javascript
VV.Form.VV.FormPartition.getValueObjectValue('DataField18');
// Expected: a non-empty Date object (auto-populated with current date and time)
// If empty or undefined: the field is not configured as Current Date — stop and report
```

## Test Steps

| #   | Action                                      | Test Data                                                                                                              | Expected Result                                                                                | ✓   |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                                                                | All P1–P6 checks pass                                                                          | ☐   |
| 2   | Verify field displays today with time       | Visually inspect the Current Date field (DataField18)                                                                  | Displays today's date with time in BRT (e.g., `04/03/2026 05:10 PM`)                           | ☐   |
| 3   | Capture raw stored value (DevTools console) | `var raw = VV.Form.VV.FormPartition.getValueObjectValue('DataField18'); raw instanceof Date ? raw.toISOString() : raw` | A UTC ISO string — Date object with today's UTC timestamp (e.g., `"2026-04-03T20:10:00.467Z"`) | ☐   |
| 4   | Capture GetFieldValue return (DevTools)     | `var api = VV.Form.GetFieldValue('DataField18'); api instanceof Date ? api.toISOString() : api`                        | Correct: same UTC ISO string as step 3 (raw value unchanged)                                   | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date().toISOString()`                                                                                             | A UTC timestamp — confirms BRT active when compared with local time                            | ☐   |

> **Note:** Config D GFV uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` which converts to local time then adds literal Z. At BRT (UTC-3), this shifts the timestamp by -3 hours. The Expected Result in step 4 shows correct behavior (same as raw); Bug #5 produces a different value documented in FAIL-3.

## Fail Conditions

**FAIL-1 (Displayed date is wrong day):** Step 2 shows a date other than today's BRT date.

- Interpretation: The Current Date initialization is not using `new Date()` as documented. Escalate.

**FAIL-2 (Raw value is not a Date object):** Step 3 returns a string instead of a Date object with time component.

- Interpretation: The Current Date field stores differently from expected. Document the actual format.

**FAIL-3 (Bug #5 — GFV fake Z):** Step 4 returns a value 3 hours earlier than raw (e.g., raw `"...T20:10:00.467Z"`, GFV `"...T17:10:00.467Z"`). The trailing Z is fake — `17:10` is BRT local time, not UTC.

- Interpretation: Bug #5 confirmed on Current Date at form load. Same behavior as 5-D-BRT (preset) and 6-D-IST (current date +5:30h). The init path uses `new Date()` correctly, but GFV corrupts the output. Round-trip drift would be -3h per cycle.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1.

## Related

| Reference                      | Location                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Matrix row                     | `matrix.md` — row `6-D-BRT`                                                            |
| Run file                       | [run-1](../runs/tc-6-D-BRT-run-1.md)                                                   |
| Summary                        | [summary](../summaries/tc-6-D-BRT.md)                                                  |
| Analysis — Bug #5              | `analysis.md` — Bug #5: Fake [Z] in GetFieldValue                                      |
| Analysis — Scenario 6          | `analysis.md` — Scenario 6: New Form with "Current Date" Default                       |
| Sibling: 6-D-IST (FAIL +5:30h) | `summaries/tc-6-D-IST.md` — Config D current date in IST (FAIL — Bug #5, +5:30h shift) |
| Preset comparison: 5-D-BRT     | `summaries/tc-5-D-BRT.md` — Config D preset in BRT (FAIL — Bug #5, -3h shift)          |
| Config C comparison: 6-C-BRT   | `summaries/tc-6-C-BRT.md` — Config C current date in BRT (PASS — no fake Z)            |
| Field config reference         | `matrix.md` — Field Configurations table, Config D                                     |
