# TC-6-A-UTC0 — Config A, Current Date, UTC0: correct date auto-populated; local=UTC so all conversions trivially correct

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Etc/GMT` — UTC+0. No DST.                                                               |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=true` |
| **Scenario**            | Current Date default — field auto-populates with today's date on fresh form load.        |

## Preconditions

**P1 — Set system timezone to `Etc/GMT`:**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

Windows (run as Administrator):

```bat
tzutil /s "UTC"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "UTC"
```

Linux:

```bash
sudo timedatectl set-timezone Etc/GMT
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT+0000"
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

> Config A with `enableInitialValue=true` returns multiple fields (DataField1 = Current Date, DataField2 = Preset, DataField3/4 = duplicates). Use **DataField1** (the Current Date field) — verify it exists:

```javascript
VV.Form.VV.FormPartition.getValueObjectValue('DataField1');
// Expected: a non-empty Date object (auto-populated with current date)
// If empty or undefined: the field is not configured as Current Date — stop and report
```

## Test Steps

| #   | Action                                                    | Test Data                                                                                                                                                                                                | Expected Result                                                                   | ✓   |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                            | See Preconditions P1–P6                                                                                                                                                                                  | All P1–P6 checks pass                                                             | ☐   |
| 2   | Verify field displays today's UTC date                    | Visually inspect the Current Date field (DataField1)                                                                                                                                                     | Displays today's date in `MM/dd/yyyy` format (e.g., `04/03/2026` for April 3 UTC) | ☐   |
| 3   | Capture raw stored value (DevTools console)               | `var raw = VV.Form.VV.FormPartition.getValueObjectValue('DataField1'); raw instanceof Date ? raw.toISOString() : raw`                                                                                    | A UTC ISO string with today's date (e.g., `"2026-04-03T20:10:55.302Z"`)           | ☐   |
| 4   | Verify the UTC date matches local date (DevTools console) | `var raw = VV.Form.VV.FormPartition.getValueObjectValue('DataField1'); var d = raw instanceof Date ? raw : new Date(raw); d.toLocaleDateString('en-US', {month:'2-digit',day:'2-digit',year:'numeric'})` | Today's UTC date (always matches local at UTC+0) (e.g., `"04/03/2026"`)           | ☐   |
| 5   | Capture GetFieldValue return (DevTools console)           | `var api = VV.Form.GetFieldValue('DataField1'); api instanceof Date ? api.toISOString() : api`                                                                                                           | Same UTC ISO string as step 3 (raw value unchanged)                               | ☐   |
| 6   | Confirm browser timezone (DevTools console)               | `new Date().toISOString()`                                                                                                                                                                               | A UTC timestamp — confirms UTC+0 active                                           | ☐   |

> **Note:** At UTC+0, no cross-midnight edge case exists — local date always equals UTC date. This serves as a control test confirming Config A Current Date works trivially when local = UTC.

## Fail Conditions

**FAIL-1 (Displayed date is wrong day):** Step 2 shows a date other than today's UTC date.

- Interpretation: The Current Date initialization path is not using `new Date()` as documented. Escalate.

**FAIL-2 (Raw value is not a Date object):** Step 3 returns a string instead of a Date object with time component.

- Interpretation: The Current Date field stores differently from expected. Document the actual format.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT+0000`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted. Re-do P1 and P2.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1.

## Related

| Reference                   | Location                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Matrix row                  | `matrix.md` — row `6-A-UTC0`                                                             |
| Run file                    | [run-1](../runs/tc-6-A-UTC0-run-1.md)                                                    |
| Summary                     | [summary](../summaries/tc-6-A-UTC0.md)                                                   |
| Analysis — Scenario 6       | `analysis.md` — Scenario 6: New Form with "Current Date" Default (only correct scenario) |
| Sibling: 6-A-BRT            | `summaries/tc-6-A-BRT.md` — Config A current date in BRT (PASS)                          |
| Sibling: 6-A-IST            | `summaries/tc-6-A-IST.md` — Config A current date in IST (PASS)                          |
| Preset comparison: 5-A-UTC0 | `summaries/tc-5-A-UTC0.md` — Config A preset in UTC0                                     |
| Field config reference      | `matrix.md` — Field Configurations table, Config A                                       |
