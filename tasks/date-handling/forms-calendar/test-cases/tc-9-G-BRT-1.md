# TC-9-G-BRT-1 — Config G, Round-Trip 1 trip, BRT: 0 drift — legacy DateTime GFV returns raw

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — legacy DateTime, round-trip stable (no bugs)               |

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
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField14"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                      | Expected Result                                      | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | Field displays `03/15/2026 12:00 AM`                 | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                              | ☐   |
| 4   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                             | ☐   |
| 5   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — unchanged, no drift (PASS) | ☐   |
| 6   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — same as raw                | ☐   |
| 7   | Compare raw before vs after                 | Step 3 raw vs Step 5 raw                                                       | Identical — `"2026-03-15T00:00:00"` (0 drift)        | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active   | ☐   |

> **Why Config G is stable**: `useLegacy=true` causes `getCalendarFieldValue()` to skip the non-legacy branch entirely — no UTC conversion, no fake Z. GFV returns the raw stored value directly. This means `SetFieldValue(GetFieldValue())` feeds back the exact same string, producing zero drift. Contrasts Config C (`useLegacy=false`, `ignoreTimezone=false`) where GFV returns a real UTC-converted value, but the round-trip is still stable because SFV correctly parses the UTC string back to the original local time.

---

## Fail Conditions

**FAIL-1 (Post-trip raw shifted — drift detected):** Step 5 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: Unexpected drift on a legacy DateTime field. Verify P6 returned DataField14 and that `useLegacy=true` is confirmed.

**FAIL-2 (Wrong timezone):** Step 8 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path is running. This test was designed for V1.

**FAIL-4 (Field not found):** P6 returns an empty array or unexpected field name.

- Interpretation: Field configuration mismatch. Verify form template is correct.

---

## Related

| Reference                             | Location                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Matrix row                            | `../matrix.md` — row `9-G-BRT-1`                                         |
| Run file                              | [`../runs/tc-9-G-BRT-1-run-1.md`](../runs/tc-9-G-BRT-1-run-1.md)         |
| Summary                               | [`../summaries/tc-9-G-BRT-1.md`](../summaries/tc-9-G-BRT-1.md)           |
| Config C comparison: 9-C-BRT-1        | [`tc-9-C-BRT-1.md`](tc-9-C-BRT-1.md) — non-legacy, real UTC GFV, 0 drift |
| Config H (legacy+ignoreTZ): 9-H-BRT-1 | [`tc-9-H-BRT-1.md`](tc-9-H-BRT-1.md) — legacy + ignoreTZ, also 0 drift   |
| Config D (Bug #5): 9-D-BRT-1          | [`tc-9-D-BRT-1.md`](tc-9-D-BRT-1.md) — non-legacy + ignoreTZ, drifts     |
| Field config reference                | `tasks/date-handling/CLAUDE.md` — Config G                               |
