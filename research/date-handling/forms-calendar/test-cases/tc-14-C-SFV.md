# TC-14-C-SFV — Config C, SetFieldValue, BRT: local datetime stored; API converts to UTC+Z

## Environment Specs

| Parameter           | Required Value                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                 |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                          |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                 |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                              |
| Target Field Config | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| Scenario            | `2026-03-15T14:30:00`, BRT — `2026-03-15T14:30:00-03:00` = `2026-03-15T17:30:00` UTC     |

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

**P4 — Open the DateTest form template:**

```
/FormViewer/app?hidemenu=true&formid=ff59bb37-b331-f111-830f-d3ae5cbd0a3d&xcid=WADNR&xcdid=fpOnline
```

**P5 — Verify code path** (DevTools console):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1 is active, proceed
// ABORT: true → V2 is active
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field6"]
```

## Test Steps

### Phase A — Unmasked Baseline

| #   | Action                      | Test Data                                                      | Expected Result                                    | ✓   |
| --- | --------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set field value via console | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Field displays `03/15/2026 02:30 PM`               | ☐   |
| 3   | Capture raw stored value    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"`                            | ☐   |
| 4   | Capture API return value    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T17:30:00.000Z"`                       | ☐   |
| 5   | Verify BRT active           | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Step 4 explanation:** Config C (ignoreTimezone=false) — GetFieldValue creates `new Date("2026-03-15T14:30:00")` (parsed as BRT local 14:30) → `toISOString()` → `"2026-03-15T17:30:00.000Z"` (correct UTC conversion).

### Phase C — With Mask (future)

| #   | Action                                        | Test Data                                                      | Expected Result                                             | ✓   |
| --- | --------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | --- |
| 6   | Add `<Mask>MM/dd/yyyy</Mask>` to target field | Form Designer                                                  | Mask applied — time portion hidden in display               | ☐   |
| 7   | Open fresh form instance                      | Navigate to template URL                                       | New form created                                            | ☐   |
| 8   | Repeat Step 2 — SetFieldValue with datetime   | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Field displays `03/15/2026` (time hidden by mask)           | ☐   |
| 9   | Capture raw stored value                      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"` — time preserved despite mask?      | ☐   |
| 10  | Capture API return value                      | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T17:30:00.000Z"` — same UTC conversion?         | ☐   |
| 11  | Compare Phase A vs Phase C                    | Visual diff of Steps 3-4 vs 9-10                               | Identical values — mask is display-only, time not truncated | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (Mask truncation — Phase C):** Raw value loses time component (e.g., `"2026-03-15"` instead of `"2026-03-15T14:30:00"`). This confirms masks are NOT display-only for DateTime fields — **critical WADNR finding** (8 production DateTime fields have date-only masks).

**FAIL-4 (Mask alters API — Phase C):** API return changes from `"2026-03-15T17:30:00.000Z"` to something else (e.g., `"2026-03-15T03:00:00.000Z"` if time was truncated to midnight). Same severity as FAIL-3.

## Related

| Reference               | Location                                             |
| ----------------------- | ---------------------------------------------------- |
| Matrix row              | `matrix.md` — row `14-C-SFV`                         |
| Category 14 description | `matrix.md` § "14 — Mask Impact"                     |
| Config C bugs           | FORM-BUG-6 (empty fields only — not triggered here)  |
| Sibling TCs             | `tc-14-A-SFV.md`, `tc-14-D-SFV.md`, `tc-14-C-GFV.md` |
