# Web Services Date-Handling Tests

Playwright API tests for VisualVault REST API date handling. Tests use the Node.js client library to create, read, and update form records via the API, verifying date integrity across field configurations and timezones.

> Task documentation: [tasks/date-handling/web-services/](../../tasks/date-handling/web-services/)
> Forms comparison: [testing/specs/date-handling/](../specs/date-handling/)

## Structure

```
web-services/
  README.md                          # This file
  ws-1-api-set.spec.js               # WS-1: Create form records via API, verify stored dates
  ws-2-api-get.spec.js               # WS-2: Read existing records via API, verify returned dates
  ws-3-api-roundtrip.spec.js         # WS-3: API set→get→set drift detection
  ws-4-api-to-forms.spec.js          # WS-4: Set via API, verify in Forms UI
  ws-5-forms-to-api.spec.js          # WS-5: Set via Forms UI, read via API
  ws-6-input-formats.spec.js         # WS-6: Various date input format tolerance
  ws-7-empty-fields.spec.js          # WS-7: Empty/null field handling
```

## Quick Start

```bash
# Run all web services tests
npx playwright test testing/web-services/

# Run a specific category
npx playwright test testing/web-services/ws-1-api-set.spec.js

# Run with specific timezone project
npx playwright test testing/web-services/ --project=BRT-chromium
```

## Fixtures & Helpers

- `testing/fixtures/ws-config.js` — API constants, form template ID, reuses FIELD_MAP from vv-config.js
- `testing/fixtures/ws-test-data.js` — Test case definitions (data-driven, same pattern as test-data.js)
- `tools/helpers/ws-api.js` — API helper functions: authenticate, create/read/update forms, capture values

## Key Differences from Forms Tests

| Aspect        | Forms (date-handling/)                                    | Web Services (web-services/)             |
| ------------- | --------------------------------------------------------- | ---------------------------------------- |
| Input method  | Browser UI (popup, typed, SetFieldValue)                  | REST API (postForms, postFormRevision)   |
| Value capture | `page.evaluate()` JS in browser                           | API response JSON parsing                |
| Helpers       | vv-form.js, vv-calendar.js                                | ws-api.js                                |
| Bug surface   | Client-side JS (normalizeCalValue, getCalendarFieldValue) | Server-side API layer                    |
| TZ relevance  | Browser timezone affects JS Date parsing                  | Server timezone (if any) affects storage |
