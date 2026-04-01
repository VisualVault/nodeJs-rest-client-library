# TC-3-A-IST-BRT — Summary

**Spec**: [tc-3-A-IST-BRT.md](../test-cases/tc-3-A-IST-BRT.md)
**Current status**: FAIL-3 — last run 2026-04-01 (BRT)
**Bug surface**: Bug #7 — date-only wrong day baked in during IST save

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | BRT | FAIL-3  | [run-1](../runs/tc-3-A-IST-BRT-run-1.md) |

## Current Interpretation

Bug #7 confirmed on IST save path for Config A: `normalizeCalValue()` parsed `"03/15/2026"` as IST midnight (2026-03-14T18:30:00Z), storing `"2026-03-14"` in the DB. BRT reload faithfully renders the corrupted value — no additional shift on load. This is the reverse-direction confirmation of TC-3-A-BRT-IST (PASS), proving the asymmetry is save-path only: BRT saves are correct (UTC-3 midnight stays same UTC day), IST saves are corrupted (UTC+5:30 midnight shifts to previous UTC day). Together with TC-3-A-BRT-BRT (PASS) and TC-3-A-BRT-IST (PASS), the complete cross-TZ picture for Config A is: save-path Bug #7 in UTC+ only, load-path clean in all timezones.

## Next Action

Run TC-3-B-IST-BRT to confirm `ignoreTZ` inertness for date-only in the IST→BRT direction. After that, all Config A/B cross-TZ reload tests will be complete.
