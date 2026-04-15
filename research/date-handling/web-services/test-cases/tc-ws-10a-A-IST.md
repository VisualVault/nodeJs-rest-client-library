# TC-WS-10A-A-IST — Config A, postForms → Browser Verify, IST: date-only correct

## Environment Specs

| Parameter          | Required Value                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Execution Mode** | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**     | `Asia/Calcutta` — UTC+5:30 (IST)                                                         |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**  | Config A: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`                  |
| **Input**          | `"2026-03-15T14:30:00"` (time component ignored for date-only)                           |
| **Record**         | DateTest-001566 (DataID: `9b940223-b431-f111-ba23-0e3ceb11fc25`)                         |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**         | Freshdesk #124697                                                                        |

## Scenario

Same record as BRT variant. Config A is date-only — API stores `T00:00:00Z`. IST browser opens and displays the correct date. Date-only fields are immune to cross-layer time shift on display (Bug #7 only affects the save path).

## Test Steps

| #   | Action                                   | Expected Result                     |
| --- | ---------------------------------------- | ----------------------------------- |
| 1   | Create record via `postForms` with input | API stores `"2026-03-15T00:00:00Z"` |
| 2   | Open record in Forms browser (IST)       | Field displays `03/15/2026`         |
| 3   | Capture rawValue (getValueObjectValue)   | `"2026-03-15"`                      |
| 4   | Capture GetFieldValue                    | `"2026-03-15"`                      |

## Expected Outcome

**PASS** — Date-only correct in IST. Same as BRT — time component stripped on storage.

## Hypotheses

- **CB-8**: Not impactful for date-only — `T00:00:00Z` displays as same calendar date in IST (March 15 5:30 AM local).

## Related

| Reference    | Location                          |
| ------------ | --------------------------------- |
| Run history  | `../summaries/tc-ws-10a-A-IST.md` |
| Batch run    | `../runs/ws-10-batch-run-1.md`    |
| Sibling: BRT | `tc-ws-10a-A-BRT.md`              |
| Ticket       | Freshdesk #124697                 |
