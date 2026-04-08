# TC-4-A-isoT-BRT-reload — Config A, URL Param Save/Reload, BRT: Clean date-only value survives round-trip

## Environment Specs

| Parameter               | Required Value                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                              |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                     |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                              |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)              |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableQListener=true` |
| **Scenario**            | URL param `Field7=2026-03-15T00:00:00` → save → reload → verify value persists        |

## Preconditions

**P1 — Set system timezone to `America/Sao_Paulo`:**

macOS:

```bash
sudo systemsetup -settimezone America/Sao_Paulo
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT-0300"
```

**P4 — Open the TargetDateTest form with URL parameter:**

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=203734a0-5433-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939&Field7=2026-03-15T00%3A00%3A00
```

**P5 — Verify code path** (DevTools console):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false → V1 is active
```

## Test Steps

| #   | Action                        | Test Data                                                | Expected Result             | ✓   |
| --- | ----------------------------- | -------------------------------------------------------- | --------------------------- | --- |
| 1   | Complete setup                | See Preconditions P1–P5                                  | All checks pass             | ☐   |
| 2   | Capture pre-save raw value    | `VV.Form.VV.FormPartition.getValueObjectValue('Field7')` | `"2026-03-15"`              | ☐   |
| 3   | Save the form                 | Click Save button                                        | Form saves, DataID assigned | ☐   |
| 4   | Reload the page               | F5 or browser reload                                     | Form reloads from server    | ☐   |
| 5   | Capture post-reload raw value | `VV.Form.VV.FormPartition.getValueObjectValue('Field7')` | `"2026-03-15"`              | ☐   |
| 6   | Capture post-reload API value | `VV.Form.GetFieldValue('Field7')`                        | `"2026-03-15"`              | ☐   |

## Fail Conditions

**FAIL-1 (Value changed after reload):** Steps 5 or 6 return a different value than Step 2.

- Interpretation: The save/reload path modified the URL-param-sourced value. This would indicate a save-path or reload-path bug specific to enableQListener fields.

## Related

| Reference        | Location                                                                        |
| ---------------- | ------------------------------------------------------------------------------- |
| Matrix row       | `matrix.md` — row `4-A-isoT-BRT-reload`                                         |
| Pre-save sibling | `tc-4-A-isoT-BRT.md` — URL param input without save                             |
| Run history      | [`summaries/tc-4-A-isoT-BRT-reload.md`](../summaries/tc-4-A-isoT-BRT-reload.md) |
