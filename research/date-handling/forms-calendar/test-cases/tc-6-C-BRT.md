# TC-6-C-BRT — Config C, Current Date, BRT: DateTime auto-populated with UTC timestamp; GFV returns real UTC ISO

## Environment Specs

| Parameter               | Required Value                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                   |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST (abolished 2019).                                 |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                   |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                   |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=true`    |
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

> Config C with `enableInitialValue=true` uses **DataField17** (Current Date DateTime field, `ignoreTimezone=false`) — verify it exists:

```javascript
VV.Form.VV.FormPartition.getValueObjectValue('DataField17');
// Expected: a non-empty Date object (auto-populated with current date and time)
// If empty or undefined: the field is not configured as Current Date — stop and report
```

## Test Steps

| #   | Action                                      | Test Data                                                                                                              | Expected Result                                                                                  | ✓   |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                                                                | All P1–P6 checks pass                                                                            | ☐   |
| 2   | Verify field displays today with time       | Visually inspect the Current Date field (DataField17)                                                                  | Displays today's date with time in `MM/dd/yyyy hh:mm AM/PM` format (e.g., `04/03/2026 05:10 PM`) | ☐   |
| 3   | Capture raw stored value (DevTools console) | `var raw = VV.Form.VV.FormPartition.getValueObjectValue('DataField17'); raw instanceof Date ? raw.toISOString() : raw` | A UTC ISO string — Date object with today's UTC timestamp (e.g., `"2026-04-03T20:10:00.466Z"`)   | ☐   |
| 4   | Capture GetFieldValue return (DevTools)     | `var api = VV.Form.GetFieldValue('DataField17'); api instanceof Date ? api.toISOString() : api`                        | Same UTC ISO string as step 3 — Config C GFV uses `new Date(value).toISOString()` = real UTC ISO | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date().toISOString()`                                                                                             | A UTC timestamp — confirms BRT active when compared with local time                              | ☐   |

> **Note:** Config C DateTime Current Date stores a genuine UTC timestamp via `new Date()`. GFV returns the same real UTC ISO because `ignoreTimezone=false` avoids the fake Z path in `getCalendarFieldValue()`. Compare with Config D (6-D-BRT) where Bug #5 corrupts GFV output.

## Fail Conditions

**FAIL-1 (Displayed date is wrong day):** Step 2 shows a date other than today's BRT date.

- Interpretation: The Current Date initialization is not using `new Date()` as documented. Escalate.

**FAIL-2 (Raw value is not a Date object):** Step 3 returns a string instead of a Date object with time component.

- Interpretation: The Current Date field stores differently from expected. Document the actual format.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted. Re-do P1 and P2.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1.

**FAIL-5 (GFV does not match raw):** Step 4 returns a different value than step 3.

- Interpretation: Config C GFV is transforming the value unexpectedly. For Config C (`ignoreTimezone=false`), GFV should return the same real UTC ISO as the raw stored Date. Any discrepancy indicates an unexpected code path.

## Related

| Reference                  | Location                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Matrix row                 | `matrix.md` — row `6-C-BRT`                                                              |
| Run file                   | [run-1](../runs/tc-6-C-BRT-run-1.md)                                                     |
| Summary                    | [summary](../summaries/tc-6-C-BRT.md)                                                    |
| Analysis — Scenario 6      | `analysis.md` — Scenario 6: New Form with "Current Date" Default (only correct scenario) |
| Sibling: 6-C-IST           | `matrix.md` — row `6-C-IST` (PENDING)                                                    |
| Bug #5 comparison: 6-D-BRT | `summaries/tc-6-D-BRT.md` — Config D current date in BRT (FAIL — Bug #5)                 |
| Preset comparison: 5-C-BRT | `summaries/tc-5-C-BRT.md` — Config C preset in BRT (PASS)                                |
| Field config reference     | `matrix.md` — Field Configurations table, Config C                                       |
