// spec: specs/testing/create-bug.md
// seed: tests/seed.spec.ts

import { test, expect } from "../../tests-vibed/fixtures";
import users from "../../users.json" with { type: "json" };

const [user] = users;

test.describe("Modal contents and defaults", () => {
  test("New Bug button opens the Create bug modal with all fields", async ({
    page,
    loginPage,
    boardPage,
    createBugModal,
  }) => {
    // Starting state: logged in as buggy, on /board
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/board$/);

    // 1. From /board click the 'New Bug' button in the title bar.
    await boardPage.openNewBugModal();

    const dialog = createBugModal.dialog;
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Create bug" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Close", exact: true }),
    ).toBeVisible();

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
    await expect(page.getByText("Title is required.")).not.toBeVisible();
    await expect(page.getByText("Owner is required.")).not.toBeVisible();
    await expect(page.getByText("Description is required.")).not.toBeVisible();

    // The Title input has focus
    await expect(createBugModal.titleInput).toBeFocused();
  });
});
