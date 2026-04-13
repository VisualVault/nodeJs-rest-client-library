# TC-16-D-SFV — Config D, SetFieldValue, BRT: cross-env API comparison for DateTime+iTZ

## Environment Specs

| Parameter           | Required Value                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                      |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                               |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                      |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                                   |
| Target Field Config | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`       |
| Scenario            | SFV `"2026-03-15T14:30:00"` — cross-env comparison vv5dev (PDT server) vs vvdemo (BRT server) |

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

### Phase A — vv5dev (Server PDT, UTC-7)

| #   | Action                      | Test Data                                                      | Expected Result                                       | ✓   |
| --- | --------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P6 on vv5dev                              | All P1–P6 checks pass                                 | ☐   |
| 2   | Set field value via console | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Field displays `03/15/2026 02:30 PM`                  | ☐   |
| 3   | Capture raw stored value    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T14:30:00"`                               | ☐   |
| 4   | Capture API return value    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T14:30:00.000Z"` — **FORM-BUG-5: fake Z** | ☐   |
| 5   | Save form                   | Save via sanctioned path                                       | Form saved                                            | ☐   |
| 6   | Read via API                | GET forminstance — inspect field5                              | `"2026-03-15T14:30:00Z"`                              | ☐   |

> **Step 4 explanation:** Config D (ignoreTimezone=true) — GetFieldValue calls `toISOString()` on a Date object created from a timezone-ambiguous string. The fake Z suffix makes the value appear UTC when it is actually local time. This is FORM-BUG-5.

### Phase B — vvdemo (Server BRT, UTC-3)

| #   | Action                      | Test Data                                                      | Expected Result                                                        | ✓   |
| --- | --------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- | --- |
| 7   | Complete setup              | See Preconditions P1–P6 on vvdemo                              | All P1–P6 checks pass                                                  | ☐   |
| 8   | Set field value via console | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T14:30:00')` | Field displays `03/15/2026 02:30 PM`                                   | ☐   |
| 9   | Capture raw stored value    | `getValueObjectValue`                                          | `"2026-03-15T14:30:00"`                                                | ☐   |
| 10  | Capture API return value    | `GetFieldValue`                                                | `"2026-03-15T14:30:00.000Z"` — FORM-BUG-5                              | ☐   |
| 11  | Save form                   | Save via sanctioned path                                       | Form saved                                                             | ☐   |
| 12  | Read via API                | GET forminstance — inspect field5                              | `"2026-03-15T14:30:00Z"`                                               | ☐   |
| 13  | Compare Phase A vs Phase B  | Compare Steps 6 vs 12                                          | Identical API values — server TZ does not affect DateTime+iTZ pipeline | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (FORM-BUG-5 fake Z):** GetFieldValue returns `"2026-03-15T14:30:00.000Z"` — the Z is fake. This is a known bug, not a test failure, but must be documented.

**FAIL-4 (API values differ):** Phase A field5 ≠ Phase B field5. Server timezone affects the form save→API pipeline for DateTime+iTZ fields.

## Related

| Reference               | Location                                                      |
| ----------------------- | ------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `16-D-SFV`                                  |
| Category 16 description | `matrix.md` § "16 — Server TZ on Form Save Pipeline"          |
| Sibling TCs             | `tc-16-A-typed.md`, `tc-16-C-typed.md`, `tc-16-D-controls.md` |
| Bug reference           | `forms-calendar/analysis/bug-5-fake-z-drift.md`               |
