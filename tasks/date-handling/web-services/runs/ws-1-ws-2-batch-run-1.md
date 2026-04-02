# WS-1 + WS-2 Batch Run 1 | 2026-04-02 | BRT+IST+UTC | 32 PASS / 0 FAIL

First batch execution of WS-1 (API Write) and WS-2 (API Read + Cross-Layer).

## Environment

| Parameter      | Value                                                   |
| -------------- | ------------------------------------------------------- |
| Date           | 2026-04-02                                              |
| Execution Mode | Script (`run-ws-test.js`)                               |
| Server TZ      | BRT (default), IST (`TZ=Asia/Calcutta`), UTC (`TZ=UTC`) |
| VV Environment | `vvdemo` — `EmanuelJofre/Main`                          |

## Execution Log

| #   | Command                                 | Configs | TZ  | Record          | Result |
| --- | --------------------------------------- | ------- | --- | --------------- | ------ |
| 1   | WS-2 --record-id DateTest-000080        | ALL     | BRT | —               | 8 PASS |
| 2   | WS-2 --record-id DateTest-000084        | ALL     | IST | —               | 8 PASS |
| 3   | WS-1 --input-date "2026-03-15"          | A,B,E,F | BRT | DateTest-000889 | 4 PASS |
| 4   | WS-1 --input-date "2026-03-15T14:30:00" | C,D,G,H | BRT | DateTest-000890 | 4 PASS |
| 5   | WS-1 --input-date "2026-03-15"          | A       | IST | DateTest-000891 | 1 PASS |
| 6   | WS-1 --input-date "2026-03-15T14:30:00" | C,D,H   | IST | DateTest-000892 | 3 PASS |
| 7   | WS-1 --input-date "2026-03-15"          | A       | UTC | DateTest-000893 | 1 PASS |
| 8   | WS-1 --input-date "2026-03-15T14:30:00" | C,D,H   | UTC | DateTest-000894 | 3 PASS |

## WS-1 Results (16 PASS)

| Config | TZ  | Sent                    | Stored (API read-back)   | Date Preserved |
| :----: | :-: | ----------------------- | ------------------------ | :------------: |
|   A    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |      YES       |
|   B    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |      YES       |
|   C    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   D    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   E    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |      YES       |
|   F    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |      YES       |
|   G    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   H    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   A    | IST | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |      YES       |
|   C    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   D    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   H    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   A    | UTC | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |      YES       |
|   C    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   D    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |
|   H    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |      YES       |

## WS-2 Results (16 PASS)

|   Config    | Record       | API Return               | Forms getValueObjectValue |        Cross-Layer Match        |
| :---------: | ------------ | ------------------------ | ------------------------- | :-----------------------------: |
|      A      | 000080 (BRT) | `"2026-03-15T00:00:00Z"` | `"2026-03-15"`            | Format differs (API normalizes) |
|      D      | 000080 (BRT) | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00"`   |   Format differs (API adds Z)   |
| B,C,E,F,G,H | 000080 (BRT) | `null`                   | (not set)                 |       Match (both empty)        |
|      A      | 000084 (IST) | `"2026-03-14T00:00:00Z"` | `"2026-03-14"`            |     Bug #7 confirmed in DB      |
|      D      | 000084 (IST) | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00"`   |   Format differs (API adds Z)   |
| B,C,E,F,G,H | 000084 (IST) | `null`                   | (not set)                 |       Match (both empty)        |

## Hypotheses Confirmed

| Hypothesis                                       | Status        | Evidence                                                                       |
| ------------------------------------------------ | ------------- | ------------------------------------------------------------------------------ |
| H-1: API bypasses Bug #7                         | **CONFIRMED** | All WS-1 date-only configs store correct date across BRT/IST/UTC               |
| H-2: API returns raw value, no Bug #5 fake Z     | **CONFIRMED** | Config D returns `"...T00:00:00Z"` (real Z from normalization, not fake `[Z]`) |
| H-4: Server TZ irrelevant for string passthrough | **CONFIRMED** | BRT, IST, UTC produce identical stored values for same input                   |
| H-7: Forms-saved buggy values readable via API   | **CONFIRMED** | IST Config A returns `"2026-03-14T00:00:00Z"` (Bug #7 damage visible)          |

## New Findings

1. **API date normalization**: VV server normalizes ALL dates to ISO 8601 datetime with Z suffix on read. Date-only `"2026-03-15"` becomes `"2026-03-15T00:00:00Z"`. Already documented in `docs/guides/scripting.md`.
2. **Null fields**: Unset date fields return `null` from API (not `""` or `"Invalid Date"`).
3. **Config flags irrelevant on API**: `enableTime`, `ignoreTimezone`, `useLegacy` have NO effect on API write/read behavior. All configs store and return identically.
4. **Cross-layer format mismatch**: API returns different format than Forms `getValueObjectValue()`. Scripts round-tripping between API and Forms must handle this.
