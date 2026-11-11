// plan: specs/testing/rest-api.md (7. DELETE /api/bugs/:id)

import { test, expect } from "../fixtures/api";
import { expectApiError } from "../api/expectApiError";

test.describe("DELETE /api/bugs/:id", () => {
  test("deletes an existing bug", async ({ request, bugsApi, token }) => {
    // Arrange
    const created = await bugsApi.create({
      title: `${token} to delete`,
      severity: "mid",
      owner: "buggy",
      description: "Deleted by an API test.",
    });

    // Act
    const response = await request.delete(`/api/bugs/${created.id}`);

    // Assert
    expect(response.status()).toBe(204);
    expect(await response.text()).toBe("");
    expect((await request.get(`/api/bugs/${created.id}`)).status()).toBe(404);
  });

  test("returns 404 when the same bug is deleted a second time", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Arrange
    const deletedId = await bugsApi.createDeleted({
      title: `${token} deleted once`,
      severity: "mid",
      owner: "buggy",
      description: "Deleted by an API test.",
    });

    // Act
    const response = await request.delete(`/api/bugs/${deletedId}`);

    // Assert
    await expectApiError(response, 404, "not_found", "Bug not found.");
  });
});
