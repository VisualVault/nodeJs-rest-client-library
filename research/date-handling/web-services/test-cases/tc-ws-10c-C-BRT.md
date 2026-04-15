# TC-WS-10C-C-BRT — Config C, Save-and-Stabilize, BRT: CB-8 shift committed on save, stable afterward

## Environment Specs

| Parameter           | Required Value                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Execution Mode**  | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**   | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**      | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Code Path**       | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**   | Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`                   |
| **Input**           | `"2026-03-15T14:30:00"`                                                                  |
| **Record (source)** | DateTest-001568 (DataID: `735ca12d-b431-f111-ba23-0e3ceb11fc25`)                         |
| **Record (saved)**  | DataID: `ffc087e3-4a34-4ab9-9d2d-fdcd61cf2cdf`                                           |
| **VV Environment**  | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**          | Freshdesk #124697                                                                        |

## Scenario

WS-10C tests save-and-stabilize: open an API-created record in the browser, save it, reopen, and check if the value mutates further. Three snapshots are captured to measure initial shift, post-save mutation, and stability.

Config C: the CB-8 shift (-3h) is visible immediately on first open. After save+reopen, the shifted value persists — no further mutation. The shift is "committed" by the first save.

## Test Steps

| #   | Action                           | Expected Result                                                  |
| --- | -------------------------------- | ---------------------------------------------------------------- |
| 1   | Open API-created record in Forms | **Snapshot 1**: display `03/15/2026 11:30 AM`, rawValue `T11:30` |
| 2   | Save the form                    | Form saves successfully                                          |
| 3   | Reopen the saved record          | **Snapshot 2**: display `03/15/2026 11:30 AM`, rawValue `T11:30` |
| 4   | Compare Snapshot 1 vs 2          | `mutatedOnFirstSave: false` (rawValue already shifted on load)   |
| 5   | Verify stability (reopen again)  | **Snapshot 3**: identical to Snapshot 2                          |

## Expected Snapshots

| Snapshot | Display               | rawValue                | GFV                          |
| -------- | --------------------- | ----------------------- | ---------------------------- |
| 1        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00.000Z"` |
| 2        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00.000Z"` |
| 3        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00.000Z"` |

## Expected Outcome

**FAIL** — CB-8 shift committed on save. `mutatedOnFirstSave: false` (rawValue was already shifted on load). `stableAfterFirstSave: true` (no further drift after save).

## Hypotheses

- **CB-8**: API Z normalization causes initial shift; save commits the shifted value.

## Related

| Reference      | Location                          |
| -------------- | --------------------------------- |
| Run history    | `../summaries/tc-ws-10c-C-BRT.md` |
| Batch run      | `../runs/ws-10-batch-run-1.md`    |
| WS-10A (C-BRT) | `tc-ws-10a-C-BRT.md`              |
| Ticket         | Freshdesk #124697                 |
