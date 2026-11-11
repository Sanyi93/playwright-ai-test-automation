import { randomUUID } from "node:crypto";
import { test as base } from "./pages";
import { BugsApi, type StoredBug } from "../api/BugsApi";

/** API helper fixtures, on top of the page object fixtures. Each one cleans up the data it created. */
type ApiFixtures = {
  bugsApi: BugsApi;
  /**
   * A unique prefix for this test's bug titles, so tests never see or touch
   * each other's data. Any bug whose title still starts with it is deleted
   * after the test.
   */
  token: string;
};

export const test = base.extend<ApiFixtures>({
  bugsApi: async ({ request }, use) => {
    const bugsApi = new BugsApi(request);
    await use(bugsApi);
    // Teardown: runs even when the test fails.
    await bugsApi.deleteCreated();
  },
  token: async ({ request }, use) => {
    const token = `zq${randomUUID().replace(/-/g, "")}`;
    await use(token);
    // Teardown: a safety net for bugs created outside bugsApi.
    const response = await request.get("/api/bugs");
    if (!response.ok()) return;
    for (const bug of (await response.json()) as StoredBug[]) {
      if (bug.title.startsWith(token)) {
        await request.delete(`/api/bugs/${bug.id}`);
      }
    }
  },
});

export { expect } from "@playwright/test";
