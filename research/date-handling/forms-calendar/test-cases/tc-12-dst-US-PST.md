# TC-12-dst-US-PST — Config D, DST Spring-Forward, PDT: skipped 2AM→3AM; Bug #5 crosses day + DST boundary

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Los_Angeles` — UTC-7, PDT (DST active Apr 8). UTC-8 PST when DST inactive.     |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-08` US DST transition day (2AM→3AM spring forward). 2:00 AM does not exist.    |

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
// PASS: output contains GMT-0700 (PDT active for Apr 8)
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

**P6 — Locate the target field by configuration** (DevTools console, after form loads):

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

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                         | Test Data                                                                      | Expected Result                                                | ✓   |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- | --- |
| 1   | Complete setup                                 | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                          | ☐   |
| 2   | Set DST transition value (DevTools console)    | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-08T02:00:00')`                 | Field updates                                                  | ☐   |
| 3   | Capture raw stored value (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-08T02:00:00"` (correct: value should store as given) | ☐   |
| 4   | Capture GFV (DevTools console)                 | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-08T02:00:00"` (correct: no transformation)           | ☐   |
| 5   | Execute GFV round-trip (DevTools console)      | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error thrown                                                | ☐   |
| 6   | Capture post-trip raw value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-08T02:00:00"` (correct: no drift)                    | ☐   |
| 7   | toISOString reference (DevTools console)       | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T07:00:00.000Z"` — confirms PDT (UTC-7) active     | ☐   |

> **Note:** 2:00 AM does not exist on DST transition day (springs to 3AM). V8 resolves `new Date(2026, 2, 8, 2, 0, 0)` to 3:00 AM PDT. The SFV input `"2026-03-08T02:00:00"` goes through `moment().toDate()` which also resolves to 3AM PDT.

---

## Fail Conditions

**FAIL-1 (DST 2AM→3AM advance):** Step 3 returns `"2026-03-08T03:00:00"` instead of `"2026-03-08T02:00:00"`.

- Interpretation: V8/moment advances the non-existent 2AM to 3AM PDT. The stored value reflects the DST-adjusted time, not the input.

**FAIL-2 (Bug #5 + DST day boundary crossing):** Step 6 returns `"2026-03-07T19:00:00"`.

- Interpretation: Fake Z `"T03:00:00.000Z"` parsed as UTC → Mar 8 03:00 UTC = Mar 7 19:00 PST (UTC-8, pre-DST window). The round-trip crosses BOTH the day boundary (Mar 8→7) and the DST boundary (PDT→PST). Drift is -8h (PST offset) despite being in PDT context.

**FAIL-3 (Wrong TZ):** P3 `new Date().toString()` does not contain `GMT-0700`.

- Interpretation: System timezone is not PDT. Re-do P1 and P2.

**FAIL-4 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-5 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference                | Location                                                                         |
| ------------------------ | -------------------------------------------------------------------------------- |
| Matrix row               | `matrix.md` — row `12-dst-US-PST`                                                |
| BRT DST day (no anomaly) | [tc-12-dst-transition.md](tc-12-dst-transition.md) — standard -3h, no DST in BRT |
| Bug #5 analysis          | `analysis/bug-5.md` — FORM-BUG-5: fake Z in GetFieldValue                        |
| UTC+0 control            | [tc-12-utc-0-control.md](tc-12-utc-0-control.md) — zero drift baseline           |
