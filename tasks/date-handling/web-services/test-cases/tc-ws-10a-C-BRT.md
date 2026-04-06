# TC-WS-10A-C-BRT — Config C, postForms → Browser Verify, BRT: UTC→BRT shift -3h (CB-8)

## Environment Specs

| Parameter          | Required Value                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Execution Mode** | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**     | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**  | Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`                   |
| **Input**          | `"2026-03-15T14:30:00"`                                                                  |
| **Record**         | DateTest-001566 (DataID: `9b940223-b431-f111-ba23-0e3ceb11fc25`)                         |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**         | Freshdesk #124697                                                                        |

## Scenario

Config C (`enableTime=true`, `ignoreTimezone=false`) — API stores `"2026-03-15T14:30:00Z"` (Z appended). Forms V1 interprets Z as real UTC and converts to local time on load: 14:30 UTC → 11:30 AM BRT.

## Test Steps

| #   | Action                                   | Expected Result                             |
| --- | ---------------------------------------- | ------------------------------------------- |
| 1   | Create record via `postForms` with input | API stores `"2026-03-15T14:30:00Z"`         |
| 2   | Open record in Forms browser (BRT)       | Field displays `03/15/2026 11:30 AM`        |
| 3   | Capture rawValue (getValueObjectValue)   | `"2026-03-15T11:30:00"`                     |
| 4   | Capture GetFieldValue                    | `"2026-03-15T14:30:00.000Z"` (original UTC) |

## Expected Outcome

**FAIL** — CB-8: API Z normalization causes UTC→BRT shift (-3h). Display and rawValue show local time (11:30 AM), not the intended 2:30 PM. GFV preserves original UTC value.

## Hypotheses

- **CB-8**: API appends Z to `"2026-03-15T14:30:00"` → stored as UTC. Forms V1 converts UTC→local on load.

## Related

| Reference        | Location                          |
| ---------------- | --------------------------------- |
| Run history      | `../summaries/tc-ws-10a-C-BRT.md` |
| Batch run        | `../runs/ws-10-batch-run-1.md`    |
| Sibling: IST     | `tc-ws-10a-C-IST.md`              |
| WS-10C stabilize | `tc-ws-10c-C-BRT.md`              |
| Ticket           | Freshdesk #124697                 |
