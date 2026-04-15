# TC-7-D-isoNoZ — Config D, SetFieldValue ISO without Z, BRT: stored as-is (no shift); GFV adds fake Z (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (standard time year-round since 2019).  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | March 15, 2026, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

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

```
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
// Expected: ["DataField5"]
```

---

## Test Steps

| #   | Action                                           | Test Data                                                      | Expected Result                                        | ✓   |
| --- | ------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------ | --- |
| 1   | Complete setup                                   | See Preconditions P1–P6                                        | All P1–P6 checks pass                                  | ☐   |
| 2   | Set value via ISO-no-Z string (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')` | Field displays `03/15/2026 12:00 AM`                   | ☐   |
| 3   | Capture raw stored value (DevTools console)      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                | ☐   |
| 4   | Capture GetFieldValue (DevTools console)         | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — raw value, no transformation | ☐   |
| 5   | Confirm browser timezone (DevTools console)      | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active     | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #5 — GFV returns fake Z):** Step 4 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 active. GFV appends fake Z. Storage (Step 3) is correct — ISO without Z is the recommended input format for Config D.

**FAIL-2 (Wrong timezone):** Step 5 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active. Verify this test applies to V2 before continuing.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference               | Location                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Matrix row              | `../matrix.md` — row `7-D-isoNoZ`                                                        |
| Bug #5 analysis         | `../analysis.md` — Bug #5 (Inconsistent Developer API — fake Z in GFV)                   |
| Sibling: Date object    | [`tc-7-D-dateObj.md`](tc-7-D-dateObj.md)                                                 |
| Sibling: ISO+Z          | [`tc-7-D-isoZ.md`](tc-7-D-isoZ.md)                                                       |
| Sibling: date-only      | [`tc-7-D-dateOnly.md`](tc-7-D-dateOnly.md)                                               |
| Sibling: US format      | [`tc-7-D-usFormat.md`](tc-7-D-usFormat.md)                                               |
| Sibling: US format+time | [`tc-7-D-usFormatTime.md`](tc-7-D-usFormatTime.md)                                       |
| Sibling: epoch          | [`tc-7-D-epoch.md`](tc-7-D-epoch.md)                                                     |
| Field config reference  | `research/date-handling/CLAUDE.md` — Config D (`enableTime=true`, `ignoreTimezone=true`) |
