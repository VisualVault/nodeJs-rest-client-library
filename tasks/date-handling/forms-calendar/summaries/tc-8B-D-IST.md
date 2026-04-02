# TC-8B-D-IST — Summary

**Spec**: [tc-8B-D-IST.md](../test-cases/tc-8B-D-IST.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: none — GDOC itself is correct; GFV comparison re-confirms Bug #5

## Run History

| Run | Date       | TZ  | Outcome | File                                  |
| --- | ---------- | --- | ------- | ------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-8B-D-IST-run-1.md) |

## Current Interpretation

GetDateObjectFromCalendar returns a correct Date object for Config D in IST. The toString() shows local IST midnight, and toISOString() produces genuine UTC (`2026-03-14T18:30:00.000Z` — IST midnight minus 5:30h maps to previous UTC day). This mirrors the BRT result where GDOC also produced correct real UTC. Combined with BRT evidence, GDOC is confirmed correct across both UTC- and UTC+ timezones. The GFV comparison step re-confirms Bug #5: the fake Z in GFV creates a 5h30m discrepancy vs GDOC's real UTC in IST.

## Next Action

GDOC characterization complete for Config D across BRT and IST. No further GDOC runs needed unless testing other configs.
