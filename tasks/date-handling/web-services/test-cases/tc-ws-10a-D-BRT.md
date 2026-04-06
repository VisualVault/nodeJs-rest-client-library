# TC-WS-10A-D-BRT — Config D, postForms → Browser Verify, BRT: CB-8 + Bug #5, display OK via ignoreTZ

## Environment Specs

| Parameter          | Required Value                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Execution Mode** | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**     | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**  | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`                    |
| **Input**          | `"2026-03-15T14:30:00"`                                                                  |
| **Record**         | DateTest-001566 (DataID: `9b940223-b431-f111-ba23-0e3ceb11fc25`)                         |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**         | Freshdesk #124697                                                                        |

## Scenario

Config D (`enableTime=true`, `ignoreTimezone=true`) — the exact configuration from Freshdesk #124697. API stores `"2026-03-15T14:30:00Z"`. On first browser open, `ignoreTZ` flag preserves display of the original DB value (2:30 PM), but rawValue is already shifted to 11:30 AM (BRT offset). GFV adds fake Z to the shifted value (Bug #5).

This is the **ticket scenario** — WS-10C-D-BRT demonstrates the full mutation lifecycle.

## Test Steps

| #   | Action                                   | Expected Result                               |
| --- | ---------------------------------------- | --------------------------------------------- |
| 1   | Create record via `postForms` with input | API stores `"2026-03-15T14:30:00Z"`           |
| 2   | Open record in Forms browser (BRT)       | Field displays `03/15/2026 02:30 PM`          |
| 3   | Capture rawValue (getValueObjectValue)   | `"2026-03-15T11:30:00"` (shifted -3h)         |
| 4   | Capture GetFieldValue                    | `"2026-03-15T11:30:00.000Z"` (Bug #5: fake Z) |

## Expected Outcome

**FAIL** — CB-8 shifts rawValue by -3h. Bug #5 adds fake Z to the shifted value. Display appears correct (02:30 PM) due to `ignoreTZ`, but underlying data is already corrupted.

## Hypotheses

- **CB-8**: API Z normalization → Forms V1 UTC→local conversion on rawValue.
- **CB-11**: `ignoreTZ=true` preserves display but not rawValue — display shows original DB value, rawValue shifted.
- **Bug #5**: Fake Z appended to local shifted value in GFV.

## Related

| Reference              | Location                          |
| ---------------------- | --------------------------------- |
| Run history            | `../summaries/tc-ws-10a-D-BRT.md` |
| Batch run              | `../runs/ws-10-batch-run-1.md`    |
| Sibling: IST           | `tc-ws-10a-D-IST.md`              |
| Save-stabilize (D-BRT) | `tc-ws-10c-D-BRT.md`              |
| Ticket                 | Freshdesk #124697                 |
