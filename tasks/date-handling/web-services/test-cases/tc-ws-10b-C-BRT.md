# TC-WS-10B-C-BRT — Config C, forminstance vs postForms Compare, BRT: BLOCKED

## Environment Specs

| Parameter          | Required Value                                                         |
| ------------------ | ---------------------------------------------------------------------- |
| **Execution Mode** | API comparison: `forminstance/` GET vs `postForms` stored value        |
| **API Server TZ**  | `America/Sao_Paulo` — UTC-3 (BRT)                                      |
| **Browser TZ**     | `America/Sao_Paulo` — UTC-3 (BRT)                                      |
| **Code Path**      | V1 — `useUpdatedCalendarValueLogic = false`                            |
| **Target Config**  | Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false` |
| **VV Environment** | vvdemo — EmanuelJofre/Main                                             |
| **Ticket**         | Freshdesk #124697                                                      |

## Scenario

WS-10B compares the `forminstance/` API response against the `postForms` stored value to detect server-side mutations before the browser is involved. This test is **BLOCKED** because `forminstance/` returns HTTP 500 on vvdemo — the DateTest template is not registered in FormsAPI.

## Status

**BLOCKED** — `forminstance/` endpoint returns 500 on vvdemo. Cannot execute until the template is registered in FormsAPI or a different environment is available.

## Related

| Reference      | Location                          |
| -------------- | --------------------------------- |
| Run history    | `../summaries/tc-ws-10b-C-BRT.md` |
| WS-10A (C-BRT) | `tc-ws-10a-C-BRT.md`              |
| Ticket         | Freshdesk #124697                 |
