# TC-WS-10A-H-BRT — Config H, postForms → Browser Verify, BRT: CB-8 like D minus fake Z

## Environment Specs

| Parameter          | Required Value                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Execution Mode** | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**     | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**  | Config H: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`                     |
| **Input**          | `"2026-03-15T14:30:00"`                                                                  |
| **Record**         | DateTest-001566 (DataID: `9b940223-b431-f111-ba23-0e3ceb11fc25`)                         |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**         | Freshdesk #124697                                                                        |

## Scenario

Config H (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`) — legacy version of Config D. Same CB-8 shift behavior, but legacy code path does not add Bug #5 fake Z to GFV return.

## Test Steps

| #   | Action                                   | Expected Result                              |
| --- | ---------------------------------------- | -------------------------------------------- |
| 1   | Create record via `postForms` with input | API stores `"2026-03-15T14:30:00Z"`          |
| 2   | Open record in Forms browser (BRT)       | Field displays `03/15/2026 02:30 PM`         |
| 3   | Capture rawValue (getValueObjectValue)   | `"2026-03-15T11:30:00"` (shifted -3h)        |
| 4   | Capture GetFieldValue                    | `"2026-03-15T11:30:00"` (no fake Z — legacy) |

## Expected Outcome

**FAIL** — CB-8 shifts rawValue by -3h. Display preserved by ignoreTZ. Unlike Config D, legacy path returns GFV without fake Z suffix.

## Hypotheses

- **CB-8**: API Z normalization → Forms V1 UTC→local conversion on rawValue.
- **CB-11**: `ignoreTZ=true` preserves display but not rawValue.

## Related

| Reference      | Location                          |
| -------------- | --------------------------------- |
| Run history    | `../summaries/tc-ws-10a-H-BRT.md` |
| Batch run      | `../runs/ws-10-batch-run-1.md`    |
| Sibling: IST   | `tc-ws-10a-H-IST.md`              |
| Compare: D-BRT | `tc-ws-10a-D-BRT.md`              |
| Ticket         | Freshdesk #124697                 |
