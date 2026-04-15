# TC-WS-10C-D-BRT — Config D, Save-and-Stabilize, BRT: THE TICKET SCENARIO — display mutation on save+reopen

## Environment Specs

| Parameter           | Required Value                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Execution Mode**  | Hybrid: `run-ws-test.js` (API create via `postForms`) + `verify-ws10-browser.js` (Forms) |
| **API Server TZ**   | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Browser TZ**      | `America/Sao_Paulo` — UTC-3 (BRT)                                                        |
| **Code Path**       | V1 — `useUpdatedCalendarValueLogic = false`                                              |
| **Target Config**   | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`                    |
| **Input**           | `"2026-03-15T14:30:00"`                                                                  |
| **Record (source)** | DateTest-001568 (DataID: `735ca12d-b431-f111-ba23-0e3ceb11fc25`)                         |
| **Record (saved)**  | DataID: `ffc087e3-4a34-4ab9-9d2d-fdcd61cf2cdf`                                           |
| **VV Environment**  | vvdemo — EmanuelJofre/Main                                                               |
| **Ticket**          | Freshdesk #124697                                                                        |

## Scenario

**This is the exact scenario from Freshdesk ticket #124697.** Config D (`enableTime=true`, `ignoreTimezone=true`) — the customer's configuration.

On first open after API creation:

- Display shows `02:30 PM` (correct — `ignoreTZ` preserves the original DB value for display)
- rawValue is already shifted to `T11:30:00` (-3h BRT offset)

After save+reopen:

- Display changes to `11:30 AM` — the shifted value is now the DB value
- rawValue stays `T11:30:00` (no further shift)

**The key insight**: `ignoreTZ` preserves display of the ORIGINAL DB value on first load, masking the underlying shift. But save commits the shifted rawValue as the new DB value. On reopen, `ignoreTZ` now shows the NEW (shifted) DB value — revealing the mutation.

## Test Steps

| #   | Action                           | Expected Result                                              |
| --- | -------------------------------- | ------------------------------------------------------------ |
| 1   | Open API-created record in Forms | **Snapshot 1**: display `02:30 PM`, rawValue `T11:30:00`     |
| 2   | Save the form                    | Form saves successfully                                      |
| 3   | Reopen the saved record          | **Snapshot 2**: display `11:30 AM`, rawValue `T11:30:00`     |
| 4   | Compare Snapshot 1 vs 2          | `mutatedOnFirstSave: false` (rawValue same, DISPLAY changed) |
| 5   | Verify stability (reopen again)  | **Snapshot 3**: identical to Snapshot 2                      |

## Expected Snapshots

| Snapshot | Display               | rawValue                | GFV                          |
| -------- | --------------------- | ----------------------- | ---------------------------- |
| 1        | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"` | `"2026-03-15T11:30:00.000Z"` |
| 2        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T11:30:00.000Z"` |
| 3        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T11:30:00.000Z"` |

## Expected Outcome

**FAIL** — EXACTLY matches ticket #124697. Display shows original time on first open (02:30 PM), but save+reopen shows shifted time (11:30 AM). The `ignoreTZ` flag masks the mutation until save commits it.

`mutatedOnFirstSave: false` (rawValue was already shifted on load — the save didn't change rawValue, but it changed the DB value that `ignoreTZ` reads for display).
`stableAfterFirstSave: true` (no further drift after first save).

## Hypotheses

- **CB-8**: API Z normalization causes initial rawValue shift.
- **CB-11**: `ignoreTZ=true` preserves display of DB value, masking the shift until save.
- **Bug #5**: Fake Z on shifted value in GFV.
- **Freshdesk #124697**: This test reproduces the exact customer-reported behavior.

## Related

| Reference      | Location                          |
| -------------- | --------------------------------- |
| Run history    | `../summaries/tc-ws-10c-D-BRT.md` |
| Batch run      | `../runs/ws-10-batch-run-1.md`    |
| WS-10A (D-BRT) | `tc-ws-10a-D-BRT.md`              |
| WS-10B (D-BRT) | `tc-ws-10b-D-BRT.md`              |
| Ticket         | Freshdesk #124697                 |
