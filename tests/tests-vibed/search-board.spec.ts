import { randomUUID } from "node:crypto";
import { test, expect } from "../fixtures/api";
import users from "../../users.json" with { type: "json" };
import type { Bug } from "../api/BugsApi";

const user = users.find((u) => u.username === "buggy");
if (!user) {
  throw new Error('Default user "buggy" not found in users.json');
}

/** A word no other bug title contains, so each test only sees its own bugs. */
function uniqueToken(): string {
  return `zq${randomUUID().replace(/-/g, "")}`;
}

test.describe("Search board", () => {
  test("shows no bugs when the search matches no bug title", async ({
    loginPage,
    boardPage,
    bugsApi,
  }) => {
    // Arrange
    const token = uniqueToken();
    await bugsApi.create({
      title: `${token} Login fails`,
      severity: "high",
      owner: user.username,
      description: "Seeded for search test.",
    });
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // Act
    await boardPage.search(uniqueToken());

    // Assert
    await expect(boardPage.noBugsMatchedMessage).toBeVisible();
    await expect(boardPage.bugRows).toHaveCount(0);
  });

  test("shows only the bug whose title matches exactly one bug", async ({
    loginPage,
    boardPage,
    bugsApi,
  }) => {
    // Arrange
    const token = uniqueToken();
    const target = await bugsApi.create({
      title: `${token} Login fails`,
      severity: "high",
      owner: user.username,
      description: "Seeded for search test.",
    });
    await bugsApi.create({
      title: `${token} Logout button missing`,
      severity: "low",
      owner: user.username,
      description: "Seeded for search test.",
    });
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // Act
    await boardPage.search(target.title);

    // Assert
    await expect(boardPage.bugRows).toHaveCount(1);
    await expect(boardPage.bugRowByTitle(target.title)).toBeVisible();
  });

  test("shows only the two bugs whose titles match the search", async ({
    loginPage,
    boardPage,
    bugsApi,
  }) => {
    // Arrange
    const token = uniqueToken();
    const firstMatch = await bugsApi.create({
      title: `${token} Login fails`,
      severity: "high",
      owner: user.username,
      description: "Seeded for search test.",
    });
    const secondMatch = await bugsApi.create({
      title: `${token} Login times out`,
      severity: "mid",
      owner: user.username,
      description: "Seeded for search test.",
    });
    await bugsApi.create({
      title: `${token} Logout button missing`,
      severity: "low",
      owner: user.username,
      description: "Seeded for search test.",
    });
    await loginPage.goto();
    await loginPage.login(user.username, user.password);

    // Act
    await boardPage.search(`${token} Login`);

    // Assert
    await expect(boardPage.bugRows).toHaveCount(2);
    await expect(boardPage.bugRowByTitle(firstMatch.title)).toBeVisible();
    await expect(boardPage.bugRowByTitle(secondMatch.title)).toBeVisible();
  });
});

test("Check there is no bug after all bugs are deleted", async ({
  request,
  loginPage,
  boardPage,
}) => {
  // Arrange
  const listResponse = await request.get("/api/bugs");
  expect(listResponse.status(), "list bugs").toBe(200);
  const existingBugs = (await listResponse.json()) as Bug[];

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
