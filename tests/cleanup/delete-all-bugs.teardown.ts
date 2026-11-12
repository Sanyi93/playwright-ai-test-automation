// Runs in the "cleanup" project, which is the teardown of the "chromium"
// project (see playwright.config.ts): only after every other test has
// finished, so deleting every bug cannot break a test that is still running.

import { test, expect } from "../fixtures/api";
import type { StoredBug } from "../api/BugsApiClient";
import users from "../../users.json" with { type: "json" };

const [user] = users;

test("Check there is no bug after all bugs are deleted", async ({
  request,
  loginPage,
  boardPage,
}) => {
  // Arrange
  const listResponse = await request.get("/api/bugs");
  expect(listResponse.status(), "list bugs").toBe(200);
  const existingBugs = (await listResponse.json()) as StoredBug[];

  // Act: the loop does nothing when there are no bugs to delete
  for (const bug of existingBugs) {
    const deleteResponse = await request.delete(`/api/bugs/${bug.id}`);
    expect(deleteResponse.status(), `delete bug ${bug.id}`).toBe(204);
  }

  // Assert
  const remainingResponse = await request.get("/api/bugs");
  expect(remainingResponse.status(), "list remaining bugs").toBe(200);
  expect(await remainingResponse.json()).toEqual([]);

  await loginPage.goto();
  await loginPage.login(user.username, user.password);
  await expect(boardPage.noBugsMessage).toBeVisible();
  await expect(boardPage.bugRows).toHaveCount(0);
});
