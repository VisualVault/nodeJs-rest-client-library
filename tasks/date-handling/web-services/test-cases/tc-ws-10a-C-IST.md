# TC-WS-10A-C-IST — Config C, postForms → Browser Verify, IST: UTC→IST shift +5:30h (CB-8)

## Environment Specs

| Parameter          | Required Value                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Execution Mode** | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**     | `Asia/Calcutta` — UTC+5:30 (IST)                                                         |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**  | Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`                   |
| **Input**          | `"2026-03-15T14:30:00"`                                                                  |
| **Record**         | DateTest-001566 (DataID: `9b940223-b431-f111-ba23-0e3ceb11fc25`)                         |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**         | Freshdesk #124697                                                                        |

## Scenario

Config C in IST — API stores `"2026-03-15T14:30:00Z"`. Forms V1 interprets Z as real UTC and converts to IST: 14:30 UTC → 8:00 PM IST (+5:30h shift). Opposite direction from BRT.

## Test Steps

| #   | Action                                   | Expected Result                             |
| --- | ---------------------------------------- | ------------------------------------------- |
| 1   | Create record via `postForms` with input | API stores `"2026-03-15T14:30:00Z"`         |
| 2   | Open record in Forms browser (IST)       | Field displays `03/15/2026 08:00 PM`        |
| 3   | Capture rawValue (getValueObjectValue)   | `"2026-03-15T20:00:00"`                     |
| 4   | Capture GetFieldValue                    | `"2026-03-15T14:30:00.000Z"` (original UTC) |

## Expected Outcome

**FAIL** — CB-8: UTC→IST shift (+5:30h). Display shows 8:00 PM instead of intended 2:30 PM. GFV preserves original UTC.

## Hypotheses

- **CB-8**: API Z normalization → Forms V1 UTC→IST conversion. Shift direction reversed vs BRT (+5:30 vs -3).

## Related

| Reference    | Location                          |
| ------------ | --------------------------------- |
| Run history  | `../summaries/tc-ws-10a-C-IST.md` |
| Batch run    | `../runs/ws-10-batch-run-1.md`    |
| Sibling: BRT | `tc-ws-10a-C-BRT.md`              |
| Ticket       | Freshdesk #124697                 |
