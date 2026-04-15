# TC-11-roundtrip-cross — Config D, Cross-TZ Round-Trip, BRT→IST→BRT: compound +2:30h net drift (FORM-BUG-5)

## Environment Specs

| Parameter               | Required Value                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                        |
| **System Timezone**     | Multi-TZ: Phase A = `Asia/Calcutta` (IST, UTC+5:30); Phase B = `America/Sao_Paulo` (BRT, UTC-3) |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                        |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5-A and P5-B)             |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`         |
| **Scenario**            | BRT-saved record opened in IST → round-trip → switch to BRT → round-trip again → compound drift |

---

## Preconditions — Phase A (IST)

**P1-A — Set system timezone to `Asia/Calcutta`:**

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

**P2-A — Restart Chrome** after the timezone change.

**P3-A — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1-A and P2-A
```

**P4-A — Open the BRT-saved record** (DateTest-000080):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from BRT (UTC-3) with Config D field set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"`.

**P5-A — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6-A — Locate the target field by configuration** (DevTools console):

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
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6-A returns more than one field, use the first result and note the ambiguity.
> If P6-A returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps — Phase A (IST Round-Trip)

| #   | Action                               | Test Data                                                                      | Expected Result                                      | ✓   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------- | --- |
| 1   | Complete IST setup                   | See Preconditions P1-A through P6-A                                            | All P1-A through P6-A checks pass                    | ☐   |
| 2   | Capture baseline raw (DevTools)      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — preserved from BRT save    | ☐   |
| 3   | Capture baseline GFV (DevTools)      | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct: no transformation | ☐   |
| 4   | Execute IST round-trip (DevTools)    | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                             | ☐   |
| 5   | Capture post-IST-trip raw (DevTools) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — correct: no drift          | ☐   |
| 6   | Confirm IST active (DevTools)        | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-14T18:30:00.000Z"` — confirms IST          | ☐   |

---

## Preconditions — Phase B (BRT)

**P1-B — Set system timezone to `America/Sao_Paulo`:**

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

**P2-B — Restart Chrome** after the timezone change.

**P3-B — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT-0300
// FAIL: any other offset — abort, re-check P1-B and P2-B
```

**P4-B — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5-B — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active
```

**P6-B — Locate the target field by configuration** (DevTools console):

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

---

## Test Steps — Phase B (BRT Round-Trip with IST-Modified Value)

| #   | Action                                 | Test Data                                                                      | Expected Result                                      | ✓   |
| --- | -------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- | --- |
| 7   | Complete BRT setup                     | See Preconditions P1-B through P6-B                                            | All P1-B through P6-B checks pass                    | ☐   |
| 8   | Simulate IST-modified value (DevTools) | `VV.Form.SetFieldValue('<FIELD_NAME>', '<IST post-trip value from step 5>')`   | Field updates                                        | ☐   |
| 9   | Capture raw (DevTools)                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — should match IST value     | ☐   |
| 10  | Capture GFV (DevTools)                 | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct: no transformation | ☐   |
| 11  | Execute BRT round-trip (DevTools)      | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                             | ☐   |
| 12  | Capture final raw (DevTools)           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — correct: no drift          | ☐   |
| 13  | Confirm BRT active (DevTools)          | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT          | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 IST +5:30h drift):** Step 3 returns `"2026-03-15T00:00:00.000Z"` (fake Z). Step 5 returns `"2026-03-15T05:30:00"` instead of `"2026-03-15T00:00:00"`. The fake Z causes moment to parse local time as UTC, adding +5:30h.

**FAIL-2 (Bug #5 BRT -3h drift):** Step 10 returns `"2026-03-15T05:30:00.000Z"` (fake Z on IST-drifted value). Step 12 returns `"2026-03-15T02:30:00"` instead of expected. The BRT round-trip applies -3h to the already-drifted value.

**FAIL-3 (Compound +2:30h net):** After both TZ round-trips, the value shifted from midnight to 02:30 — net +2:30h (IST +5:30 minus BRT 3h).

**FAIL-4 (Wrong timezone):** Step 6 or Step 13 does not return the expected IST or BRT reference value.

- Interpretation: System timezone is wrong for that phase. Re-do P1 and P2.

**FAIL-5 (V2 active):** P5-A or P5-B returns `true`.

- Interpretation: V2 code path active.

**FAIL-6 (Field not found):** P6-A or P6-B returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference                        | Location                                                         |
| -------------------------------- | ---------------------------------------------------------------- |
| Matrix row                       | `matrix.md` — row `11-roundtrip-cross`                           |
| Bug #5 analysis                  | `analysis/bug-5.md` — FORM-BUG-5: fake Z in GetFieldValue        |
| Sibling: 9-D-BRT-1 (-3h/trip)    | [tc-9-D-BRT-1.md](tc-9-D-BRT-1.md) — single BRT round-trip       |
| Sibling: 9-D-IST-1 (+5:30h/trip) | [tc-9-D-IST-1.md](tc-9-D-IST-1.md) — single IST round-trip       |
| Concurrent edit variant          | [tc-11-D-concurrent-IST-edit.md](tc-11-D-concurrent-IST-edit.md) |
| Run history                      | `summaries/tc-11-roundtrip-cross.md`                             |
