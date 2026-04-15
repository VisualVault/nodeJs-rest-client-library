# TC-WS-10B-D-BRT — Config D, forminstance vs postForms Compare, BRT: BLOCKED

## Environment Specs

| Parameter          | Required Value                                                        |
| ------------------ | --------------------------------------------------------------------- |
| **Execution Mode** | API comparison: `forminstance/` GET vs `postForms` stored value       |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                     |
| **Browser TZ**     | `America/Sao_Paulo` — UTC-3 (BRT)                                     |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                           |
| **Target Config**  | Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false` |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                            |
| **Ticket**         | Freshdesk #124697                                                     |

## Scenario

WS-10B compares `forminstance/` API response against `postForms` stored value. This is the ticket config (D = ignoreTZ + enableTime). **BLOCKED** because `forminstance/` returns HTTP 500 on vvdemo.

## Status

**BLOCKED** — `forminstance/` endpoint returns 500 on vvdemo. Cannot execute until the template is registered in FormsAPI or a different environment is available.

## Related

| Reference      | Location                          |
| -------------- | --------------------------------- |
| Run history    | `../summaries/tc-ws-10b-D-BRT.md` |
| WS-10A (D-BRT) | `tc-ws-10a-D-BRT.md`              |
| WS-10C (D-BRT) | `tc-ws-10c-D-BRT.md`              |
| Ticket         | Freshdesk #124697                 |
