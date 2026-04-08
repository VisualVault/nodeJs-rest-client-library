# TC-12-empty-Config-A — Config A, GetFieldValue on empty field, BRT: returns empty string; Bug #6 absent

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                         |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | Empty Config A field — no date set, verifying Bug #6 scope                                |

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field7"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify field is empty (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `""`                                               | ☐   |
| 3   | Capture GetFieldValue (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `""` — empty string (correct behavior)             | ☐   |
| 4   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> Config A (`enableTime=false`) uses a different branch in `getCalendarFieldValue()` that does not call `moment().format()` or `new Date().toISOString()` on empty values. This test confirms Bug #6 is limited to `enableTime=true` configs.

---

## Fail Conditions

**FAIL-1 (Bug #6 unexpectedly present):** Step 3 returns anything other than `""` (e.g., `"Invalid Date"` or throws).

- Interpretation: Bug #6 scope wider than expected — affects Config A too. Would require re-assessment of Bug #6 root cause, which was believed to be `enableTime=true`-only.

**FAIL-2 (Wrong timezone):** Step 4 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config A flags.

---

## Related

| Reference              | Location                                                                         |
| ---------------------- | -------------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-empty-Config-A`                                            |
| Bug #6 analysis        | `analysis/overview.md` — FORM-BUG-6: Empty Field Returns Truthy "Invalid Date"   |
| Config D empty sibling | [tc-12-empty-value.md](tc-12-empty-value.md) — Config D returns `"Invalid Date"` |
| Config C empty sibling | [tc-12-empty-Config-C.md](tc-12-empty-Config-C.md) — Config C throws RangeError  |
| Cat 8 sibling          | [tc-8-A-empty.md](tc-8-A-empty.md) — same test in Category 8                     |
| Field config reference | `matrix.md` — Field Configurations table, Config A                               |
