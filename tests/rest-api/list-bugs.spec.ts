// plan: specs/testing/rest-api.md (3. GET /api/bugs)

import { test, expect } from "../fixtures/api";
import type { StoredBug } from "../api/BugsApiClient";

test.describe("GET /api/bugs", () => {
  test("lists newly created bugs with all their fields", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Arrange
    const high = await bugsApi.create({
      title: `${token} listed high`,
      severity: "high",
      owner: "carol",
      description: "Listed by an API test.",
    });
    const low = await bugsApi.create({
      title: `${token} listed low`,
      severity: "low",
      owner: "erin",
      description: "Listed by an API test.",
    });

    // Act
    const response = await request.get("/api/bugs");

    // Assert
    expect(response.status()).toBe(200);
    const bugs = (await response.json()) as StoredBug[];
    expect(Array.isArray(bugs)).toBe(true);
    expect(bugs.filter((bug) => bug.title.startsWith(token))).toEqual([
      { ...high, severity: "HIGH", state: "OPEN" },
      { ...low, severity: "LOW", state: "OPEN" },
    ]);
  });

  test("no longer lists a deleted bug", async ({ request, bugsApi, token }) => {
    // Arrange
    const deletedId = await bugsApi.createDeleted({
      title: `${token} deleted`,
      severity: "mid",
      owner: "buggy",
      description: "Deleted by an API test.",
    });

    // Act
    const response = await request.get("/api/bugs");

    // Assert
    expect(response.status()).toBe(200);
    const ids = ((await response.json()) as StoredBug[]).map((bug) => bug.id);
    expect(ids).not.toContain(deletedId);
  });
});
