// plan: specs/testing/rest-api.md (4. GET /api/bugs/:id)

import { test, expect } from "../fixtures/api";
import { expectApiError } from "../api/expectApiError";

test.describe("GET /api/bugs/:id", () => {
  test("returns an existing bug", async ({ request, bugsApi, token }) => {
    // Arrange
    const created = await bugsApi.create({
      title: `${token} fetched`,
      severity: "mid",
      owner: "buggy",
      description: "Fetched by an API test.",
    });

    // Act
    const response = await request.get(`/api/bugs/${created.id}`);

    // Assert
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      ...created,
      severity: "MID",
      state: "OPEN",
    });
  });

  test("returns 404 for a bug that does not exist", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Arrange
    const deletedId = await bugsApi.createDeleted({
      title: `${token} gone`,
      severity: "mid",
      owner: "buggy",
      description: "Deleted by an API test.",
    });

    // Act
    const response = await request.get(`/api/bugs/${deletedId}`);

    // Assert
    await expectApiError(response, 404, "not_found", "Bug not found.");
  });

  for (const id of ["abc", "-"]) {
    test(`rejects the ID "${id}", which is not a number`, async ({ request }) => {
      // Act
      const response = await request.get(`/api/bugs/${id}`);

      // Assert
      await expectApiError(response, 400, "invalid_id", "Bug ID must be a number.");
    });
  }
});
