# WS-10 — Batch Run 1 | 2026-04-06 | BRT+IST | 2 PASS, 6 FAIL, 2 BLOCKED, 2 FAIL (stabilize)

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Date           | 2026-04-06                                                               |
| Execution Mode | Hybrid: `run-ws-test.js` (API create) + `verify-ws10-browser.js` (Forms) |
| API Server TZ  | `America/Sao_Paulo` — UTC-3 (BRT)                                        |
| Browser TZs    | `America/Sao_Paulo` (BRT), `Asia/Calcutta` (IST)                         |
| Code Path      | V1 (`useUpdatedCalendarValueLogic=false`)                                |
| VV Environment | vvdemo — EmanuelJofre/Main                                               |
| Ticket         | Freshdesk #124697                                                        |

## API Step — Record Creation

| Record          | DataID                                 | Configs | Input Sent              | API Stored               |
| --------------- | -------------------------------------- | :-----: | ----------------------- | ------------------------ |
| DateTest-001566 | `9b940223-b431-f111-ba23-0e3ceb11fc25` | A,C,D,H | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |
| DateTest-001568 | `735ca12d-b431-f111-ba23-0e3ceb11fc25` |   C,D   | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |

> Config A on DateTest-001566: API stored `"2026-03-15T00:00:00Z"` (time component dropped for date-only).

## WS-10A — Browser Step: postForms → Forms Verification

### BRT (UTC-3)

| ID           | Config | API Stored               | Display               | rawValue                | GFV                          | Status |
| ------------ | :----: | ------------------------ | --------------------- | ----------------------- | ---------------------------- | :----: |
| ws-10a-A-BRT |   A    | `"2026-03-15T00:00:00Z"` | `03/15/2026`          | `"2026-03-15"`          | `"2026-03-15"`               |  PASS  |
| ws-10a-C-BRT |   C    | `"2026-03-15T14:30:00Z"` | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00.000Z"` |  FAIL  |
| ws-10a-D-BRT |   D    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"` | `"2026-03-15T11:30:00.000Z"` |  FAIL  |
| ws-10a-H-BRT |   H    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"` | `"2026-03-15T11:30:00"`      |  FAIL  |

### IST (UTC+5:30)

| ID           | Config | API Stored               | Display               | rawValue                | GFV                          | Status |
| ------------ | :----: | ------------------------ | --------------------- | ----------------------- | ---------------------------- | :----: |
| ws-10a-A-IST |   A    | `"2026-03-15T00:00:00Z"` | `03/15/2026`          | `"2026-03-15"`          | `"2026-03-15"`               |  PASS  |
| ws-10a-C-IST |   C    | `"2026-03-15T14:30:00Z"` | `03/15/2026 08:00 PM` | `"2026-03-15T20:00:00"` | `"2026-03-15T14:30:00.000Z"` |  FAIL  |
| ws-10a-D-IST |   D    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM` | `"2026-03-15T20:00:00"` | `"2026-03-15T20:00:00.000Z"` |  FAIL  |
| ws-10a-H-IST |   H    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM` | `"2026-03-15T20:00:00"` | `"2026-03-15T20:00:00"`      |  FAIL  |

## WS-10B — forminstance Comparison: BLOCKED

| ID           | Config | Status  | Reason                                |
| ------------ | :----: | :-----: | ------------------------------------- |
| ws-10b-C-BRT |   C    | BLOCKED | `forminstance/` returns 500 on vvdemo |
| ws-10b-D-BRT |   D    | BLOCKED | `forminstance/` returns 500 on vvdemo |

> The DateTest template is not registered in FormsAPI on vvdemo. Cannot compare API-level response before browser rendering.

## WS-10C — Save-and-Stabilize (BRT)

Record: DateTest-001568 → saved DataID: `ffc087e3-4a34-4ab9-9d2d-fdcd61cf2cdf`

### ws-10c-C-BRT — Config C

| Snapshot | Display               | rawValue                | GFV                          |
| -------- | --------------------- | ----------------------- | ---------------------------- |
| 1        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00.000Z"` |
| 2        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00.000Z"` |
| 3        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00.000Z"` |

- `mutatedOnFirstSave`: false (rawValue already shifted on load)
- `stableAfterFirstSave`: true
- **FAIL** — CB-8 shift committed on save, stable afterward.

### ws-10c-D-BRT — Config D (THE TICKET SCENARIO)

| Snapshot | Display               | rawValue                | GFV                          |
| -------- | --------------------- | ----------------------- | ---------------------------- |
| 1        | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"` | `"2026-03-15T11:30:00.000Z"` |
| 2        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T11:30:00.000Z"` |
| 3        | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | `"2026-03-15T11:30:00.000Z"` |

- `mutatedOnFirstSave`: false (rawValue same, but **DISPLAY changed**: 02:30 PM → 11:30 AM)
- `stableAfterFirstSave`: true
- **FAIL** — EXACTLY matches Freshdesk #124697. `ignoreTZ` preserves display of the ORIGINAL DB value (2:30 PM) on first load, but save commits the shifted rawValue (11:30 AM) as the new DB value. On reopen, display now shows the shifted value.

## Outcome

**2 PASS, 6 FAIL, 2 BLOCKED, 2 FAIL (stabilize)** — Total: 2 PASS, 8 FAIL, 2 BLOCKED.

## Findings

### CB-8 Confirmed — postForms Endpoint

CB-8 (API Z normalization causing cross-layer datetime shift) is confirmed for `postForms` endpoint, matching the WS-4 results for `putForms`. The behavior is identical:

- API appends Z to datetime input
- Forms V1 interprets Z as real UTC, converting to local time
- Shift magnitude = TZ offset (BRT: -3h, IST: +5:30h)

### Config D — The Ticket Scenario (Freshdesk #124697)

WS-10C-D-BRT reproduces the exact customer-reported behavior:

1. Record created via API with `T14:30:00`
2. First browser open: display shows `02:30 PM` (ignoreTZ preserves original DB value)
3. Save + reopen: display shows `11:30 AM` (shifted value is now the DB value)

The mutation is **not caused by save** — rawValue was already shifted to `T11:30:00` on first load. The save merely commits the shifted value. The display change from `02:30 PM` to `11:30 AM` is caused by `ignoreTZ` reading the NEW DB value instead of the original.

### Date-Only Immunity

Config A (date-only) passes in both BRT and IST. The `T00:00:00Z` stored value resolves to the correct calendar date in all tested timezones. CB-8 only impacts datetime configs (C, D, H).

### Legacy Path (Config H)

Config H shows the same CB-8 shift as Config D but without Bug #5's fake Z suffix on GFV. The `useLegacy=true` code path is simpler but still affected by the fundamental Z normalization issue.
