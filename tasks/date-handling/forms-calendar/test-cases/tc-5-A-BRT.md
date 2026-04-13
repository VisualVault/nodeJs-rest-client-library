# TC-5-A-BRT — Config A, Preset Date, BRT: correct storage at BRT midnight; no Bug #7 (UTC- unaffected)

## Environment Specs

| Parameter               | Required Value                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                        |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. DST inactive (Brazil suspended DST in 2019).                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                        |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                        |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=true`        |
| **Scenario**            | Preset date `3/1/2026`, BRT midnight — `2026-03-01T00:00:00-03:00` = `2026-03-01T03:00:00Z` UTC |

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

**P4 — Open the DateTest form template** (creates a fresh instance — preset auto-populates):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

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
            f.useLegacy === false &&
            f.enableInitialValue === true
    )
    .map((f) => ({ name: f.name, initialDate: f.initialDate }));
// Expected result includes: { name: "DataField2", initialDate: "2026-03-01T03:00:00Z" }
// Use the field whose initialDate contains "2026-03-01" — that is the preset field
```

## Test Steps

| #   | Action                         | Test Data                                                                                    | Expected Result                                                                                             | ✓   |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                 | See Preconditions P1–P6                                                                      | All P1–P6 checks pass; target field identified as preset field with `initialDate` containing `"2026-03-01"` | ☐   |
| 2   | Verify display of preset field | Visually inspect the target field (identified in P6)                                         | `03/01/2026`                                                                                                | ☐   |
| 3   | Capture raw stored value       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                               | Date object — `.toLocaleDateString()` = `"3/1/2026"`, `.toISOString()` = `"2026-03-01T03:00:00.000Z"`       | ☐   |
| 4   | Capture GFV                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                      | Date object — `.toISOString()` = `"2026-03-01T03:00:00.000Z"`                                               | ☐   |
| 5   | Simulate save extraction       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>').toISOString().substring(0,10)` | `"2026-03-01"`                                                                                              | ☐   |
| 6   | Verify BRT timezone active     | `new Date(2026, 2, 1, 0, 0, 0).toISOString()`                                                | `"2026-03-01T03:00:00.000Z"` — confirms BRT active                                                          | ☐   |

> **Note on Bug #7 absence**: At UTC-3 (BRT), local midnight = UTC+3h on the same calendar day. The `parseDateString` → `moment(stripped).startOf('day').toDate()` chain produces a Date at BRT midnight (03:00Z), so `.toISOString().substring(0,10)` = `"2026-03-01"` — correct. Bug #7 only triggers in UTC+ timezones where local midnight falls on the previous UTC day.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. Re-run P1 and P2.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior.

**FAIL-3 (isoRef does not show BRT midnight):**
Step 6 returns a value other than `"2026-03-01T03:00:00.000Z"`.

- Interpretation: BRT is not active. Local midnight should be UTC+3h at this timezone.

## Related

| Reference                | Location                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| Matrix row               | `../matrix.md` — row `5-A-BRT`                                   |
| Summary                  | [summary](../summaries/tc-5-A-BRT.md)                            |
| Bug #7 analysis          | `../analysis.md` — Bug #7 (absent in BRT — UTC- control)         |
| Sibling: 5-A-IST (FAIL)  | [tc-5-A-IST.md](tc-5-A-IST.md) — Bug #7 confirmed in UTC+        |
| Sibling: 5-A-UTC0 (PASS) | [tc-5-A-UTC0.md](tc-5-A-UTC0.md) — Bug #7 boundary control       |
| Sibling: 5-A-PST (PASS)  | [tc-5-A-PST.md](tc-5-A-PST.md) — UTC- control                    |
| Field config reference   | `../../CLAUDE.md` — Test Form Fields table (Preset Date section) |
