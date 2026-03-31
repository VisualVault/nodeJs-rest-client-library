# TC-1-G-IST — Summary

**Spec**: [tc-1-G-IST.md](../tc-1-G-IST.md)
**Current status**: FAIL-1 — last run 2026-03-31 (IST)
**Bug surface**: Legacy format + IST midnight UTC crossover — stored UTC datetime has previous-day date portion; no Time tab despite enableTime=true

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-1-G-IST-run-1.md) |

## Current Interpretation

Config G (DateTime, ignoreTZ=false, useLegacy=true) in IST stores `"2026-03-14T18:30:00.000Z"` — the same full UTC datetime as all other legacy configs in IST (E, F). Two compounding failure modes: (1) the legacy popup stores raw `toISOString()` instead of the local-time format used by the modern path (Config C stores `"2026-03-15T00:00:00"` in IST), and (2) for UTC+5:30, IST midnight falls on the previous UTC day (March 14 instead of March 15). The popup closes immediately after day click with no Time tab, despite `enableTime=true` — the legacy path ignores this flag for popup interaction. Display shows correct local date (`03/15/2026 12:00 AM`); the error is only visible in storage/API. GetFieldValue returns the stored value without transformation (no fake-Z — `useLegacy=true` bypasses the Bug #5 branch). Compare with tc-1-G-BRT: identical behavior, but BRT midnight (03:00Z) stays on March 15 UTC, so the date-shift issue is invisible in UTC- timezones.

## Next Action

Run tc-1-H-IST (pending) to confirm ignoreTZ is a no-op for Config H in IST — expected to produce identical result. All legacy IST popup slots (E/F/G/H) would then be complete.
