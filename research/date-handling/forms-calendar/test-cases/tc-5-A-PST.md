# TC-5-A-PST — Config A, Preset Date, PST: correct storage at PST midnight; UTC- offset confirms Bug #7 absent

## Environment Specs

| Parameter               | Required Value                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                                                                           |
| **System Timezone**     | `America/Los_Angeles` — UTC-8 (PST) / UTC-7 (PDT). DST active from second Sunday of March through first Sunday of November. March 1, 2026 is pre-DST (PST, UTC-8). |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                                                                           |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                                                                           |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=true`                                                                           |
| **Scenario**            | Preset date `3/1/2026`, PST midnight — `2026-03-01T00:00:00-08:00` = `2026-03-01T08:00:00Z` UTC                                                                    |

## Preconditions

**P1 — Set system timezone to `America/Los_Angeles`:**

macOS:

```bash
sudo systemsetup -settimezone America/Los_Angeles
```

Windows (run as Administrator):

```bat
tzutil /s "Pacific Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "Pacific Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone America/Los_Angeles
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT-0700 (PDT — test runs in April, DST active)
//   OR: GMT-0800 (PST — test runs before second Sunday of March)
// FAIL: any other offset — abort, re-check P1 and P2
```

> **DST note**: `new Date().toString()` shows the CURRENT offset (PDT GMT-0700 in April). The preset date March 1 is pre-DST, so it uses PST (GMT-0800). Both are correct — America/Los_Angeles handles DST transitions automatically.

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === true
    )
    .map((f) => ({ name: f.name, initialDate: f.initialDate }));
// Expected result includes a field with initialDate containing "2026-03-01"
// Use that field as <FIELD_NAME>
```

## Test Steps

| #   | Action                         | Test Data                                                                                    | Expected Result                                                                                             | ✓   |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                 | See Preconditions P1–P6                                                                      | All P1–P6 checks pass; target field identified as preset field with `initialDate` containing `"2026-03-01"` | ☐   |
| 2   | Verify display of preset field | Visually inspect the target field (identified in P6)                                         | `03/01/2026`                                                                                                | ☐   |
| 3   | Capture raw stored value       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                               | Date object — `.toLocaleDateString()` = `"3/1/2026"`, `.toISOString()` = `"2026-03-01T08:00:00.000Z"`       | ☐   |
| 4   | Capture GFV                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                      | Date object — `.toISOString()` = `"2026-03-01T08:00:00.000Z"`                                               | ☐   |
| 5   | Simulate save extraction       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>').toISOString().substring(0,10)` | `"2026-03-01"`                                                                                              | ☐   |
| 6   | Verify PST timezone active     | `new Date(2026, 2, 1, 0, 0, 0).toISOString()`                                                | `"2026-03-01T08:00:00.000Z"` — confirms PST (UTC-8) active for March 1                                      | ☐   |

> **Note on PST offset**: The isoRef in Step 6 uses March 1, which is pre-DST in America/Los_Angeles (PST = UTC-8). PST midnight = UTC+8h. The UTC date is still March 1 — negative offset preserves the calendar date. This confirms Bug #7 only affects UTC+ timezones.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0700` or `GMT-0800`.

- Interpretation: System timezone is not America/Los_Angeles. Re-run P1 and P2.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1.

**FAIL-3 (isoRef shows wrong offset):**
Step 6 does not return `"2026-03-01T08:00:00.000Z"`.

- Interpretation: March 1, 2026 should be PST (UTC-8, pre-DST). If the offset differs, DST rules may have changed or the timezone is wrong.

## Related

| Reference                | Location                                                          |
| ------------------------ | ----------------------------------------------------------------- |
| Matrix row               | `../matrix.md` — row `5-A-PST`                                    |
| Summary                  | [summary](../summaries/tc-5-A-PST.md)                             |
| Bug #7 analysis          | `../analysis.md` — Bug #7 (absent in UTC- — negative offset safe) |
| Sibling: 5-A-BRT (PASS)  | matrix.md — row `5-A-BRT`                                         |
| Sibling: 5-A-UTC0 (PASS) | [tc-5-A-UTC0.md](tc-5-A-UTC0.md) — Bug #7 boundary control        |
| Sibling: 5-A-IST (FAIL)  | [tc-5-A-IST.md](tc-5-A-IST.md) — Bug #7 confirmed in UTC+         |
| Field config reference   | `../../CLAUDE.md` — Test Form Fields table (Preset Date section)  |
