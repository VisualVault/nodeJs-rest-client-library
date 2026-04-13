# TC-14-D-typed — Config D, Typed Input, BRT: local midnight stored; fake Z in API (FORM-BUG-5)

## Environment Specs

| Parameter           | Required Value                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Browser             | Google Chrome, latest stable (V8 engine)                                                               |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                                        |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                               |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                                            |
| Target Field Config | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`                |
| Scenario            | `2026-03-15 12:00 AM`, BRT midnight via typed input — stored as local, API appends fake Z (FORM-BUG-5) |

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
// FAIL: any other offset — abort
```

**P4 — Open the DateTest form template:**

```
/FormViewer/app?hidemenu=true&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d&xcid=WADNR&xcdid=fpOnline
```

**P5 — Verify code path:**

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field5"]
```

## Test Steps

### Phase A — Unmasked Baseline

| #   | Action                       | Test Data                                                                                   | Expected Result                                                                                    | ✓   |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup               | See Preconditions P1–P6                                                                     | All P1–P6 checks pass                                                                              | ☐   |
| 2   | Click target field input box | —                                                                                           | Field gains focus, cursor visible                                                                  | ☐   |
| 3   | Type date segment-by-segment | `03/15/2026 12:00 AM` — type month, tab, day, tab, year, tab, hour, tab, minute, tab, AM/PM | Field displays `03/15/2026 12:00 AM`                                                               | ☐   |
| 4   | Tab out of field             | Press Tab                                                                                   | Field loses focus, value committed to Kendo widget                                                 | ☐   |
| 5   | Capture raw stored value     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                              | `"2026-03-15T00:00:00"`                                                                            | ☐   |
| 6   | Capture API return value     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                     | **Expected (correct):** `"2026-03-15T00:00:00"` (no Z — ignoreTimezone should skip UTC conversion) | ☐   |
| 7   | Verify BRT active            | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                              | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                                                 | ☐   |

> **Step 6 — FORM-BUG-5 expected:** Config D (ignoreTimezone=true) should return the value without UTC conversion. However, FORM-BUG-5 appends a fake Z suffix: actual result is likely `"2026-03-15T00:00:00.000Z"`. This Z is semantically wrong — the value is local time, not UTC.

### Phase C — With Mask (future)

| #   | Action                                            | Test Data                                                      | Expected Result                                             | ✓   |
| --- | ------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | --- |
| 8   | Add `<Mask>MM/dd/yyyy</Mask>` to target field     | Form Designer                                                  | Mask applied — time portion hidden in display               | ☐   |
| 9   | Open fresh form instance                          | Navigate to template URL                                       | New form created                                            | ☐   |
| 10  | Repeat typed input — type date segment-by-segment | `03/15/2026` — type month, tab, day, tab, year                 | Field displays `03/15/2026` (time input segments absent?)   | ☐   |
| 11  | Tab out of field                                  | Press Tab                                                      | Field loses focus                                           | ☐   |
| 12  | Capture raw stored value                          | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"` — time preserved as midnight?       | ☐   |
| 13  | Capture API return value                          | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | **Expected (correct):** `"2026-03-15T00:00:00"` — no Z      | ☐   |
| 14  | Compare Phase A vs Phase C                        | Visual diff of Steps 5-6 vs 12-13                              | Identical values — mask is display-only, time not truncated | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (FORM-BUG-5 fake Z):** Step 6 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`. This is the known FORM-BUG-5 defect — Config D appends a fake Z suffix via `toISOString()` when it should return the raw local value. Record the actual value and mark as **confirmed bug**.

**FAIL-4 (Mask forces date-only — Phase C):** Mask removes time input segments entirely, forcing date-only entry. Raw value becomes `"2026-03-15"` instead of `"2026-03-15T00:00:00"`. Critical WADNR finding.

## Related

| Reference               | Location                                                 |
| ----------------------- | -------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `14-D-typed`                           |
| Category 14 description | `matrix.md` § "14 — Mask Impact"                         |
| FORM-BUG-5              | `forms-calendar/analysis/bug-5-fake-z-drift.md`          |
| Sibling TCs             | `tc-14-C-typed.md`, `tc-14-D-popup.md`, `tc-14-D-SFV.md` |
