# TC-9-B-IST — Config B, Round-Trip 1 trip, IST: -1 day per SFV — Bug #7 on date-only

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).             |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, IST — date-only field, Bug #7 causes -1 day per SFV call in UTC+           |

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
            f.enableTime === false &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField10"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`                          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15"` — no shift (correct behavior)       | ☐   |
| 4   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                           | ☐   |
| 5   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15"` — unchanged (correct behavior)      | ☐   |
| 6   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15"` — same as raw (correct behavior)    | ☐   |
| 7   | Compare raw before vs after                 | Step 3 raw vs Step 5 raw                                                       | Identical — `"2026-03-15"` (correct behavior)      | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #7 — cumulative day loss from initial SFV + round-trip SFV):**
Step 3 returns `"2026-03-14"` (Bug #7 on initial SFV), then Step 5 returns `"2026-03-13"` (Bug #7 again on round-trip SFV). Final raw = `"2026-03-13"` — lost 2 days total from intended `"2026-03-15"`.

- Interpretation: This is Bug #7, not Bug #5. Bug #7 affects every SFV call on date-only fields in UTC+ timezones. `normalizeCalValue()` parses `"2026-03-15"` as IST local midnight → `toISOString()` produces `"2026-03-14T18:30:00Z"` → `getSaveValue()` extracts `"2026-03-14"`. The initial SFV (Step 2) already loses 1 day. The round-trip GFV returns `"2026-03-14"` (the stored value), then SFV parses that as IST midnight → stores `"2026-03-13"`. Each SFV call loses 1 day.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path is running. This test was designed for V1.

**FAIL-4 (Field not found):** P6 returns an empty array or unexpected field name.

- Interpretation: Field configuration mismatch. Verify form template is correct.

---

## Related

| Reference                        | Location                                                      |
| -------------------------------- | ------------------------------------------------------------- |
| Matrix row                       | `../matrix.md` — row `9-B-IST`                                |
| Run file                         | [`../runs/tc-9-B-IST-run-1.md`](../runs/tc-9-B-IST-run-1.md)  |
| Summary                          | [`../summaries/tc-9-B-IST.md`](../summaries/tc-9-B-IST.md)    |
| Bug #7 analysis                  | `../analysis.md` — Bug #7 (date-only day loss in UTC+)        |
| Config B BRT (immune): 9-B-any   | [`tc-9-B-any.md`](tc-9-B-any.md) — 0 drift in BRT (UTC-)      |
| Config D IST (Bug #5): 9-D-IST-1 | [`tc-9-D-IST-1.md`](tc-9-D-IST-1.md) — different bug, same TZ |
| Config A IST: 1-A-IST            | Cat 1 test showing Bug #7 on Config A in IST                  |
| Field config reference           | `research/date-handling/CLAUDE.md` — Config B                 |
