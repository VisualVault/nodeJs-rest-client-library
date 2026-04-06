# TC-WS-10A-D-IST — Config D, postForms → Browser Verify, IST: CB-8 + Bug #5, display OK via ignoreTZ

## Environment Specs

| Parameter          | Required Value                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Execution Mode** | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**     | `Asia/Calcutta` — UTC+5:30 (IST)                                                         |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**  | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`                    |
| **Input**          | `"2026-03-15T14:30:00"`                                                                  |
| **Record**         | DateTest-001566 (DataID: `9b940223-b431-f111-ba23-0e3ceb11fc25`)                         |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**         | Freshdesk #124697                                                                        |

## Scenario

Config D in IST — same as BRT variant but with +5:30h shift instead of -3h. Display shows original 2:30 PM (ignoreTZ), but rawValue shifted to 8:00 PM. GFV adds fake Z to the shifted value (Bug #5).

## Test Steps

| #   | Action                                   | Expected Result                               |
| --- | ---------------------------------------- | --------------------------------------------- |
| 1   | Create record via `postForms` with input | API stores `"2026-03-15T14:30:00Z"`           |
| 2   | Open record in Forms browser (IST)       | Field displays `03/15/2026 02:30 PM`          |
| 3   | Capture rawValue (getValueObjectValue)   | `"2026-03-15T20:00:00"` (shifted +5:30h)      |
| 4   | Capture GetFieldValue                    | `"2026-03-15T20:00:00.000Z"` (Bug #5: fake Z) |

## Expected Outcome

**FAIL** — CB-8 shifts rawValue by +5:30h. Bug #5 adds fake Z to shifted value. Display appears correct due to `ignoreTZ`.

## Hypotheses

- **CB-8**: API Z normalization → Forms V1 UTC→IST conversion on rawValue.
- **CB-11**: `ignoreTZ=true` preserves display but not rawValue.
- **Bug #5**: Fake Z on shifted local value.

## Related

| Reference              | Location                          |
| ---------------------- | --------------------------------- |
| Run history            | `../summaries/tc-ws-10a-D-IST.md` |
| Batch run              | `../runs/ws-10-batch-run-1.md`    |
| Sibling: BRT           | `tc-ws-10a-D-BRT.md`              |
| Save-stabilize (D-BRT) | `tc-ws-10c-D-BRT.md`              |
| Ticket                 | Freshdesk #124697                 |
