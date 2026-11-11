import { test as base } from "./pages";
import { BugsApi } from "../api/BugsApi";

/** API helper fixtures, on top of the page object fixtures. Each one cleans up the data it created. */
type ApiFixtures = {
  bugsApi: BugsApi;
};

export const test = base.extend<ApiFixtures>({
  bugsApi: async ({ request }, use) => {
    const bugsApi = new BugsApi(request);
    await use(bugsApi);
    // Teardown: runs even when the test fails.
    await bugsApi.deleteCreated();
  },
});

export { expect } from "@playwright/test";
