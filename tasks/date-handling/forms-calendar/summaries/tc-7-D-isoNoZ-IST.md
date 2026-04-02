# TC-7-D-isoNoZ-IST — Summary

**Spec**: [tc-7-D-isoNoZ-IST.md](../test-cases/tc-7-D-isoNoZ-IST.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: none — ISO-no-Z is the recommended safe input format

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-7-D-isoNoZ-IST-run-1.md) |

## Current Interpretation

ISO strings without Z suffix (`"2026-03-15T00:00:00"`) are the recommended input format for SetFieldValue on Config D DateTime fields. The value is parsed as local time and stored as-is, producing zero shift in IST. Combined with Date object input (also safe) and ISO+Z (unsafe, +5:30h shift), the input format characterization for Config D in IST is complete. The pattern is consistent across timezones: the Z suffix triggers UTC parsing which conflicts with getSaveValue's local-time extraction.

## Next Action

No further ISO-no-Z testing needed. Input format guidance for Config D is fully characterized.
