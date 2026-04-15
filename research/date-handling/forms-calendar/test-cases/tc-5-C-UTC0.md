# TC-5-C-UTC0 — Config C, Preset Date, UTC0: DateTime preset stores raw Date; GFV returns real UTC ISO (no bugs, TZ-independent)

## Environment Specs

| Parameter               | Required Value                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                |
| **System Timezone**     | `Etc/GMT` — UTC+0, `GMT`. No DST.                                                                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=true`                 |
| **Scenario**            | Preset DateTime `3/31/2026 11:29 AM` UTC — `2026-03-31T11:29:14+00:00` = `2026-03-31T11:29:14.181Z` UTC |

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
// PASS: output contains GMT+0000
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template:**

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path:**

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active
```

**P6 — Locate the target field:**

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === true
    )
    .map((f) => ({ name: f.name, initialDate: f.initialDate }));
// Expected: { name: "Field15", initialDate: "2026-03-31T11:29:14.181Z" }
// Use the field with the fixed historical timestamp, not the current-date field
```

## Test Steps

| #   | Action                         | Test Data                                                      | Expected Result                                                                                  | ✓   |
| --- | ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --- |
| 1   | Complete setup                 | See Preconditions P1–P6                                        | All P1–P6 checks pass; target field identified with `initialDate` = `"2026-03-31T11:29:14.181Z"` | ☐   |
| 2   | Verify display of preset field | Visually inspect the target field (identified in P6)           | `03/31/2026 11:29 AM` (UTC local display of the preset DateTime)                                 | ☐   |
| 3   | Capture raw stored value       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | Date object — `.toISOString()` = `"2026-03-31T11:29:14.181Z"`                                    | ☐   |
| 4   | Capture GFV                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-31T11:29:14.181Z"` (real UTC ISO — Config C uses `new Date(value).toISOString()`)      | ☐   |
| 5   | Verify UTC0 timezone active    | `new Date(2026, 2, 31, 0, 0, 0).toISOString()`                 | `"2026-03-31T00:00:00.000Z"` — confirms UTC0 active                                              | ☐   |

> **Note**: Config C DateTime presets are timezone-independent. This test produces identical raw and API values as tc-5-C-BRT and tc-5-C-IST, completing the TZ matrix for Config C presets.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT+0000`.

- Interpretation: System timezone is not UTC+0. Re-run P1 and P2.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1.

**FAIL-3 (Raw does not match initialDate):**
Step 3: Raw `.toISOString()` ≠ `"2026-03-31T11:29:14.181Z"`.

- Interpretation: The init path applied an unexpected transformation to the DateTime preset.

## Related

| Reference               | Location                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| Matrix row              | `../matrix.md` — row `5-C-UTC0`                                  |
| Summary                 | [summary](../summaries/tc-5-C-UTC0.md)                           |
| Sibling: 5-C-BRT (PASS) | [tc-5-C-BRT.md](tc-5-C-BRT.md) — identical values                |
| Sibling: 5-C-IST (PASS) | [tc-5-C-IST.md](tc-5-C-IST.md) — identical values                |
| Field config reference  | `../../CLAUDE.md` — Test Form Fields table (Preset Date section) |
