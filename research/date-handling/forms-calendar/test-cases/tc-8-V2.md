# TC-8-V2 — V2 Code Path, GetFieldValue, IST: raw value unchanged; Bug #5 absent under V2

## Environment Specs

| Parameter               | Required Value                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                                                                         |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST.                                                                                                                         |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                                                                         |
| **VV Code Path**        | **V2** — `useUpdatedCalendarValueLogic = true` (activated manually via console)                                                                                  |
| **Target Field Config** | Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) and Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) — both tested |
| **Scenario**            | `2026-03-15T00:00:00`, IST — values set under V1, then GFV read under V2                                                                                         |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

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

**P4 — Open the DateTest form template** (creates a fresh instance):

```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before proceeding.

**P5 — Verify V1 is initially active** (run in DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active (values will be set under V1 first)
```

**P6 — Locate the target fields** (run in DevTools console):

```javascript
// Config C field
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
// Expected: ["Field6"]

// Config D field
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

---

## Test Steps

| #   | Action                                             | Test Data                                                           | Expected Result                                             | ✓   |
| --- | -------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- | --- |
| 1   | Complete setup                                     | See Preconditions P1–P6                                             | All P1–P6 checks pass, V1 active                            | ☐   |
| 2   | Set Config C value under V1 (DevTools console)     | `VV.Form.SetFieldValue('<CONFIG_C_FIELD>', '2026-03-15T00:00:00')`  | Field displays `03/15/2026 12:00 AM`                        | ☐   |
| 3   | Set Config D value under V1 (DevTools console)     | `VV.Form.SetFieldValue('<CONFIG_D_FIELD>', '2026-03-15T00:00:00')`  | Field displays `03/15/2026 12:00 AM`                        | ☐   |
| 4   | Baseline: GFV Config C under V1 (DevTools console) | `VV.Form.GetFieldValue('<CONFIG_C_FIELD>')`                         | `"2026-03-14T18:30:00.000Z"` — real UTC from IST            | ☐   |
| 5   | Baseline: GFV Config D under V1 (DevTools console) | `VV.Form.GetFieldValue('<CONFIG_D_FIELD>')`                         | `"2026-03-15T00:00:00"` — raw value, no fake Z              | ☐   |
| 6   | Activate V2 code path (DevTools console)           | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic = true`  | Returns `true`                                              | ☐   |
| 7   | GFV Config C under V2 (DevTools console)           | `VV.Form.GetFieldValue('<CONFIG_C_FIELD>')`                         | `"2026-03-15T00:00:00"` — raw value unchanged (no UTC conv) | ☐   |
| 8   | GFV Config D under V2 (DevTools console)           | `VV.Form.GetFieldValue('<CONFIG_D_FIELD>')`                         | `"2026-03-15T00:00:00"` — raw value unchanged (no fake Z)   | ☐   |
| 9   | Restore V1 (DevTools console)                      | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic = false` | Returns `false`                                             | ☐   |
| 10  | Confirm browser timezone (DevTools console)        | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                      | `"2026-03-14T18:30:00.000Z"` — confirms IST active          | ☐   |

> Steps 4–5 establish V1 baselines: Config C returns real UTC, Config D returns raw (Bug #5 expected in BRT/IST but step 5 shows raw because the Expected reflects correct behavior). Steps 7–8 show V2 behavior: both configs return raw value unchanged. V2 bypasses the entire `getCalendarFieldValue()` transformation — no UTC conversion (Config C), no fake Z (Config D). IST chosen to maximize the observable difference between V1 and V2 for Config C.

> **Note on step 5**: The Expected Result shows correct behavior (`"2026-03-15T00:00:00"`). Bug #5 produces `"2026-03-15T00:00:00.000Z"` — documented in FAIL-1.

---

## Fail Conditions

**FAIL-1 (Bug #5 in V1 baseline — Config D):**
Step 5 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 confirmed in V1 for Config D. Expected behavior documented; the fake Z is the known bug. This failure is expected and confirms the V1 bug that V2 should resolve.

**FAIL-2 (V2 does not return raw — Config C):**
Step 7 returns `"2026-03-14T18:30:00.000Z"` (UTC) instead of `"2026-03-15T00:00:00"` (raw).

- Interpretation: V2 is still applying UTC conversion for Config C. The V2 GFV path should return raw value unchanged.

**FAIL-3 (V2 does not return raw — Config D):**
Step 8 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: V2 still applies Bug #5 fake Z. V2 should bypass the entire non-legacy GFV branch.

**FAIL-4 (Cannot activate V2):**
Step 6 returns `false` or the property is read-only.

- Interpretation: The flag cannot be set via console. Alternative: open the form with `?ObjectID=` URL parameter to trigger V2 via the natural activation path.

**FAIL-5 (Wrong timezone):**
Step 10 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

---

## Related

| Reference                    | Location                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Matrix row                   | `../matrix.md` — row `8-V2`                                                             |
| V1/V2 code path docs         | `research/date-handling/CLAUDE.md` — V1 vs V2 Code Path section                         |
| Bug #5                       | `../analysis.md` — Bug #5: Fake [Z] in GetFieldValue                                    |
| Config C V1 comparison (IST) | [`tc-8-C-IST.md`](tc-8-C-IST.md) — real UTC under V1                                    |
| Config D V1 comparison (IST) | [`tc-8-D-IST.md`](tc-8-D-IST.md) — fake Z under V1                                      |
| Config H comparison          | [`tc-8-H-BRT.md`](tc-8-H-BRT.md) — useLegacy achieves same result as V2 (raw unchanged) |
