# TC-16-A-typed — Config A, Typed Input, BRT: cross-env API comparison for date-only

## Environment Specs

| Parameter           | Required Value                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Browser             | Google Chrome, latest stable (V8 engine)                                                                      |
| System Timezone     | `America/Sao_Paulo` — UTC-3, BRT. DST inactive.                                                               |
| Platform            | VisualVault FormViewer, Build 20260410.1                                                                      |
| VV Code Path        | V1 (`useUpdatedCalendarValueLogic = false`)                                                                   |
| Target Field Config | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`                     |
| Scenario            | `03/15/2026`, BRT date-only via typed input — cross-env comparison vv5dev (PDT server) vs vvdemo (BRT server) |

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field7"]
```

## Test Steps

### Phase A — vv5dev (Server PDT, UTC-7)

| #   | Action                       | Test Data                                                      | Expected Result                    | ✓   |
| --- | ---------------------------- | -------------------------------------------------------------- | ---------------------------------- | --- |
| 1   | Complete setup               | See Preconditions P1–P6 on vv5dev                              | All P1–P6 checks pass              | ☐   |
| 2   | Click target field input box | —                                                              | Field gains focus                  | ☐   |
| 3   | Type date                    | `03/15/2026` — type month, tab, day, tab, year                 | Field displays `03/15/2026`        | ☐   |
| 4   | Tab out of field             | Press Tab                                                      | Field loses focus, value committed | ☐   |
| 5   | Capture raw stored value     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                     | ☐   |
| 6   | Capture API return value     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                     | ☐   |
| 7   | Save form                    | Save via sanctioned path                                       | Form saved                         | ☐   |
| 8   | Read via API                 | GET forminstance — inspect field7                              | `"2026-03-15T00:00:00Z"`           | ☐   |

### Phase B — vvdemo (Server BRT, UTC-3)

| #   | Action                     | Test Data                         | Expected Result                                                     | ✓   |
| --- | -------------------------- | --------------------------------- | ------------------------------------------------------------------- | --- |
| 9   | Complete setup             | See Preconditions P1–P6 on vvdemo | All P1–P6 checks pass                                               | ☐   |
| 10  | Repeat typed input         | `03/15/2026`                      | Field displays `03/15/2026`                                         | ☐   |
| 11  | Capture raw stored value   | `getValueObjectValue`             | `"2026-03-15"`                                                      | ☐   |
| 12  | Capture API return value   | `GetFieldValue`                   | `"2026-03-15"`                                                      | ☐   |
| 13  | Save form                  | Save via sanctioned path          | Form saved                                                          | ☐   |
| 14  | Read via API               | GET forminstance — inspect field7 | `"2026-03-15T00:00:00Z"`                                            | ☐   |
| 15  | Compare Phase A vs Phase B | Compare Steps 8 vs 14             | Identical API values — server TZ does not affect date-only pipeline | ☐   |

## Fail Conditions

**FAIL-1 (Wrong timezone):** `new Date().toString()` does not contain `GMT-0300`. Abort.

**FAIL-2 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`. Abort.

**FAIL-3 (API values differ):** Phase A field7 ≠ Phase B field7. Server timezone affects the form save→API pipeline for date-only fields. This would mean vv5dev's PDT offset and vvdemo's BRT offset produce different stored values — critical finding.

## Related

| Reference               | Location                                                    |
| ----------------------- | ----------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `16-A-typed`                              |
| Category 16 description | `matrix.md` § "16 — Server TZ on Form Save Pipeline"        |
| Sibling TCs             | `tc-16-C-typed.md`, `tc-16-D-SFV.md`, `tc-16-A-controls.md` |
