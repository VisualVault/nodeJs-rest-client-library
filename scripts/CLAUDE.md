# Scripts — VV Script Examples & Patterns

Production-style VV scripts that run inside the Node.js microservices server. These are **examples and templates** — not test infrastructure.

## Structure

| Folder                  | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `examples/event-based/` | Scripts triggered by server events (AJAX → POST /scripts) |
| `examples/scheduled/`   | Scheduled process scripts (POST /scheduledscripts)        |
| `examples/form/`        | Form button scripts and form template examples            |
| `templates/`            | Clean boilerplate patterns for new scripts                |
| `test-scripts/`         | Local dev test scripts (gitignored)                       |

## Relationship to the Server

These scripts are executed by the server at `lib/VVRestApi/VVRestApiNodeJs/`:

- **Event scripts** → `POST /scripts` route → server injects `vvClient`, `response`, `ffColl`
- **Scheduled scripts** → `POST /scheduledscripts` route → must export `getCredentials()` and `main()`
- **Test scripts** → `GET /testscripts/scheduled/:name` route → reads from `scripts/test-scripts/scheduled/`

## Important

- Do NOT use this folder for test automation or investigation scripts — those go in `tools/`
- `log.js` in this folder proxies to the server's Winston logger
- `test-scripts/` is gitignored — it's for local ad-hoc testing only
