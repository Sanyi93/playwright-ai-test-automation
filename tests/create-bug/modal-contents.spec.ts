// spec: specs/testing/create-bug.md
// seed: tests/seed.spec.ts

import { loggedInTest as test, expect } from "../fixtures";
import users from "../../users.json" with { type: "json" };

const [user] = users;

test.describe("Modal contents and defaults", () => {
  // Arrange (shared): every test starts on the board, already logged in
  test.beforeEach(async ({ page }) => {
    await page.goto("/board");
    await expect(page).toHaveURL(/\/board$/);
  });

  test("New Bug button opens the Create bug modal with all fields", async ({
    boardPage,
    createBugModal,
  }) => {
    // 1. From /board click the 'New Bug' button in the title bar.
    await boardPage.openNewBugModal();

    await expect(createBugModal.dialog).toBeVisible();
    await expect(createBugModal.heading).toBeVisible();
    await expect(createBugModal.closeButton).toBeVisible();

    // Labelled fields with the expected element types
    await expect(createBugModal.titleInput).toBeVisible();
    await expect(createBugModal.titleInput).toHaveAttribute("type", "text");
    await expect(createBugModal.severitySelect).toBeVisible();
    await expect(createBugModal.severitySelect).toHaveJSProperty(
      "tagName",
      "SELECT",
    );
    await expect(createBugModal.ownerInput).toBeVisible();
    await expect(createBugModal.ownerInput).toHaveAttribute("type", "text");
    await expect(createBugModal.descriptionInput).toBeVisible();
    await expect(createBugModal.descriptionInput).toHaveJSProperty(
      "tagName",
      "TEXTAREA",
    );

    // Footer buttons
    await expect(createBugModal.cancelButton).toBeVisible();
    await expect(createBugModal.saveButton).toBeVisible();

    // Footer buttons sit at the bottom, below the last field
    const descriptionBox = await createBugModal.descriptionInput.boundingBox();
    const cancelBox = await createBugModal.cancelButton.boundingBox();
    const saveBox = await createBugModal.saveButton.boundingBox();
    if (!descriptionBox || !cancelBox || !saveBox) {
      throw new Error("Could not measure the Create bug modal layout");
    }
    const descriptionBottom = descriptionBox.y + descriptionBox.height;
    expect(cancelBox.y).toBeGreaterThanOrEqual(descriptionBottom);
    expect(saveBox.y).toBeGreaterThanOrEqual(descriptionBottom);

    // No validation messages initially
    await expect(createBugModal.titleRequiredError).not.toBeVisible();
    await expect(createBugModal.ownerRequiredError).not.toBeVisible();
    await expect(createBugModal.descriptionRequiredError).not.toBeVisible();

    // The Title input has focus
    await expect(createBugModal.titleInput).toBeFocused();
  });

  test("Create bug modal opens with owner set to the current user, severity MID and other fields empty", async ({
    boardPage,
    createBugModal,
  }) => {
    // Act
    await boardPage.openNewBugModal();

    // Assert
    await expect(createBugModal.titleInput).toHaveValue("");
    await expect(createBugModal.descriptionInput).toHaveValue("");
    await expect(createBugModal.ownerInput).toHaveValue(user.username);
    await expect(createBugModal.severitySelect).toHaveValue("mid");
  });

  test("Save button uses the primary theme color", async ({
    boardPage,
    createBugModal,
  }) => {
    // Act
    await boardPage.openNewBugModal();

    // Assert: #b8ae76 from specs/design/theme.md
    await expect(createBugModal.saveButton).toHaveCSS(
      "background-color",
      "rgb(184, 174, 118)",
    );
  });
});
