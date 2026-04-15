# TC-9-D-BRT-1 — Config D, GFV Round-Trip ×1, BRT: -3h drift per trip (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC   |

---

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
// PASS: output contains "GMT-0300"
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
| 9   | Compute drift (DevTools console)            | `new Date('<post-trip raw>') - new Date('2026-03-15T00:00:00')`                | `0` — no drift (correct behavior)                          | ☐   |
| 10  | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active         | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 fake Z in GFV — drift trigger):**
Step 4 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 active. The fake Z means Step 5 will parse the value as UTC midnight, which in BRT = March 14 21:00. The round-trip will produce -3h drift.

**FAIL-2 (Post-trip raw shifted by -3h):**
Step 7 returns `"2026-03-14T21:00:00"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 caused -3h drift after 1 round-trip. GFV returned fake Z → SFV parsed as UTC → stored as BRT local (UTC-3). Each subsequent trip would compound another -3h. After 8 trips, a full day is lost.

**FAIL-3 (Wrong timezone):** Step 10 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

---

## Related

| Reference                       | Location                                                           |
| ------------------------------- | ------------------------------------------------------------------ |
| Matrix row                      | `../matrix.md` — row `9-D-BRT-1`                                   |
| Run file                        | [`../runs/tc-9-D-BRT-1-run-1.md`](../runs/tc-9-D-BRT-1-run-1.md)   |
| Summary                         | [`../summaries/tc-9-D-BRT-1.md`](../summaries/tc-9-D-BRT-1.md)     |
| Bug #5 analysis                 | `../analysis.md` — Bug #5 (fake Z in getCalendarFieldValue)        |
| Cumulative drift: 9-D-BRT-8     | [`tc-9-D-BRT-8.md`](tc-9-D-BRT-8.md) — 8 trips, full day lost      |
| IST drift comparison: 9-D-IST-1 | [`tc-9-D-IST-1.md`](tc-9-D-IST-1.md) — +5:30h drift (opposite dir) |
| Stable control: 9-C-BRT-1       | [`tc-9-C-BRT-1.md`](tc-9-C-BRT-1.md) — Config C, 0 drift           |
| Legacy control: 9-H-BRT-1       | [`tc-9-H-BRT-1.md`](tc-9-H-BRT-1.md) — Config H, 0 drift           |
| Field config reference          | `research/date-handling/CLAUDE.md` — Config D                      |
