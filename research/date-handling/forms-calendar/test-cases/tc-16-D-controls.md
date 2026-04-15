# TC-16-D-controls — Config D, Controls Reload, BRT: cross-env form load comparison; fake Z (FORM-BUG-5)

## Environment Specs

| Parameter           | Required Value                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                                 |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                                          |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                                 |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                                              |
| Target Field Config | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`                  |
| Scenario            | Reload saved record from tc-16-D-SFV — cross-env comparison of loaded values; FORM-BUG-5 fake Z expected |

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

**P4 — Open the saved DateTest form instance** (from tc-16-D-SFV Phase A or Phase B).

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

### Phase A — vv5dev (Server PDT, UTC-7)

| #   | Action                              | Test Data                                                      | Expected Result                                       | ✓   |
| --- | ----------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- | --- |
| 1   | Complete setup                      | See Preconditions P1–P6, open saved record on vv5dev           | All checks pass                                       | ☐   |
| 2   | Capture raw stored value after load | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"`                               | ☐   |
| 3   | Capture API return value after load | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T14:30:00.000Z"` — **FORM-BUG-5: fake Z** | ☐   |
| 4   | Verify display                      | Visual check of field                                          | `03/15/2026 02:30 PM`                                 | ☐   |

### Phase B — vvdemo (Server BRT, UTC-3)

| #   | Action                              | Test Data                                            | Expected Result                                                     | ✓   |
| --- | ----------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | --- |
| 5   | Complete setup                      | See Preconditions P1–P6, open saved record on vvdemo | All checks pass                                                     | ☐   |
| 6   | Capture raw stored value after load | `getValueObjectValue`                                | `"2026-03-15T14:30:00"`                                             | ☐   |
| 7   | Capture API return value after load | `GetFieldValue`                                      | `"2026-03-15T14:30:00.000Z"` — FORM-BUG-5                           | ☐   |
| 8   | Verify display                      | Visual check of field                                | `03/15/2026 02:30 PM`                                               | ☐   |
| 9   | Compare Phase A vs Phase B          | Compare Steps 2-3 vs 6-7                             | Identical values — server TZ does not affect DateTime+iTZ form load | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (FORM-BUG-5 fake Z):** GetFieldValue returns `"2026-03-15T14:30:00.000Z"` — the Z is fake. Known bug, expected behavior. Document but do not treat as test failure.

**FAIL-4 (Values differ):** Phase A loaded values ≠ Phase B loaded values. Server timezone affects the form load pipeline for DateTime+iTZ fields.

## Related

| Reference               | Location                                                       |
| ----------------------- | -------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `16-D-controls`                              |
| Category 16 description | `matrix.md` § "16 — Server TZ on Form Save Pipeline"           |
| Sibling TCs             | `tc-16-D-SFV.md`, `tc-16-A-controls.md`, `tc-16-C-controls.md` |
| Bug reference           | `forms-calendar/analysis/bug-5-fake-z-drift.md`                |
