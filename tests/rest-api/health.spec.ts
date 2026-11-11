// plan: specs/testing/rest-api.md (1. GET /api/health)

import { test, expect } from "../fixtures/api";

test.describe("GET /api/health", () => {
  test("reports the API and database as running", async ({ request }) => {
    // Act
    const response = await request.get("/api/health");

    // Assert
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toEqual({
      ok: true,
      message: "BuggyBoard API is running",
      database: "connected",
    });
  });
});
