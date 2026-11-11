# BuggyBoard: Use Specs as Context

When working on the **BuggyBoard** web app (bug tracker SUT for the Playwright course):

1. **Read the constitution** (`specs/constitution.md`) and the specs under `specs/` before implementing. Use at least:
   - `specs/product/vision.md` – what we're building
   - `specs/design/theme.md` – color theme and UI/UX design rules
   - `specs/engineering/tech-stack.md` – stack and constraints
   - `specs/engineering/coding-standards.md` – style and architecture
   - `specs/engineering/development-process.md` – spec-first, feature-by-feature, pause for review
   - `specs/engineering/test-automation-patterns.md` – project-wide test automation patterns (page objects, fixtures, assertions); read it before writing or changing any Playwright test
2. **For a feature**, use the corresponding spec in `specs/features/` (e.g. `specs/features/01-login.md`).
3. **Update** `specs/PROGRESS.md` when a feature or step is completed.
4. **Pause for review** after each feature; do not start the next feature until the user directs.
5. **Ask the user** when a decision is unclear instead of assuming.
6. **Write atomit tests rather than grand tours** so that every tests focuses on one thing and is easier to debug when it fails. 
   - Tests should follow the Arrange-Act-Assert pattern.
   - Each test should be independent and not rely on the state left by previous tests.
7. **Share the test steps when it makes a sense** and use the "beforeEach()" or "beforeAll()" loop for those steps.
   - Tests in one test case shall share the auth state - so that the login does not need to be perform repeatedly. The shared login is the worker-scoped fixture in `tests/fixtures/auth.ts`: import `test` and `expect` from `tests/fixtures/auth.ts` instead of logging in inside `beforeAll()` (see `specs/engineering/test-automation-patterns.md`).
    - Similarly if more test cases in one file start from the same page "outsource" this step to the before<>() loop
8. **Use page objects** in new and refactored Playwright tests instead of long, raw page call chains, as described in `specs/engineering/test-automation-patterns.md`.
   - Page object classes belong in `tests/pages/`, with one class per file and one class per page of the app.
   - Follow Playwright's page object conventions: https://playwright.dev/docs/pom