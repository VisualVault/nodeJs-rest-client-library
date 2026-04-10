# Forms Calendar Status — EmanuelJofre (vvdemo)

Last run: 2026-04-06 | 242 slots | 204 executed (111P / 93F) | 35 pending

Detailed results in run files under `runs/`. TC specs in `tasks/date-handling/forms-calendar/test-cases/`.

All 7 FORM-BUGs confirmed. See `tasks/date-handling/forms-calendar/analysis/` for bug reports.

Historical results snapshot preserved in `tasks/date-handling/forms-calendar/matrix.md` tables.

## Pending: Cross-Environment Differential (Cat 14–16)

27 new slots added to matrix (2026-04-10). EmanuelJofre is the primary environment for:
- **Cat 14 (Mask Impact)**: Add `MM/dd/yyyy` mask to Field5/Field6 → compare with unmasked baseline
- **Cat 15 (Kendo Widget)**: Capture v1 data for comparison with WADNR v2 audit
- **Cat 16 (Server TZ)**: Form save pipeline comparison (UTC-3 vs UTC-7)
