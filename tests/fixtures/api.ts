import { test as base } from "@playwright/test";
import { BugsApi } from "../api/BugsApi";

/** API helper fixtures. Each one cleans up the data it created. */
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
