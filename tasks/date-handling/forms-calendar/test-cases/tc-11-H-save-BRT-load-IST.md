# TC-11-H-save-BRT-load-IST — Config H, Cross-TZ Reload, BRT→IST: raw preserved; legacy bypasses FORM-BUG-5

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).              |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`    |
| **Scenario**            | BRT-saved record reloaded in IST — stored `"2026-03-15T00:00:00"` raw should be preserved |

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

**P4 — Open the BRT-saved record** (Config H):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=064e120d-a956-4515-b7f3-8783984b4f71&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from BRT (UTC-3) with Config H field set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"`. This test verifies the legacy DateTime+ignoreTZ string survives cross-TZ reload. Config H is the `useLegacy=true` counterpart to Config D — both have `enableTime=true && ignoreTimezone=true`, but H's legacy path bypasses the FORM-BUG-5 fake Z that D exhibits.

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
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field13"]
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                         | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                                   | ☐   |
| 2   | Verify record loaded                        | Tab title or form header                                       | Title contains record identifier                        | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"` — preserved from BRT save       | ☐   |
| 4   | Capture GFV (DevTools console)              | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — legacy returns raw, no fake Z | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active      | ☐   |

---

## Fail Conditions

**FAIL-1 (Raw value corrupted):** Step 3 returns anything other than `"2026-03-15T00:00:00"`.

- Interpretation: The legacy form load path modified the stored DateTime value. This would contradict the 11-H-BRT-roundtrip finding that legacy DateTime values survive without drift.

**FAIL-2 (Legacy adds fake Z):** Step 4 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: `useLegacy=true` did not bypass `getCalendarFieldValue`'s fake Z logic. This would mean FORM-BUG-5 affects legacy configs too — contradicting all prior legacy testing.

**FAIL-3 (Wrong timezone):** Step 5 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-4 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-5 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config H flags.

---

## Related

| Reference              | Location                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `11-H-save-BRT-load-IST`                                            |
| Config G sibling       | [tc-11-G-save-BRT-load-IST.md](tc-11-G-save-BRT-load-IST.md) — legacy DateTime, PASS  |
| Config D counterpart   | [tc-11-D-save-BRT-load-IST.md](tc-11-D-save-BRT-load-IST.md) — non-legacy, FORM-BUG-5 |
| Config H roundtrip     | [tc-11-H-BRT-roundtrip.md](tc-11-H-BRT-roundtrip.md) — 0 drift after 3 trips          |
| Bug #5 analysis        | `analysis/overview.md` — FORM-BUG-5: useLegacy=true bypasses fake Z                   |
| Field config reference | `matrix.md` — Field Configurations table, Config H                                    |
