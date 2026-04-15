# TC-9-D-IST-1 — Config D, GFV Round-Trip ×1, IST: +5:30h drift per trip (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).            |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00Z` UTC   |

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

| #   | Action                                      | Test Data                                                                      | Expected Result                                            | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                      | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | Field displays `03/15/2026 12:00 AM`                       | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                                    | ☐   |
| 4   | Capture baseline GFV (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — raw unchanged (correct behavior) | ☐   |
| 5   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                                   | ☐   |
| 6   | Capture post-trip display                   | —                                                                              | `03/15/2026 12:00 AM` — no drift (correct behavior)        | ☐   |
| 7   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — no drift (correct behavior)      | ☐   |
| 8   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — same as raw (correct behavior)   | ☐   |
| 9   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active         | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 fake Z in GFV — forward drift):**
Step 4 returns `"2026-03-15T00:00:00.000Z"` — fake Z appended. Step 7 then returns `"2026-03-15T05:30:00"` — +5:30h drift.

- Interpretation: Bug #5 active. GFV returned fake Z → SFV parsed as UTC midnight → IST local = 05:30 AM March 15 → stored `"2026-03-15T05:30:00"`. Drift is +5:30h per trip (opposite direction from BRT -3h). After ~4.4 trips, the date rolls forward to March 16.

**FAIL-2 (Wrong timezone):** Step 9 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

---

## Related

| Reference                 | Location                                                             |
| ------------------------- | -------------------------------------------------------------------- |
| Matrix row                | `../matrix.md` — row `9-D-IST-1`                                     |
| Run file                  | [`../runs/tc-9-D-IST-1-run-1.md`](../runs/tc-9-D-IST-1-run-1.md)     |
| Summary                   | [`../summaries/tc-9-D-IST-1.md`](../summaries/tc-9-D-IST-1.md)       |
| Bug #5 analysis           | `../analysis.md` — Bug #5 (fake Z in getCalendarFieldValue)          |
| 5-trip IST: 9-D-IST-5     | [`tc-9-D-IST-5.md`](tc-9-D-IST-5.md) — +27:30h, day boundary crossed |
| BRT comparison: 9-D-BRT-1 | [`tc-9-D-BRT-1.md`](tc-9-D-BRT-1.md) — -3h (opposite direction)      |
| Field config reference    | `research/date-handling/CLAUDE.md` — Config D                        |
