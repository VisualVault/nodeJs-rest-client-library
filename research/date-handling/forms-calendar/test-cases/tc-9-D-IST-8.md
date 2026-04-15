# TC-9-D-IST-8 — Config D, Round-Trip 8 trips, IST: +44h cumulative drift (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).            |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15` baseline, 8 GFV round-trips in IST — each trip drifts +5:30h (Bug #5)      |

---

## Preconditions

**P1 — Set system timezone to `Asia/Calcutta`:**

macOS:

```bash
sudo systemsetup -settimezone Asia/Calcutta
```

Windows (run as Administrator):

```bat
tzutil /s "India Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "India Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone Asia/Calcutta
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT+0530"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template:**

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active
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
// Expected: ["DataField5"]
```

---

## Test Steps

| #   | Action                                          | Test Data                                                                                                   | Expected Result                                          | ✓   |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --- |
| 1   | Complete setup                                  | See Preconditions P1–P6                                                                                     | All P1–P6 checks pass                                    | ☐   |
| 2   | Set baseline value (DevTools console)           | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                              | Field displays `03/15/2026 12:00 AM`                     | ☐   |
| 3   | Capture baseline raw (DevTools console)         | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                              | `"2026-03-15T00:00:00"`                                  | ☐   |
| 4   | Execute 8 GFV round-trips in sequence (console) | `for (var i=0; i<8; i++) { VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>')); }` | No error                                                 | ☐   |
| 5   | Capture post-trip raw (DevTools console)        | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                              | `"2026-03-15T00:00:00"` — no drift (correct behavior)    | ☐   |
| 6   | Capture post-trip GFV (DevTools console)        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                     | `"2026-03-15T00:00:00"` — same as raw (correct behavior) | ☐   |
| 7   | Compare raw before vs after                     | Step 3 raw vs Step 5 raw                                                                                    | Identical — `"2026-03-15T00:00:00"` (correct behavior)   | ☐   |
| 8   | Confirm browser timezone (DevTools console)     | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                              | `"2026-03-14T18:30:00.000Z"` — confirms IST active       | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 cumulative drift — +44h after 8 trips):**
Step 5 returns `"2026-03-16T20:00:00"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 caused +5:30h per trip × 8 trips = +44h. GFV adds fake Z → SFV parses as UTC → stores IST local (UTC+5:30). Trip progression: `+5:30 → +11:00 → +16:30 → +22:00 → +27:30 → +33:00 → +38:30 → +44:00`. The date rolled forward nearly 2 full days to March 16 at 8:00 PM.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path is running. This test was designed for V1.

**FAIL-4 (Field not found):** P6 returns an empty array or unexpected field name.

- Interpretation: Field configuration mismatch. Verify form template is correct.

---

## Related

| Reference                 | Location                                                             |
| ------------------------- | -------------------------------------------------------------------- |
| Matrix row                | `../matrix.md` — row `9-D-IST-8`                                     |
| Run file                  | [`../runs/tc-9-D-IST-8-run-1.md`](../runs/tc-9-D-IST-8-run-1.md)     |
| Summary                   | [`../summaries/tc-9-D-IST-8.md`](../summaries/tc-9-D-IST-8.md)       |
| Bug #5 analysis           | `../analysis.md` — Bug #5 (fake Z in getCalendarFieldValue)          |
| Single-trip: 9-D-IST-1    | [`tc-9-D-IST-1.md`](tc-9-D-IST-1.md) — +5:30h after 1 trip           |
| 5-trip: 9-D-IST-5         | [`tc-9-D-IST-5.md`](tc-9-D-IST-5.md) — +27:30h, day boundary crossed |
| 10-trip: 9-D-IST-10       | [`tc-9-D-IST-10.md`](tc-9-D-IST-10.md) — +55h, >2 days forward       |
| BRT comparison: 9-D-BRT-8 | [`tc-9-D-BRT-8.md`](tc-9-D-BRT-8.md) — -24h (opposite direction)     |
| Field config reference    | `research/date-handling/CLAUDE.md` — Config D                        |
