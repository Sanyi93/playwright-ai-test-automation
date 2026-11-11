# Test Automation Patterns

Project-wide patterns for the Playwright end-to-end tests in `tests/`. This file is the reference for how tests are structured. It complements the test rules in `CLAUDE.md` (atomic tests, Arrange-Act-Assert, independent tests, shared login only) and `.claude/rules/testing.md`.

## Core principle: use page objects

**New and refactored Playwright tests must use page objects instead of long, raw page call chains.**

- A spec describes *what* the user does and *what* should happen. Page objects hold *how* to find and operate elements.
- A "raw page call chain" is a locator built inline in a spec, such as `page.getByRole("dialog", { name: "Create bug" }).getByRole("button", { name: "Save" }).click()`. Put locators like this in a page object, and call `createBugModal.save()` from the spec.
- Specs may still use `page` directly for things that do not belong to one page: navigation (`page.goto`, `page.reload`), URL checks (`expect(page).toHaveURL(...)`), keyboard input (`page.keyboard.press`), network waits and routes, and storage state.
- Existing tests that use raw call chains do not have to be rewritten straight away. When a test is changed for any reason, move its raw locators into page objects as part of that change.

## Where page objects live

- **Location:** all page object classes are in `tests/pages/`.
- **One class per file:** each file contains exactly one page object class. The file is named after the class (`LoginPage.ts` exports `LoginPage`).
- **One class per page:** each page of the app has its own page object. A modal or a self-contained region that is reused or large, such as a modal dialog or the board's sortable headers, gets its own class too, instead of growing the page's class.
- **Do not duplicate:** before creating a page object, check `tests/pages/` for an existing one and extend it instead.

### Current page objects

| App page or region | Route or trigger | Page object | Fixture |
|---|---|---|---|
| Login page | `/login` | `tests/pages/LoginPage.ts` | `loginPage` |
| Board page (title bar, search, bug table) | `/board` | `tests/pages/BoardPage.ts` | `boardPage` |
| Create bug modal | "New Bug" button on the board | `tests/pages/CreateBugModal.ts` | `createBugModal` |
| Edit bug modal | clicking a bug row on the board | `tests/pages/EditBugModal.ts` | `editBugModal` |
| Delete bug confirmation modal | Delete button in the Edit bug modal | `tests/pages/DeleteBugConfirmModal.ts` | `deleteBugConfirmModal` |
| Board column sorting | column headers of the board table | `tests/pages/Sorting.ts` | `sorting` |
Update this table when you add a page object.

## How a page object class looks

These conventions follow Playwright's guide to page object models: https://playwright.dev/docs/pom

- **Constructor:** takes Playwright's `Page`, stores it as `readonly page`, and creates every fixed locator there as a `readonly` `Locator` field.
- **Locators:** use user-facing locators: `getByRole`, `getByLabel`, `getByText`, in that order of preference. Scope locators to their container, for example `this.dialog.getByRole("button", { name: "Save" })`, so that they cannot match elements elsewhere on the page. Use `exact: true` when a name could also be part of another element's name.
- **Locators that need a value:** write a method that returns a `Locator`, for example `bugRowByTitle(title: string): Locator`.
- **Actions:** `async` methods named after what the user does, such as `goto()`, `login(username, password)`, `openBug(title)` or `sortBy(column)`. Larger flows are built from smaller methods.
- **Return values:** actions return `Promise<void>`. Methods that read data return it, for example `ids(): Promise<number[]>`. Methods never return raw element handles.
- **No test data:** page objects do not create or delete data and do not call the API. Test data setup belongs in the test's hooks or in `tests/api/`.

```ts
import { type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel("Username");
    this.passwordInput = page.getByLabel("Password");
    this.loginButton = page.getByRole("button", { name: "Login" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

## Assertions

- **Tests own the assertions** that decide whether a test passes. A reader should see in the spec what is being verified.
- **Reusable checks may live in a page object** when the same multi-step check is needed by several tests, for example `Sorting.expectSortIndicator(column, direction)`. Name these methods `expect...`, and use web-first assertions (`await expect(locator)...`) inside them.
- Page object actions should not hide assertions. Keep `click()`, `fill()` and similar methods free of checks.

## Fixtures

These rules follow Playwright's guide to fixtures: https://playwright.dev/docs/test-fixtures

### Core rule: tests use page object fixtures

- **One fixture per page object:** every class in `tests/pages/` has a fixture that provides it. The fixture's name is the class name in camelCase, for example `LoginPage` → `loginPage` and `Sorting` → `sorting`.
- **Tests never construct page objects:** specs and their hooks (`beforeEach`, `afterEach`, `beforeAll`, `afterAll`) request page objects as fixtures, for example `async ({ boardPage, editBugModal }) => { ... }`. They never call `new LoginPage(page)` or any other page object constructor. Only fixture files construct page objects.
- **Import from the fixtures, not from Playwright:** specs import `test` and `expect` from a fixture file in `tests/fixtures/` (see "Which fixture file a spec imports" below), never directly from `@playwright/test`. Type-only imports from `@playwright/test`, such as `Page` or `BrowserContext`, are still allowed.

### Where fixture files live

All fixture files are in `tests/fixtures/`. Each file covers one concern and builds on the one before it, so each file's `test` includes all the fixtures above it:

| File | Extends | Contains |
|---|---|---|
| `tests/fixtures/pages.ts` | `@playwright/test` | One test-scoped fixture for each page object in `tests/pages/`. |
| `tests/fixtures/api.ts` | `pages.ts` | API helper fixtures, such as `bugsApi`, which also clean up the data they create. |
| `tests/fixtures/auth.ts` | `api.ts` | The shared login: a worker-scoped fixture that logs in once per worker and provides the saved storage state. |

Each file exports its `test` and re-exports `expect` from `@playwright/test`. There is no combining index file.

Add a new file only for a new concern. A new page object goes into `pages.ts`, not into a file of its own.

### Which fixture file a spec imports

| The spec needs | Import |
|---|---|
| To start logged out, for example to test the login itself | `import { test, expect } from "../fixtures/api";` |
| To start logged in | `import { test, expect } from "../fixtures/auth";` |

Adjust the relative path to the spec's folder: a spec directly in `tests/` uses `./fixtures/api` or `./fixtures/auth`.

### How a fixture is written

- **Typed `test.extend`:** declare the fixtures' types and pass them as the type parameter. Test-scoped fixtures use the first type parameter, and worker-scoped fixtures use the second:

  ```ts
  import { test as base } from "@playwright/test";
  import { LoginPage } from "../pages/LoginPage";
  import { BoardPage } from "../pages/BoardPage";

  type PageFixtures = {
    loginPage: LoginPage;
    boardPage: BoardPage;
  };

  export const test = base.extend<PageFixtures>({
    loginPage: async ({ page }, use) => {
      await use(new LoginPage(page));
    },
    boardPage: async ({ page }, use) => {
      await use(new BoardPage(page));
    },
  });
  ```

- **Setup, `use`, teardown:** a fixture is `async (dependencies, use) => { ... }`. Code before `await use(value)` is setup, `value` is what the test receives, and code after `use` is teardown. Teardown runs even if the test fails, so cleanup belongs there, as in `bugsApi`, which deletes the bugs it created.
- **Page object fixtures only construct:** a page object fixture creates the object and passes it to `use`. It does not navigate, log in or create data, so the test's Arrange step stays visible in the spec. Shared navigation and test data belong in `beforeEach`, or in a dedicated fixture when several files need the same setup.
- **Test scope by default:** page object fixtures are test-scoped, so each test gets a new instance bound to its own `page`.
- **Worker scope for expensive shared state:** use `{ scope: "worker" }` only for state that may be shared by every test in a worker, such as the login. Worker-scoped fixtures cannot depend on `page` or other test-scoped fixtures. They create their own context from `browser`.
- **Build on the previous file:** each fixture file extends the `test` exported by the file before it, rather than Playwright's base `test`, and re-exports `expect`:

  ```ts
  // tests/fixtures/api.ts
  import { test as base } from "./pages";
  import { BugsApi } from "../api/BugsApi";

  type ApiFixtures = {
    bugsApi: BugsApi;
  };

  export const test = base.extend<ApiFixtures>({
    bugsApi: async ({ request }, use) => {
      const bugsApi = new BugsApi(request);
      await use(bugsApi);
      await bugsApi.deleteCreated();
    },
  });

  export { expect } from "@playwright/test";
  ```

- **Fixture names** use letters, numbers and underscores only, and start with a letter.

### Shared login

The login is the only state tests may share (`CLAUDE.md` rule 7). It is provided by `tests/fixtures/auth.ts`, instead of a `beforeAll` hook that constructs `LoginPage` itself:

- A worker-scoped fixture, for example `authState`, creates its own browser context, logs in once per worker with `LoginPage`, saves `context.storageState()`, closes the context, and passes the state to `use`.
- The same module overrides Playwright's built-in `storageState` fixture with that state, so every test that uses this module starts logged in, in its own fresh browser context.
- Worker-scoped fixtures cannot use the test-scoped `baseURL` fixture, so `authState` reads it from `workerInfo.project.use.baseURL`.
- Specs that need a logged-in user import from `auth.ts`: `import { test, expect } from "../fixtures/auth";`. They then only navigate in `beforeEach`, for example to `/board`.
- Specs that test the login itself, such as `tests/seed.spec.ts`, import from `api.ts`, start logged out and log in through `loginPage`.

### Adding a page object

1. Create the class in `tests/pages/`, following "How a page object class looks" above.
2. Add a fixture for it to `tests/fixtures/pages.ts`, named after the class in camelCase.
3. Add a row for it to the "Current page objects" table, with its fixture name.

## Related rules

- Atomic, independent tests using Arrange-Act-Assert, and a shared login state: `CLAUDE.md` rules 6 and 7, and `.claude/rules/testing.md`.
- Test data: each test creates the data it needs, through the API where possible, and deletes it again afterwards.
- Test plans: `specs/testing/`.
