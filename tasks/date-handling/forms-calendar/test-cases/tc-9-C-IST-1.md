# TC-9-C-IST-1 — Config C, GFV Round-Trip ×1, IST: 0 drift; real UTC round-trips correctly

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST.                                                 |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00Z` UTC    |

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

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
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
// Expected: ["DataField6"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | Field displays `03/15/2026 12:00 AM`               | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                            | ☐   |
| 4   | Capture baseline GFV (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct, no drift        | ☐   |
| 5   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                           | ☐   |
| 6   | Capture post-trip display                   | —                                                                              | `03/15/2026 12:00 AM` — unchanged, no drift        | ☐   |
| 7   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — unchanged, no drift      | ☐   |
| 8   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — same as raw, no drift    | ☐   |
| 9   | Compute drift (DevTools console)            | `new Date('<post-trip raw>') - new Date('2026-03-15T00:00:00')`                | `0` — no drift                                     | ☐   |
| 10  | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Key comparison**: Config D (same flags except `ignoreTimezone=true`) drifts +5:30h per trip due to Bug #5 (fake Z). Config C should show zero drift because `ignoreTimezone=false` means GFV uses real UTC conversion, not the fake-Z branch.

---

## Fail Conditions

**FAIL-1 (Post-trip raw shifted — drift detected):** Step 7 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: Drift occurred on Config C — this would be unexpected since Bug #5 only affects `ignoreTimezone=true` fields. Verify P6 returned DataField6, not DataField5 (Config D).

**FAIL-2 (Wrong timezone):** Step 10 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path is running. This test was designed for V1. Verify form URL has no `?ObjectID=` parameter and no server-side flag override.

**FAIL-4 (Field not found):** P6 returns an empty array or unexpected field name.

- Interpretation: Field configuration mismatch. Verify form template is correct and field definitions haven't changed.

---

## Related

| Reference                      | Location                                                      |
| ------------------------------ | ------------------------------------------------------------- |
| Matrix row                     | `../matrix.md` — row `9-C-IST-1`                              |
| BRT sibling: 9-C-BRT-1         | [`tc-9-C-BRT-1.md`](tc-9-C-BRT-1.md) — Config C, BRT, 0 drift |
| Config D comparison: 9-D-IST-1 | [`tc-9-D-IST-1.md`](tc-9-D-IST-1.md) — drifts +5:30h          |
| Bug #5 analysis                | `../analysis.md` — Bug #5 (fake Z in getCalendarFieldValue)   |
| Field config reference         | `tasks/date-handling/CLAUDE.md` — Config C                    |
