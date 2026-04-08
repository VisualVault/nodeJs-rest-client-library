# TC-11-load-UTC0 — Config D, Cross-TZ Reload, BRT→UTC+0: zero drift; Bug #5 fake Z coincidentally correct

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Etc/GMT` — UTC+0, GMT. No DST (fixed offset).                                          |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | BRT-saved record reloaded in UTC+0 — stored `"2026-03-15T00:00:00"` should show 0 drift |

---

## Preconditions

**P1 — Set system timezone to `GMT`:**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

Windows (run as Administrator):

```bat
tzutil /s "UTC"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "UTC"
```

Linux:

```bash
sudo timedatectl set-timezone Etc/GMT
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0000
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the BRT-saved record** (DateTest-000080):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record (DateTest-000080) was saved from BRT (UTC-3) with Config D field set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"`.

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

| #   | Action                                      | Test Data                                                                      | Expected Result                                       | ✓   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                 | ☐   |
| 2   | Verify record loaded                        | Tab title or form header                                                       | Title contains `DateTest-000080`                      | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — preserved from BRT save     | ☐   |
| 4   | Capture GFV (DevTools console)              | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct (no transformation) | ☐   |
| 5   | Execute GFV round-trip (DevTools console)   | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error thrown                                       | ☐   |
| 6   | Capture post-trip raw value                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"` — 0 drift                     | ☐   |
| 7   | Capture post-trip GFV                       | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` — correct                     | ☐   |
| 8   | toISOString reference (DevTools console)    | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T00:00:00.000Z"` — confirms UTC+0         | ☐   |

> **Note:** At UTC+0, Bug #5 fake Z is coincidentally correct because local midnight = UTC midnight. The round-trip is stable not because Bug #5 is absent, but because the fake Z happens to match real UTC. Moving to any non-zero TZ would reveal the drift.

**Also capture Config A (Field7):** raw `"2026-03-15"`, api `"2026-03-15"` — date-only also preserved.

---

## Fail Conditions

**FAIL-1 (Drift despite UTC+0):** Step 6 differs from step 3.

- Interpretation: `normalizeCalValue` has a parsing issue beyond the fake Z. Would need deeper investigation into additional transforms.

**FAIL-2 (Wrong TZ):** Step 8 does not return `"2026-03-15T00:00:00.000Z"`.

- Interpretation: System timezone is not UTC+0. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference          | Location                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Matrix row         | `matrix.md` — row `11-load-UTC0`                                                             |
| 12-utc-0-control   | Same principle — Bug #5 invisible at UTC+0                                                   |
| 11-roundtrip-cross | [tc-11-roundtrip-cross.md](tc-11-roundtrip-cross.md) — contrast: +2:30h drift across IST+BRT |
| Bug #5 analysis    | `analysis/bug-5.md` — FORM-BUG-5: fake Z in GetFieldValue                                    |
