// spec: specs/testing/delete-bug.md (chapter 2: Deleting a bug)
// seed: tests/seed.spec.ts

import { randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { test, expect } from "../tests-vibed/fixtures";
import { LoginPage } from "../pages/LoginPage";
import type { ApiSeverity, Bug } from "../api/BugsApi";
import users from "../../users.json" with { type: "json" };

const [user] = users;

type AuthState = Awaited<ReturnType<BrowserContext["storageState"]>>;
let authState: AuthState | undefined;

/** Unique per test, so each test only sees the bugs it created. */
let token: string;
/** The fresh bug every test deletes, created in beforeEach. */
let targetBug: Bug;
/** IDs of every bug the current test created, deleted again in afterEach. */
let createdIds: number[] = [];

function uniqueToken(): string {
  return `zq${randomUUID().replace(/-/g, "")}`;
}

async function createBug(
  request: APIRequestContext,
  title: string,
  severity: ApiSeverity = "mid",
): Promise<Bug> {
  const response = await request.post("/api/bugs", {
    data: {
      title,
      severity,
      owner: user.username,
      description: "Created for a delete-bug test.",
    },
  });
  expect(response.status(), `create bug "${title}"`).toBe(201);
  const bug = (await response.json()) as Bug;
  createdIds.push(bug.id);
  return bug;
}

test.describe("Deleting a bug", () => {
  // Each test gets its own browser context, sharing only the saved login.
  test.use({
    storageState: async ({}, use) => {
      await use(authState);
    },
  });

  // Arrange (shared): log in once and save the authentication state
  test.beforeAll(async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/board$/);
    authState = await context.storageState();
    await context.close();
  });

  // Arrange (shared): create a fresh bug, then open the board showing it
  test.beforeEach(async ({ page, request, boardPage }) => {
    createdIds = [];
    token = uniqueToken();
    targetBug = await createBug(request, `${token} Delete target`, "mid");

    await page.goto("/board");
    await expect(page).toHaveURL(/\/board$/);
    await expect(boardPage.bugRowByTitle(targetBug.title)).toBeVisible();
  });

  // Cleanup: delete every bug this test created (404 = the test already deleted it)
  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      const response = await request.delete(`/api/bugs/${id}`);
      expect([204, 404], `clean up bug ${id}`).toContain(response.status());
    }
    createdIds = [];
  });

  test("deleting a bug closes the modal and removes its row from the board", async ({
    page,
    boardPage,
    editBugModal,
  }) => {
    // Act
    await boardPage.openBug(targetBug.title);
    await expect(editBugModal.dialog).toHaveAccessibleName(
      `Edit bug #${targetBug.id}`,
    );
    await editBugModal.delete();

    // Assert
    await expect(editBugModal.dialog).toBeHidden();
    await expect(boardPage.bugRowByTitle(targetBug.title)).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("deleting a bug removes it from the database", async ({
    page,
    request,
    boardPage,
    editBugModal,
  }) => {
    // Act
    await boardPage.openBug(targetBug.title);
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/bugs/${targetBug.id}`) &&
        response.request().method() === "DELETE",
    );
    await editBugModal.delete();

    // Assert
    expect((await deleteResponse).status()).toBe(204);
    const getResponse = await request.get(`/api/bugs/${targetBug.id}`);
    expect(getResponse.status()).toBe(404);
    const listResponse = await request.get("/api/bugs");
    expect(listResponse.status()).toBe(200);
    const remainingIds = ((await listResponse.json()) as Bug[]).map(
      (bug) => bug.id,
    );
    expect(remainingIds).not.toContain(targetBug.id);
  });

  test("a deleted bug stays deleted after reloading the page", async ({
    page,
    boardPage,
    editBugModal,
  }) => {
    // Act
    await boardPage.openBug(targetBug.title);
    await editBugModal.delete();
    await expect(editBugModal.dialog).toBeHidden();
    await page.reload();

    // Assert
    await expect(page).toHaveURL(/\/board$/);
    await expect(boardPage.newBugButton).toBeVisible();
    await expect(boardPage.bugRowByTitle(targetBug.title)).toHaveCount(0);
  });

  test("deleting one bug leaves the other bugs untouched", async ({
    page,
    request,
    boardPage,
    editBugModal,
  }) => {
    // Arrange
    const keepFirst = await createBug(request, `${token} Keep first`, "high");
    const keepLast = await createBug(request, `${token} Keep last`, "low");
    await page.reload();
    await expect(boardPage.bugRowByTitle(keepFirst.title)).toBeVisible();
    await expect(boardPage.bugRowByTitle(keepLast.title)).toBeVisible();

    // Act
    await boardPage.openBug(targetBug.title);
    await editBugModal.delete();

    // Assert
    await expect(boardPage.bugRowByTitle(targetBug.title)).toHaveCount(0);
    const firstRow = boardPage.bugRowByTitle(keepFirst.title);
    await expect(firstRow).toContainText("HIGH");
    await expect(firstRow).toContainText(user.username);
    const lastRow = boardPage.bugRowByTitle(keepLast.title);
    await expect(lastRow).toContainText("LOW");
    await expect(lastRow).toContainText(user.username);
    await boardPage.search(token);
    await expect(boardPage.bugRows).toHaveCount(2);
  });

  test("a closed bug can be deleted from the Closed view", async ({
    page,
    request,
    boardPage,
    editBugModal,
  }) => {
    // Arrange
    const closeResponse = await request.put(`/api/bugs/${targetBug.id}`, {
      data: { ...targetBug, state: "closed" },
    });
    expect(closeResponse.status(), "close bug").toBe(200);
    await page.reload();
    await page.getByRole("button", { name: "Closed", exact: true }).click();
    await expect(boardPage.bugRowByTitle(targetBug.title)).toBeVisible();

    // Act
    await boardPage.openBug(targetBug.title);
    await expect(
      editBugModal.dialog.getByLabel("State", { exact: true }),
    ).toHaveValue("closed");
    await editBugModal.delete();

    // Assert
    await expect(editBugModal.dialog).toBeHidden();
    await expect(boardPage.bugRowByTitle(targetBug.title)).toHaveCount(0);
    const getResponse = await request.get(`/api/bugs/${targetBug.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test('deleting the only matching bug leaves a "No bugs matched." search result', async ({
    page,
    request,
    boardPage,
    editBugModal,
  }) => {
    // Arrange: an unrelated bug guarantees the board is not empty, so it
    // shows "No bugs matched." rather than "No bugs." after the delete
    const unrelatedBug = await createBug(
      request,
      `${uniqueToken()} Unrelated bug`,
      "low",
    );
    await page.reload();
    await expect(boardPage.bugRowByTitle(unrelatedBug.title)).toBeVisible();
    await boardPage.search(token);
    await expect(boardPage.bugRows).toHaveCount(1);
    await expect(boardPage.bugRowByTitle(unrelatedBug.title)).toHaveCount(0);

    // Act
    await boardPage.openBug(targetBug.title);
    await editBugModal.delete();

    // Assert
    await expect(editBugModal.dialog).toBeHidden();
    await expect(boardPage.bugRows).toHaveCount(0);
    await expect(boardPage.noBugsMatchedMessage).toBeVisible();
  });
});
