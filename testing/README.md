# Testing Infrastructure

Playwright-based browser automation for VisualVault platform testing. All test infrastructure lives under this directory.

> Environment setup: [Dev Setup Guide](../docs/guides/dev-setup.md#4-playwright-testing-setup)
> Detailed guide: [Playwright Testing](../docs/guides/playwright-testing.md)

## Structure

```
testing/
  playwright.config.js       # 4 TZ × 3 browser matrix (12 projects)
  global-setup.js            # Auto-login + create saved records (per-TZ, cached 1h)
  config/                    # Credentials, TZ configs, auth state, screenshots
  helpers/                   # Test-specific page helpers
    vv-form.js               # Generic VV form automation (navigation, fields, save)
    vv-calendar.js           # Calendar popup + typed input helpers
  fixtures/                  # Shared test data and config
    vv-config.js             # FIELD_MAP, form URLs, saved records
    env-config.js            # Loads .env.json, maps credentials for tests and runners
    ws-config.js             # Web service API config and helpers
    test-data.js             # All test case definitions (data-driven)
  specs/                     # Test spec files
    date-handling/           # Date-handling specs (1 per category + dashboard specs)
  pipelines/                 # Regression pipeline orchestrators
    run-regression.js        # Forms regression
    run-ws-regression.js     # WS regression
    run-dash-regression.js   # Dashboard regression
```

## Quick Start

```bash
npm run test:pw              # All projects (4 TZ × 3 browsers)
npm run test:pw:brt          # BRT — all browsers
npm run test:pw:ist          # IST — all browsers
npm run test:pw:chromium     # Chromium — all TZs
npm run test:pw:headed       # Headed mode (visible browser)
npm run test:pw:report       # Open HTML report
```

## Test Suites

| Suite                                          | Specs         | Description                                                                     |
| ---------------------------------------------- | ------------- | ------------------------------------------------------------------------------- |
| [date-handling](specs/date-handling/README.md) | 21 spec files | Calendar field + dashboard date-handling across 8 field configs and 5 timezones |

## Configuration

Test credentials and auth state are stored in `config/` and gitignored. See [`.env.example.json`](../.env.example.json) for the credential format and [Dev Setup Guide](../docs/guides/dev-setup.md#43-create-credentials-file) for field descriptions. The `config/README.md` has additional setup details.
