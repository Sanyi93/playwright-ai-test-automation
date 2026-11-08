import { test, expect } from "./fixtures";
import users from "../users.json" with { type: "json" };

const user = users.find((u) => u.username === "buggy");
if (!user) {
  throw new Error('Default user "buggy" not found in users.json');
}

test("user can log in and create a new bug", async ({
  page,
  loginPage,
  boardPage,
  createBugModal,
}) => {
  // Arrange
  const bugTitle = `Login fails with special characters ${Date.now()}`;

  await loginPage.goto();
  await loginPage.login(user.username, user.password);
  await expect(page).toHaveURL(/\/board$/);

  // Act
  await boardPage.openNewBugModal();
  await createBugModal.fill({
    title: bugTitle,
    severity: "HIGH",
    description: "When I use < and > in my password, login fails.",
  });
  await createBugModal.save();

  // Assert
  await expect(createBugModal.dialog).toBeHidden();
  const newBugRow = boardPage.bugRowByTitle(bugTitle);
  await expect(newBugRow).toBeVisible();
  await expect(newBugRow).toContainText("HIGH");
  await expect(newBugRow).toContainText(user.username);
});
