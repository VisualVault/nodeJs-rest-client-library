# TC-WS-10A-A-BRT — Config A, postForms → Browser Verify, BRT: date-only correct

## Environment Specs

| Parameter          | Required Value                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Execution Mode** | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**     | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**  | Config A: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`                  |
| **Input**          | `"2026-03-15T14:30:00"` (time component ignored for date-only)                           |
| **Record**         | DateTest-001566 (DataID: `9b940223-b431-f111-ba23-0e3ceb11fc25`)                         |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**         | Freshdesk #124697                                                                        |

## Scenario

WS-10 tests cross-layer behavior from Freshdesk #124697: records created via `postForms` API may show time mutation when opened in Forms browser UI. WS-10A compares API-stored values against browser-displayed values. The `forminstance/` comparison (WS-10B) is BLOCKED on vvdemo (500 error).

Config A is date-only — the time component of the input is dropped by the API, storing `T00:00:00Z`.

## Test Steps

| #   | Action                                   | Expected Result                     |
| --- | ---------------------------------------- | ----------------------------------- |
| 1   | Create record via `postForms` with input | API stores `"2026-03-15T00:00:00Z"` |
| 2   | Open record in Forms browser (BRT)       | Field displays `03/15/2026`         |
| 3   | Capture rawValue (getValueObjectValue)   | `"2026-03-15"`                      |
| 4   | Capture GetFieldValue                    | `"2026-03-15"`                      |

## Expected Outcome

**PASS** — Date-only config strips time on API storage; browser displays correct date regardless of TZ.

## Hypotheses

- **CB-8** (API Z normalization): Not impactful for date-only — time component is `T00:00:00Z`, which resolves to the same calendar date in BRT (UTC-3).

## Related

| Reference       | Location                                              |
| --------------- | ----------------------------------------------------- |
| Run history     | `../summaries/tc-ws-10a-A-BRT.md`                     |
| Batch run       | `../runs/ws-10-batch-run-1.md`                        |
| Sibling: IST    | `tc-ws-10a-A-IST.md`                                  |
| WS-4 comparison | `tc-ws-4-A-BRT.md` (same pattern, different endpoint) |
| Ticket          | Freshdesk #124697                                     |
