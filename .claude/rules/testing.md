---
paths:
  - "tests/**/*.ts"
---

# Test Rules

Project-wide test automation patterns: `specs/engineering/test-automation-patterns.md`. Read it before writing or changing any Playwright test.

- Write atomic tests using the Arrange-Act-Assert pattern
  - Each Test has to be independent and does not rely on the state of any other test
  - The tests may share only the authentication state
- Use page objects instead of long, raw page call chains in new and refactored tests
  - Page object classes belong in `tests/pages/`: one class per file, one class per page of the app
  - Every page object has a fixture in `tests/fixtures/`; tests request page objects as fixtures and never construct them with `new`
  - Import `test` and `expect` from `tests/fixtures`, not from `@playwright/test`
  - Follow Playwright's fixture conventions: https://playwright.dev/docs/test-fixtures
  - Follow Playwright's page object conventions: https://playwright.dev/docs/pom
