# TC-9-D-PST-1 — Config D, Round-Trip 1 trip, PDT: -7h drift — DST active (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Los_Angeles` — UTC-7, PDT (DST active March 8–Nov 1, 2026).                    |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, PDT midnight — `2026-03-15T00:00:00-07:00` = `2026-03-15T07:00:00Z` UTC   |

---

## Preconditions

**P1 — Set system timezone to `America/Los_Angeles`:**

macOS:

```bash
sudo systemsetup -settimezone America/Los_Angeles
```

Windows (run as Administrator):

```bat
tzutil /s "Pacific Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "Pacific Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone America/Los_Angeles
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT-0700" (PDT — DST active on March 15, 2026; DST starts March 8)
// FAIL: "GMT-0800" means PST (DST not active) — check system date
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

| #   | Action                                      | Test Data                                                                      | Expected Result                                          | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                    | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | Field displays `03/15/2026 12:00 AM`                     | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                                  | ☐   |
| 4   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                                 | ☐   |
| 5   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — no drift (correct behavior)    | ☐   |
| 6   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — same as raw (correct behavior) | ☐   |
| 7   | Compare raw before vs after                 | Step 3 raw vs Step 5 raw                                                       | Identical — `"2026-03-15T00:00:00"` (correct behavior)   | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T07:00:00.000Z"` — confirms PDT active       | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 drift — -7h after 1 trip, PDT):**
Step 5 returns `"2026-03-14T17:00:00"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 caused -7h drift. GFV adds fake Z → SFV parses as UTC midnight → stores PDT local (UTC-7). Note: DST is active on March 15, 2026 (DST starts March 8), so the drift is -7h (PDT), not -8h (PST). This confirms Bug #5 drift magnitude is determined by the active UTC offset at the time of the round-trip, including DST.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-15T07:00:00.000Z"`.

- Interpretation: System timezone is not PDT. Re-do P1 and P2. If output is `"2026-03-15T08:00:00.000Z"`, DST is not active (PST).

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path is running. This test was designed for V1.

**FAIL-4 (Field not found):** P6 returns an empty array or unexpected field name.

- Interpretation: Field configuration mismatch. Verify form template is correct.

---

## Related

| Reference                 | Location                                                           |
| ------------------------- | ------------------------------------------------------------------ |
| Matrix row                | `../matrix.md` — row `9-D-PST-1`                                   |
| Run file                  | [`../runs/tc-9-D-PST-1-run-1.md`](../runs/tc-9-D-PST-1-run-1.md)   |
| Summary                   | [`../summaries/tc-9-D-PST-1.md`](../summaries/tc-9-D-PST-1.md)     |
| Bug #5 analysis           | `../analysis.md` — Bug #5 (fake Z in getCalendarFieldValue)        |
| BRT comparison: 9-D-BRT-1 | [`tc-9-D-BRT-1.md`](tc-9-D-BRT-1.md) — -3h drift (UTC-3, no DST)   |
| IST comparison: 9-D-IST-1 | [`tc-9-D-IST-1.md`](tc-9-D-IST-1.md) — +5:30h drift (opposite dir) |
| UTC0 boundary: 9-D-UTC0   | [`tc-9-D-UTC0.md`](tc-9-D-UTC0.md) — 0h drift (Bug #5 invisible)   |
| Field config reference    | `research/date-handling/CLAUDE.md` — Config D                      |
