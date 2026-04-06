# TC-WS-10A-H-IST — Config H, postForms → Browser Verify, IST: CB-8 like D minus fake Z

## Environment Specs

| Parameter          | Required Value                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Execution Mode** | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**     | `Asia/Calcutta` — UTC+5:30 (IST)                                                         |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**  | Config H: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`                     |
| **Input**          | `"2026-03-15T14:30:00"`                                                                  |
| **Record**         | DateTest-001566 (DataID: `9b940223-b431-f111-ba23-0e3ceb11fc25`)                         |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**         | Freshdesk #124697                                                                        |

## Scenario

Config H in IST — legacy version of Config D. Same CB-8 shift (+5:30h), display preserved by ignoreTZ. Legacy code path does not add Bug #5 fake Z.

## Test Steps

| #   | Action                                   | Expected Result                              |
| --- | ---------------------------------------- | -------------------------------------------- |
| 1   | Create record via `postForms` with input | API stores `"2026-03-15T14:30:00Z"`          |
| 2   | Open record in Forms browser (IST)       | Field displays `03/15/2026 02:30 PM`         |
| 3   | Capture rawValue (getValueObjectValue)   | `"2026-03-15T20:00:00"` (shifted +5:30h)     |
| 4   | Capture GetFieldValue                    | `"2026-03-15T20:00:00"` (no fake Z — legacy) |

## Expected Outcome

**FAIL** — CB-8 shifts rawValue by +5:30h. Display preserved by ignoreTZ. No fake Z (legacy path).

## Hypotheses

- **CB-8**: API Z normalization → Forms V1 UTC→IST conversion.
- **CB-11**: `ignoreTZ=true` preserves display but not rawValue.

## Related

| Reference      | Location                          |
| -------------- | --------------------------------- |
| Run history    | `../summaries/tc-ws-10a-H-IST.md` |
| Batch run      | `../runs/ws-10-batch-run-1.md`    |
| Sibling: BRT   | `tc-ws-10a-H-BRT.md`              |
| Compare: D-IST | `tc-ws-10a-D-IST.md`              |
| Ticket         | Freshdesk #124697                 |
