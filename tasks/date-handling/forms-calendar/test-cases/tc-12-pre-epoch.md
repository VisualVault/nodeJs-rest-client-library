# TC-12-pre-epoch — Config D, GFV Round-Trip at 1969, BRT: standard -3h drift; pre-epoch handled (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `1969-12-31`, BRT midnight — `1969-12-31T00:00:00-03:00` = `1969-12-31T03:00:00Z` UTC   |

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

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active
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
// Expected: ["DataField5"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                      | Expected Result                                            | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                      | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '1969-12-31T00:00:00')`                 | Field displays `12/31/1969 12:00 AM`                       | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"1969-12-31T00:00:00"`                                    | ☐   |
| 4   | Capture baseline GFV (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"1969-12-31T00:00:00"` — raw unchanged (correct behavior) | ☐   |
| 5   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                                   | ☐   |
| 6   | Capture post-trip display                   | —                                                                              | `12/31/1969 12:00 AM` — no drift (correct behavior)        | ☐   |
| 7   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"1969-12-31T00:00:00"` — no drift (correct behavior)      | ☐   |
| 8   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"1969-12-31T00:00:00"` — same as raw (correct behavior)   | ☐   |
| 9   | Compute drift (DevTools console)            | `new Date('1969-12-31T00:00:00') - new Date('1969-12-31T00:00:00')`            | `0` — no drift (correct behavior)                          | ☐   |
| 10  | Confirm browser timezone (DevTools console) | `new Date(1969, 11, 31, 0, 0, 0).toISOString()`                                | `"1969-12-31T03:00:00.000Z"` — confirms BRT active         | ☐   |

> Pre-epoch dates (before Jan 1 1970 00:00 UTC) have negative Unix timestamps. JavaScript `Date` handles them correctly. This test verifies that negative epoch values do not cause parsing failures or special behavior in VV's date handling. Standard Bug #5 drift applies.

---

## Fail Conditions

**FAIL-1 (Bug #5 -3h drift):** Step 7 returns `"1969-12-30T21:00:00"` instead of `"1969-12-31T00:00:00"`.

- Interpretation: Bug #5 active. Standard -3h drift crosses to Dec 30 1969. No special pre-epoch issue — same drift mechanism as any other date.

**FAIL-2 (Pre-epoch parsing failure):** Step 3 returns unexpected format or error instead of `"1969-12-31T00:00:00"`.

- Interpretation: VV's date handling may not support pre-1970 dates. Document the actual return value.

**FAIL-3 (Wrong timezone):** Step 10 does not return `"1969-12-31T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-4 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-5 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference              | Location                                                                    |
| ---------------------- | --------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-pre-epoch`                                            |
| Bug #5 analysis        | `analysis.md` — Bug #5: Inconsistent Developer API (fake Z in GFV)          |
| Opposite: far-future   | [tc-12-far-future.md](tc-12-far-future.md) — 2099 boundary                  |
| Year boundary          | [tc-12-year-boundary.md](tc-12-year-boundary.md) — Jan 1 2026 → Dec 31 2025 |
| Field config reference | `matrix.md` — Field Configurations table, Config D                          |
