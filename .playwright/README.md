# .playwright/ — Browser Automation Config

Configuration files for VV platform Playwright testing. These files are shared between the `playwright-cli` command workflow and the `@playwright/test` runner.

## Files

| File                     | Committed | Purpose                                                                  |
| ------------------------ | :-------: | ------------------------------------------------------------------------ |
| `vv-config.example.json` |    Yes    | Template for VV credentials — copy to `vv-config.json` and fill in       |
| `vv-config.json`         |    No     | Your VV instance credentials (gitignored)                                |
| `tz-brt.json`            |    Yes    | Timezone config for `playwright-cli --config` (America/Sao_Paulo, UTC-3) |
| `tz-ist.json`            |    Yes    | Timezone config for `playwright-cli --config` (Asia/Calcutta, UTC+5:30)  |
| `tz-utc0.json`           |    Yes    | Timezone config for `playwright-cli --config` (Etc/GMT, UTC+0)           |
| `auth-state.json`        |    No     | Saved auth cookies for `playwright-cli` sessions (gitignored)            |
| `auth-state-pw.json`     |    No     | Saved auth cookies for `@playwright/test` runs (gitignored)              |
| `screenshots/`           |    No     | Test evidence screenshots (gitignored)                                   |

## Setup

1. Copy the example config:

    ```bash
    cp .playwright/vv-config.example.json .playwright/vv-config.json
    ```

2. Edit `vv-config.json` with your credentials:

    | Field           | Description                   | Example                          |
    | --------------- | ----------------------------- | -------------------------------- |
    | `instance`      | VV instance name (subdomain)  | `vvdemo`                         |
    | `loginUrl`      | Full URL to the VV login page | `https://vvdemo.visualvault.com` |
    | `username`      | Your VV username (email)      | `user@company.com`               |
    | `password`      | Your VV password              |                                  |
    | `customerAlias` | VV customer/tenant identifier | `EmanuelJofre`                   |
    | `databaseAlias` | VV database name              | `Main`                           |

## Auth State Files

Two separate auth state files exist because `playwright-cli` (interactive CLI) and `@playwright/test` (Node.js API) manage browser contexts independently:

- **`auth-state.json`** — created by `playwright-cli state-save` during the `@-create-pw-date-test` command workflow
- **`auth-state-pw.json`** — created by `global-setup.js` when running `npm run test:pw`

Both are auto-generated on first use. To force re-login, delete the relevant file.

## Timezone Config Files

The `tz-*.json` files are used by `playwright-cli open --config=.playwright/tz-brt.json` to set the browser's timezone context. They contain a single property:

```json
{ "timezoneId": "America/Sao_Paulo" }
```

The `@playwright/test` runner does NOT use these files — it sets `timezoneId` directly in `playwright.config.js` project definitions.
