# TC-2-A-BRT — Config A, Typed Input, BRT: correct date stored; GFV returns raw (no bugs)

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Chromium (Playwright default engine)                                                      |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. No DST active (standard time year-round since 2019).  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, `BRT` midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC   |
| **Test Method**         | Playwright CLI (`timezoneId: America/Sao_Paulo`)                                          |

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

> **Automated alternative:** When running via `/@-create-pw-date-test`, Playwright's `timezoneId` context option handles timezone simulation at browser level. P1 and P2 are skipped — the timezone is set at browser launch via `--config=testing/config/tz-brt.json`.

**P2 — Restart Chrome** after the timezone change.

> **Automated alternative:** Not needed when using Playwright — timezone is set at context creation.

**P3 — Verify browser timezone** (DevTools console or Playwright eval):

```javascript
new Date().toString();
// PASS: output contains GMT-0300
// FAIL: any other offset — abort, re-check P1 and P2 (manual) or TZ config file (Playwright)
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

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField7"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                                                                                          | Test Data                                                            | Expected Result                                                | ✓   |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- | --- |
| 1   | Complete setup                                                                                                  | See Preconditions P1–P6                                              | All P1–P6 checks pass                                          | ☐   |
| 2   | Click the input area of the target field (identified in P6) — click to the left of the calendar icon, not on it | `<FIELD_NAME>`                                                       | Field enters segment-edit mode; "month" segment is highlighted | ☐   |
| 3   | Type month segment                                                                                              | `03`                                                                 | Field displays `03/day/year`; cursor advances to "day" segment | ☐   |
| 4   | Type day segment                                                                                                | `15`                                                                 | Field displays `03/15/year`; cursor advances to "year" segment | ☐   |
| 5   | Type year segment                                                                                               | `2026`                                                               | Field displays `03/15/2026`; year segment is highlighted       | ☐   |
| 6   | Press Tab to confirm                                                                                            | —                                                                    | Focus moves to next field; target field displays `03/15/2026`  | ☐   |
| 7   | Capture raw stored value                                                                                        | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15"` — correct date, no shift                        | ☐   |
| 8   | Capture GetFieldValue output                                                                                    | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-15"` — same as raw, no transformation                | ☐   |
| 9   | Capture isoRef                                                                                                  | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active             | ☐   |

> **Segment targeting note**: Click the input portion of the field (left side), not the calendar icon (right side). The Kendo DatePicker activates segment-edit mode on the first click. If the field shows a full date already (e.g., from a prior interaction), click once to focus, then click again on the month segment to restart entry.

## Fail Conditions

**FAIL-1 (wrong timezone active):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns `"2026-03-15T00:00:00.000Z"` (UTC midnight with no offset shift).

- Interpretation: System timezone is UTC+0, not BRT. The test is invalid — re-run P1 and P2 before proceeding.

**FAIL-2 (V2 code path active):**
P5 returns `true` instead of `false`.

- Interpretation: V2 is running (Object View context or server flag). This TC was designed for V1. Verify whether the test scenario applies to V2 before continuing.

**FAIL-3 (wrong field identified):**
P6 returns an empty array or a field name other than `DataField7`.

- Interpretation: The test form's field configuration has changed. Verify the field manually via `VV.Form.VV.FormPartition.fieldMaster` and update the test accordingly.

**FAIL-4 (segment entry did not advance):**
After typing `03`, the field still shows `MM/dd/yyyy` (no segment-edit mode) or focus went to the wrong field.

- Interpretation: The click landed on the calendar icon or outside the field input. Retry by clicking further left within the field input area.

## Related

| Reference                            | Location                                                     |
| ------------------------------------ | ------------------------------------------------------------ |
| Matrix row                           | `../matrix.md` — row `2-A-BRT`                               |
| Run history                          | `../summaries/tc-2-A-BRT.md`                                 |
| Latest run                           | `../runs/tc-2-A-BRT-run-2.md`                                |
| Sibling: Config A, popup, BRT (PASS) | `tc-1-A-BRT.md` — same storage result confirms Bug #2 absent |
| Sibling: Config A, typed, IST (FAIL) | `tc-2-A-IST.md` — Bug #7 causes -1 day shift                 |
| Field config reference               | `../../CLAUDE.md` § Test Form Fields                         |
