import type { BrowserContext } from "@playwright/test";
import { test as base } from "./api";
import { LoginPage } from "../pages/LoginPage";
import users from "../../users.json" with { type: "json" };

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

/** Worker-scoped: shared by every test in the same worker. */
type AuthWorkerFixtures = {
  authState: StorageState;
};

const [user] = users;

/**
 * The shared login, on top of the page object and API fixtures. `authState`
 * logs in once per worker and saves the browser's storage state; the
 * `storageState` override gives every test a fresh browser context that
 * starts logged in with that state.
 */
export const test = base.extend<object, AuthWorkerFixtures>({
  authState: [
    async ({ browser }, use, workerInfo) => {
      // Worker fixtures cannot use the test-scoped `page` or `baseURL`
      // fixtures, so this creates its own context with the project's baseURL.
      const context = await browser.newContext({
        baseURL: workerInfo.project.use.baseURL,
      });
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.username, user.password);
      await page.waitForURL(/\/board$/);
      const state = await context.storageState();
      await context.close();

      await use(state);
    },
    { scope: "worker" },
  ],
  storageState: async ({ authState }, use) => {
    await use(authState);
  },
});

export { expect } from "@playwright/test";
