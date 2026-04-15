# TC-3-D-IST-BRT — Config D, Server Reload, IST→BRT: raw value TZ-invariant; GFV appends fake Z (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. No DST (Brazil abolished DST in 2019).               |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`  |
| **Scenario**            | IST-saved record reloaded in BRT — stored `"2026-03-15T00:00:00"` should be TZ-invariant |

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
// PASS: output contains GMT-0300
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the IST-saved record** (DateTest-000084 Rev 1):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=28e371b7-e4e2-456a-94ab-95105ad97d0e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from IST (UTC+5:30, 2026-04-01) with Config D field set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"`. This test verifies the value survives cross-TZ reload from IST to BRT.

**P5 — Verify code path** (DevTools console after form loads):

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
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField5"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                             | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                     | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify form loaded with saved data | Tab title shows record name + Rev                              | `DateTest-000084 Rev 1`                            | ☐   |
| 3   | Verify display after BRT reload    | Visually inspect the target field (identified in P6)           | `03/15/2026 12:00 AM`                              | ☐   |
| 4   | Capture raw stored value           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                            | ☐   |
| 5   | Capture GFV                        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"`                            | ☐   |
| 6   | Verify BRT timezone active         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Note on Bug #5**: Step 5 Expected shows correct/intended behavior — GFV should return the raw stored value unchanged. Bug #5 causes `getCalendarFieldValue()` to append a fake `[Z]` suffix for Config D fields, producing `"2026-03-15T00:00:00.000Z"` instead. This misrepresents local midnight as UTC midnight. If a developer passes this value to `SetFieldValue()` in BRT, it will be parsed as UTC and shifted by -3h, causing progressive drift. See FAIL-3.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. The test cannot proceed because the reload behavior depends on the local timezone. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may produce different results for the form load path. Verify the test applies to V2 before continuing.

**FAIL-3 (Bug #5 — GFV appends fake Z):**
Step 5 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`. The `.000Z` suffix is appended by `getCalendarFieldValue()` (line ~104114) which uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` for Config D fields (`enableTime=true && ignoreTimezone=true && !useLegacy`). This formats the stored local time with a literal Z without timezone conversion — the hours remain `00:00:00`, making the Z a false UTC claim. Expected shows correct behavior (`"2026-03-15T00:00:00"`); the buggy system produces `"2026-03-15T00:00:00.000Z"`.

- Interpretation: Bug #5 confirmed on BRT reload of IST-saved record. The raw stored value is correct (`"2026-03-15T00:00:00"` — TZ-invariant, unchanged from IST save), but any code reading via `GetFieldValue()` receives the fake Z. A `SetFieldValue(GetFieldValue())` round-trip in BRT will cause -3h drift per trip (~8 trips = full day lost). Bug #5 is TZ-invariant: the fake Z appears regardless of whether the reader is in IST, BRT, or UTC.

**FAIL-4 (Raw value shifts on reload):**
Step 4 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: The server reload path is transforming the stored value. This would indicate a bug in `initCalendarValueV1` or `parseDateString` for DateTime strings with `ignoreTimezone=true`. The stored value should pass through unchanged since Config D suppresses offset conversion.

**FAIL-5 (Display shows wrong date or time):**
Step 3 shows a date other than `03/15/2026` or a time other than `12:00 AM`.

- Interpretation: The display component is misinterpreting the stored local time string on cross-TZ reload. With `ignoreTimezone=true`, the display should be identical regardless of the reader's timezone.

**FAIL-6 (Wrong BRT offset in isoRef):**
Step 6 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: BRT is not active in the browser's JS engine. The timezone change did not take effect. Abort and re-check P1–P2.

## Related

| Reference                 | Location                                                        |
| ------------------------- | --------------------------------------------------------------- |
| Matrix row                | `../matrix.md` — row `3-D-IST-BRT`                              |
| Results index             | `../results.md § Session 2026-04-01 (BRT — IST→BRT reload)`     |
| Bug #5 analysis           | `../analysis.md` — Bug #5 (Inconsistent Developer API — fake Z) |
| Bug #6 analysis           | `../analysis.md` — Bug #6 (Invalid Date for empty Config D)     |
| Sibling: BRT→IST Config D | [tc-3-D-BRT-IST.md](tc-3-D-BRT-IST.md)                          |
| Sibling: same-TZ BRT-BRT  | [tc-3-D-BRT-BRT.md](tc-3-D-BRT-BRT.md)                          |
| Sibling: same-TZ Config A | [tc-3-A-BRT-BRT.md](tc-3-A-BRT-BRT.md)                          |
| Sibling: BRT→IST Config A | [tc-3-A-BRT-IST.md](tc-3-A-BRT-IST.md)                          |
| Round-trip drift tests    | matrix.md — rows `9-D-BRT-*`                                    |
| Field config reference    | `../../CLAUDE.md` — Test Form Fields table                      |
