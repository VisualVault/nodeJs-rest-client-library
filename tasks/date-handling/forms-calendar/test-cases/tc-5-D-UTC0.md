# TC-5-D-UTC0 — Config D, Preset Date, UTC0: raw Date preserves initialDate; Bug #5 fake Z coincidentally correct at UTC0

## Environment Specs

| Parameter               | Required Value                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                         |
| **System Timezone**     | `Etc/GMT` — UTC+0, `GMT`. No DST.                                                                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                         |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                         |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=true`           |
| **Scenario**            | Preset DateTime, UTC0 — `initialDate` = `"2026-03-01T11:28:54.627Z"`, local UTC0 = `11:28:54` AM |

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
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === true
    )
    .map((f) => ({ name: f.name, initialDate: f.initialDate }));
// Expected: { name: "Field16", initialDate: "2026-03-01T11:28:54.627Z" }
// Use the field with "2026-03-01" in initialDate
```

## Test Steps

| #   | Action                         | Test Data                                                      | Expected Result                                                                                  | ✓   |
| --- | ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --- |
| 1   | Complete setup                 | See Preconditions P1–P6                                        | All P1–P6 checks pass; target field identified with `initialDate` = `"2026-03-01T11:28:54.627Z"` | ☐   |
| 2   | Verify display of preset field | Visually inspect the target field (identified in P6)           | `03/01/2026 11:28 AM` (UTC0 local display of the preset DateTime)                                | ☐   |
| 3   | Capture raw stored value       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | Date object — `.toISOString()` = `"2026-03-01T11:28:54.627Z"` (preserves initialDate)            | ☐   |
| 4   | Capture GFV                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-01T11:28:54.627"` (local time without fake Z suffix)                                   | ☐   |
| 5   | Verify UTC0 timezone active    | `new Date(2026, 2, 1, 0, 0, 0).toISOString()`                  | `"2026-03-01T00:00:00.000Z"` — confirms UTC0 active                                              | ☐   |

> **Note on Bug #5 at UTC0**: Config D GFV uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` which adds a fake Z. At UTC+0, `moment(value)` produces local time that equals UTC time, so the fake Z happens to be numerically correct. The Expected Result in Step 4 reflects correct behavior (no Z); if the observed value includes Z, Bug #5 is present but the numeric value is coincidentally unchanged. Consumers treating Z as UTC will get the right answer only at UTC+0 — the bug is still architecturally present.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT+0000`.

- Interpretation: System timezone is not UTC+0. Re-run P1 and P2.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1.

**FAIL-3 (Bug #5 — GFV adds fake Z at UTC0):**
Step 4: GFV returns `"2026-03-01T11:28:54.627Z"` instead of `"2026-03-01T11:28:54.627"`. The value is numerically correct (local = UTC at +0), but the trailing Z is still a fake UTC marker added by the `[Z]` format bracket. At any other timezone, this same code produces a wrong value.

- Interpretation: Bug #5 confirmed at UTC+0 — structurally identical to BRT (-3h shift) and IST (+5:30h shift), but the shift is 0h. The bug is invisible at UTC+0 but architecturally present. Round-trip `SetFieldValue(GetFieldValue())` at UTC+0 is stable (0h shift per trip), unlike BRT (-3h) and IST (+5:30h).

**FAIL-4 (Raw does not match initialDate):**
Step 3: Raw `.toISOString()` ≠ `"2026-03-01T11:28:54.627Z"`.

- Interpretation: DateTime preset should store raw Date from `new Date(initialDate)` without truncation.

## Related

| Reference               | Location                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| Matrix row              | `../matrix.md` — row `5-D-UTC0`                                  |
| Summary                 | [summary](../summaries/tc-5-D-UTC0.md)                           |
| Bug #5 analysis         | `../analysis.md` — Bug #5 (fake Z — invisible at UTC+0)          |
| Sibling: 5-D-BRT (FAIL) | [tc-5-D-BRT.md](tc-5-D-BRT.md) — Bug #5 visible (-3h shift)      |
| Sibling: 5-D-IST (FAIL) | [tc-5-D-IST.md](tc-5-D-IST.md) — Bug #5 visible (+5:30h shift)   |
| Field config reference  | `../../CLAUDE.md` — Test Form Fields table (Preset Date section) |
