# WS Naming — Valid Characters and Platform Constraints

## What This Is

Investigation of which characters the VV platform accepts in web service names. Focused on `_` (underscore) and `-` (hyphen).

## Scope

| Component                  | Status      | Notes                                       |
| -------------------------- | ----------- | ------------------------------------------- |
| WS admin UI creation       | Complete    | Both `_` and `-` accepted                   |
| WS API visibility          | Complete    | `getOutsideProcesses()` returns exact names |
| WS runtime resolution      | Complete    | `runWebService()` routes correctly          |
| Schedule admin UI creation | Complete    | Both `_` and `-` accepted                   |
| Schedule grid visibility   | Complete    | Names preserved exactly                     |
| Additional characters      | Not Started | Spaces, dots, special chars, unicode        |

## Key Facts

- **Both `_` and `-` are valid** in web service AND scheduled service names. No transformation or encoding.
- Existing production evidence: 4 web services across WADNR and EmanuelJofre.
- Empirical verification: 3 WS + 3 schedules created on vvdemo (2026-04-13).
- **Connection type matters:** WS saved with "Web Service" connection type (instead of "Node.Js Server") may not appear in the `outsideprocesses` API.
- **Recurring checkbox:** Scheduled services have "Recurring" checked by default — must uncheck or provide an interval, or save fails silently.

## Confirmed Bugs

None — both characters work as expected for both service types.

## Tools Created

- `tools/admin/create-ws.js` — Create web services via Playwright (reusable, environment-agnostic)
- `tools/admin/create-schedule.js` — Create scheduled services via Playwright
- `tools/admin/verify-ws.js` — Verify web services exist via REST API (glob matching, invocation)
- `tools/admin/explore-admin.js` — Explore any VV admin page (toolbar, dock panel fields, grid)

## Next Steps

1. Clean up test services (`zzz*`) on vvdemo
2. Test additional characters if needed (spaces, dots, special chars)
