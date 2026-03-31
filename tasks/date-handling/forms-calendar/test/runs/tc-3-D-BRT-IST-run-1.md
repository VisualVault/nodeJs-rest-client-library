# TC-3-D-BRT-IST — Run 1 | 2026-03-27 | IST | PASS

**Spec**: [tc-2-4-cross-tz-brt.md](../tc-2-4-cross-tz-brt.md) | **Summary**: [summary](../summaries/tc-3-D-BRT-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-27                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step # | Expected                                                                                   | Actual                       | Match |
| ------ | ------------------------------------------------------------------------------------------ | ---------------------------- | ----- |
| 1      | All P1–P6 checks pass                                                                      | All P1–P6 checks pass        | PASS  |
| 2      | Form opens DateTest-000004 Rev 1; tab title confirmed                                      | Confirmed                    | PASS  |
| 4      | Raw stored: `"2026-03-15T00:00:00"` — unchanged from BRT save                              | `"2026-03-15T00:00:00"`      | PASS  |
| 5      | GFV: `"2026-03-15T00:00:00"` — same as raw (Config D TZ-invariant)                         | `"2026-03-15T00:00:00"`      | PASS  |
| 6      | Display: `03/15/2026 12:00 AM` — correct; ignoreTimezone=true suppresses offset conversion | `03/15/2026 12:00 AM`        | PASS  |
| 9      | `"2026-03-14T18:30:00.000Z"` (IST confirmed)                                               | `"2026-03-14T18:30:00.000Z"` | PASS  |

> Note: Step numbers correspond to the cross-TZ analytical steps in tc-2-4 (steps 4–6 capture raw/GFV/display; step 9 isoRef). The reload was of DateTest-000004, saved from BRT. Config D (`ignoreTimezone=true`) stores and returns the raw local time string without any timezone conversion — the value `"2026-03-15T00:00:00"` is returned identically regardless of the reader's timezone. Display shows the same `03/15/2026 12:00 AM` in IST as in BRT.

## Outcome

**PASS** — Config D BRT-saved record reloaded in IST; display and GFV are unchanged; the raw stored value `"2026-03-15T00:00:00"` is TZ-invariant on reload.

## Findings

- Config D (`ignoreTimezone=true`) is TZ-invariant on reload: the stored `"2026-03-15T00:00:00"` passes through the load path without offset adjustment, regardless of the reader's timezone.
- Display `03/15/2026 12:00 AM` is the same in IST as in BRT — consistent with the `ignoreTimezone` design intent.
- GFV returned the clean value in this run; Bug #5 fake Z was not appended during this reload observation.
- Cross-TZ drift from Bug #5 would only appear on a subsequent `SetFieldValue(GetFieldValue())` round-trip in IST (+5:30h per trip — see 9-D-IST-1).

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
