# TC-1-G-BRT — Summary

**Spec**: [tc-1-G-BRT.md](../test-cases/tc-1-G-BRT.md)
**Current status**: FAIL-1 — last run 2026-03-31 (BRT)
**Bug surface**: Legacy format — useLegacy=true DateTime popup closes without Time tab; stores UTC datetime same as date-only legacy configs

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | FAIL-1  | [run-1](../runs/tc-1-G-BRT-run-1.md) |

## Current Interpretation

Config G (DateTime, ignoreTZ=false, useLegacy=true) in BRT stores `"2026-03-15T03:00:00.000Z"` — the same full UTC datetime as Configs E and F despite `enableTime=true`. The legacy DateTime popup closes immediately after day click (no Time tab), defaulting time to midnight local. This confirms that `enableTime=true` on the legacy path does not expose a time picker — it only affects the field display format (shows `03/15/2026 12:00 AM`). Storage behavior is indistinguishable from legacy date-only configs E/F. GetFieldValue returns the real UTC datetime string without transformation; no fake-Z (Bug #5 is inactive for `useLegacy=true` fields). Round-trip is stable for BRT.

## Next Action

Legacy BRT popup behavior is fully characterized across E/F/G/H: all store the same UTC datetime format. Run tc-1-G-IST.md (pending) to verify IST case — expected to show previous-day UTC date portion matching E-IST pattern.
