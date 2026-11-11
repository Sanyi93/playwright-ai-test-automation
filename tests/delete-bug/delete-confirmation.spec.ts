// spec: specs/features/12-delete-bug.md (delete confirmation)
// plan: specs/testing/delete-bug.md (chapter 6)

import { randomUUID } from "node:crypto";
import { test, expect } from "../fixtures/auth";
import type { Bug } from "../api/BugsApiClient";
import users from "../../users.json" with { type: "json" };

const [user] = users;

/** The fresh bug each test works on, created in beforeEach. */
let targetBug: Bug;

test.describe("Delete confirmation", () => {
  // Arrange (shared): a fresh bug, with its Edit bug modal open
  test.beforeEach(async ({ page, bugsApi, boardPage, editBugModal }) => {
    const token = `zq${randomUUID().replace(/-/g, "")}`;
    targetBug = await bugsApi.create({
      title: `${token} Delete confirmation target`,
      severity: "mid",
      owner: user.username,
      description: "Created for a delete confirmation test.",
    });

    await page.goto("/board");
    await boardPage.search(token);
    await boardPage.openBug(targetBug.title);
    await expect(editBugModal.dialog).toHaveAccessibleName(
      `Edit bug #${targetBug.id}`,
    );
  });

  test("clicking Delete asks for confirmation and names the bug", async ({
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Act
    await editBugModal.delete();

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeVisible();
    await expect(deleteBugConfirmModal.heading).toHaveText(
      `Delete bug #${targetBug.id}?`,
    );
    await expect(deleteBugConfirmModal.message).toContainText(
      `#${targetBug.id} "${targetBug.title}"`,
    );
    await expect(deleteBugConfirmModal.message).toContainText(
      "This cannot be undone.",
    );
  });

  test("clicking Delete does not delete the bug yet", async ({
    request,
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Act
    await editBugModal.delete();

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeVisible();
    await expect(editBugModal.dialog).toBeVisible();
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);
  });

  test("the confirmation offers Delete, Cancel and Close, with focus on Cancel", async ({
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Act
    await editBugModal.delete();

    // Assert
    await expect(deleteBugConfirmModal.deleteButton).toBeVisible();
    await expect(deleteBugConfirmModal.cancelButton).toBeVisible();
    await expect(deleteBugConfirmModal.closeButton).toBeVisible();
    await expect(deleteBugConfirmModal.cancelButton).toBeFocused();
  });

  test("confirming the deletion removes the bug from the database", async ({
    page,
    request,
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Arrange
    await editBugModal.delete();
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/bugs/${targetBug.id}`) &&
        response.request().method() === "DELETE",
    );

    // Act
    await deleteBugConfirmModal.confirm();

    // Assert
    expect((await deleteResponse).status()).toBe(204);
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(404);
  });

  test("confirming the deletion closes both modals and removes the bug from the board", async ({
    boardPage,
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Arrange
    await editBugModal.delete();

    // Act
    await deleteBugConfirmModal.confirm();

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeHidden();
    await expect(editBugModal.dialog).toBeHidden();
    await expect(boardPage.bugRowByTitle(targetBug.title)).toHaveCount(0);
  });

  test("cancelling the confirmation leaves the bug in place", async ({
    page,
    request,
    boardPage,
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Arrange
    await editBugModal.delete();
    const deleteRequests: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "DELETE") deleteRequests.push(req.url());
    });

    // Act
    await deleteBugConfirmModal.cancel();

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeHidden();
    expect(deleteRequests).toEqual([]);
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);
    await expect(boardPage.bugRowByTitle(targetBug.title)).toHaveCount(1);
  });

  test("cancelling the confirmation returns to the Edit bug modal with unsaved edits kept", async ({
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Arrange
    const editedTitle = `${targetBug.title} edited`;
    await editBugModal.titleInput.fill(editedTitle);
    await editBugModal.delete();

    // Act
    await deleteBugConfirmModal.cancel();

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeHidden();
    await expect(editBugModal.dialog).toBeVisible();
    await expect(editBugModal.titleInput).toHaveValue(editedTitle);
  });

  test("closing the confirmation with the X leaves the bug in place", async ({
    request,
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Arrange
    await editBugModal.delete();

    // Act
    await deleteBugConfirmModal.close();

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeHidden();
    await expect(editBugModal.dialog).toBeVisible();
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);
  });

  test("pressing Escape closes only the confirmation and leaves the bug in place", async ({
    page,
    request,
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Arrange
    await editBugModal.delete();
    await expect(deleteBugConfirmModal.dialog).toBeVisible();

    // Act
    await page.keyboard.press("Escape");

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeHidden();
    await expect(editBugModal.dialog).toBeVisible();
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);
  });

  test("clicking outside the confirmation does not close it", async ({
    page,
    request,
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Arrange
    await editBugModal.delete();
    await expect(deleteBugConfirmModal.dialog).toBeVisible();

    // Act: click the dimmed backdrop near the left edge of the viewport
    await page.mouse.click(5, 400);

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeVisible();
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);
  });

  test("a failed deletion keeps the bug and shows an error in the Edit bug modal", async ({
    page,
    request,
    boardPage,
    editBugModal,
    deleteBugConfirmModal,
  }) => {
    // Arrange: the backend fails only DELETE requests for bugs
    await page.route("**/api/bugs/*", (route) =>
      route.request().method() === "DELETE"
        ? route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: "server_error",
              message: "Internal error",
            }),
          })
        : route.fallback(),
    );
    await editBugModal.delete();

    // Act
    await deleteBugConfirmModal.confirm();

    // Assert
    await expect(deleteBugConfirmModal.dialog).toBeHidden();
    await expect(editBugModal.dialog).toBeVisible();
    await expect(editBugModal.errorAlert).toHaveText("Internal error");
    await expect(boardPage.bugRowByTitle(targetBug.title)).toHaveCount(1);
    expect((await request.get(`/api/bugs/${targetBug.id}`)).status()).toBe(200);
  });
});
