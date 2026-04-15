# TC-6-B-IST — Config B, Current Date, IST: correct date auto-populated; cross-midnight edge demonstrated

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST.                                                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=true` |
| **Scenario**            | Current Date default — field auto-populates with today's date on fresh form load.       |

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

> Config B with `enableInitialValue=true` returns multiple fields. Use **DataField28** (the Current Date field, `ignoreTimezone=true`) — verify it exists:

```javascript
VV.Form.VV.FormPartition.getValueObjectValue('DataField28');
// Expected: a non-empty Date object (auto-populated with current date)
// If empty or undefined: the field is not configured as Current Date — stop and report
```

## Test Steps

| #   | Action                                                  | Test Data                                                                                                                                                                                                 | Expected Result                                                                   | ✓   |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                          | See Preconditions P1–P6                                                                                                                                                                                   | All P1–P6 checks pass                                                             | ☐   |
| 2   | Verify field displays today's IST date                  | Visually inspect the Current Date field (DataField28)                                                                                                                                                     | Displays today's date in `MM/dd/yyyy` format (e.g., `04/04/2026` for April 4 IST) | ☐   |
| 3   | Capture raw stored value (DevTools console)             | `var raw = VV.Form.VV.FormPartition.getValueObjectValue('DataField28'); raw instanceof Date ? raw.toISOString() : raw`                                                                                    | A UTC ISO string with today's UTC date (e.g., `"2026-04-03T20:20:54.094Z"`)       | ☐   |
| 4   | Verify the UTC date matches IST date (DevTools console) | `var raw = VV.Form.VV.FormPartition.getValueObjectValue('DataField28'); var d = raw instanceof Date ? raw : new Date(raw); d.toLocaleDateString('en-US', {month:'2-digit',day:'2-digit',year:'numeric'})` | Today's IST date (e.g., `"04/04/2026"`)                                           | ☐   |
| 5   | Capture GetFieldValue return (DevTools console)         | `var api = VV.Form.GetFieldValue('DataField28'); api instanceof Date ? api.toISOString() : api`                                                                                                           | Same UTC ISO string as step 3 (raw value unchanged)                               | ☐   |
| 6   | Confirm browser timezone (DevTools console)             | `new Date().toISOString()`                                                                                                                                                                                | A UTC timestamp — confirms IST active when compared with local time               | ☐   |

> **Cross-midnight edge case:** If this test runs between 00:00–05:30 IST (= previous day in UTC), the stored UTC date will show the previous calendar day. The test PASSES as long as the displayed date and the IST interpretation of the stored Date match today's IST date.

> **Note:** `ignoreTimezone=true` has no effect on Current Date fields. The initialization uses `new Date()` directly, bypassing all timezone-sensitive parsing. This makes Config B behavior identical to Config A for Current Date.

## Fail Conditions

**FAIL-1 (Displayed date is wrong day):** Step 2 shows a date other than today's IST date.

- Interpretation: The Current Date initialization path is not using `new Date()` as documented. Escalate — the init path may be going through timezone-sensitive parsing.

**FAIL-2 (Raw value is not a Date object):** Step 3 returns a string instead of a Date object with time component.

- Interpretation: The Current Date field stores differently from expected. Document the actual format.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted after the change. Re-do P1 and P2 before proceeding.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1.

## Related

| Reference                  | Location                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Matrix row                 | `matrix.md` — row `6-B-IST`                                                              |
| Run file                   | [run-1](../runs/tc-6-B-IST-run-1.md)                                                     |
| Summary                    | [summary](../summaries/tc-6-B-IST.md)                                                    |
| Analysis — Scenario 6      | `analysis.md` — Scenario 6: New Form with "Current Date" Default (only correct scenario) |
| Sibling: 6-B-BRT           | `summaries/tc-6-B-BRT.md` — Config B current date in BRT (PASS, identical behavior)      |
| Sibling: 6-A-IST           | `summaries/tc-6-A-IST.md` — Config A current date in IST (PASS, identical behavior)      |
| Preset comparison: 5-B-IST | `matrix.md` — row `5-B-IST`                                                              |
| Field config reference     | `matrix.md` — Field Configurations table, Config B                                       |
