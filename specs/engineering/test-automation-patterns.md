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

| App page or region | Route or trigger | Page object |
|---|---|---|
| Login page | `/login` | `tests/pages/LoginPage.ts` |
| Board page (title bar, search, bug table) | `/board` | `tests/pages/BoardPage.ts` |
| Create bug modal | "New Bug" button on the board | `tests/pages/CreateBugModal.ts` |
| Edit bug modal | clicking a bug row on the board | `tests/pages/EditBugModal.ts` |
| Board column sorting | column headers of the board table | `tests/pages/Sorting.ts` |

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

## Using page objects in tests

- **Through fixtures:** every page object is registered in `tests/tests-vibed/fixtures.ts`, and tests receive it as a fixture, for example `async ({ boardPage, editBugModal }) => { ... }`. Import `test` and `expect` from that fixtures file, not from `@playwright/test`.
- **Adding a page object:** create the class in `tests/pages/`, add it to the `Fixtures` interface and to `base.extend` in the fixtures file, and add it to the table above.
- **Exception: `beforeAll`:** Playwright does not provide the `page` fixture in `beforeAll`. A shared login there creates its own context and page, and constructs the page object directly: `new LoginPage(page)`.

## Related rules

- Atomic, independent tests using Arrange-Act-Assert, and a shared login state: `CLAUDE.md` rules 6 and 7, and `.claude/rules/testing.md`.
- Test data: each test creates the data it needs, through the API where possible, and deletes it again afterwards.
- Test plans: `specs/testing/`.
