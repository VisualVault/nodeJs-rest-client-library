# TC-11-E-save-BRT-load-IST — Config E, Cross-TZ Reload, BRT→IST: legacy date-only preserved; no load corruption

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).             |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | BRT-saved record reloaded in IST — stored `"2026-03-15"` should be unchanged on reload   |

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
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the BRT-saved record** (DateTest-000080, Config E):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=bd05735a-f322-4ba5-9f49-d974c797489f&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from BRT (UTC-3) with Config E field set to `03/15/2026`. The stored value is `"2026-03-15"`. This test verifies legacy date-only strings survive cross-TZ reload. The matrix predicted FORM-BUG-7 on load, but legacy date-only also survives cross-TZ.

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field12"]
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify record loaded                        | Tab title or form header                                       | Title contains record identifier                   | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"` — preserved from BRT save           | ☐   |
| 4   | Capture GFV (DevTools console)              | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"` — date-only, no transformation      | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

---

## Fail Conditions

**FAIL-1 (Date shifted on load):** Step 3 returns `"2026-03-14"` instead of `"2026-03-15"`.

- Interpretation: `initCalendarValueV1` re-parsed the stored date-only string as IST local midnight, triggering FORM-BUG-7 on the legacy load path. This would disprove that legacy date-only fields are immune to cross-TZ load corruption.

**FAIL-2 (Wrong timezone):** Step 5 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config E flags.

---

## Related

| Reference               | Location                                                                    |
| ----------------------- | --------------------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `11-E-save-BRT-load-IST`                                  |
| Config A sibling        | [tc-11-A-save-BRT-load-IST.md](tc-11-A-save-BRT-load-IST.md) — same pattern |
| Config B sibling        | [tc-11-B-save-BRT-load-IST.md](tc-11-B-save-BRT-load-IST.md) — same pattern |
| Bug #7 analysis         | `analysis/overview.md` — FORM-BUG-7: date-only midnight parsing in UTC+     |
| Legacy characterization | `analysis/overview.md` — Appendix C: Legacy Config E-H Characterization     |
| Field config reference  | `matrix.md` — Field Configurations table, Config E                          |
