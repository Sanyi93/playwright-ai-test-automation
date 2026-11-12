import { test, expect } from "../fixtures/api";
import type { BoardPage } from "../pages/BoardPage";
import type { CreateBugModal } from "../pages/CreateBugModal";
import users from "../../users.json" with { type: "json" };

const [user] = users;

/**
 * Creates bugs through the UI. Their titles must start with the test's
 * `token`: the token fixture deletes every such bug after the test, through
 * the API, even if the test fails.
 */
async function createBugs(
  boardPage: BoardPage,
  createBugModal: CreateBugModal,
  titles: string[],
): Promise<void> {
  for (const title of titles) {
    await boardPage.openNewBugModal();
    await createBugModal.fill({ title, severity: "MID", description: "Search test bug." });
    await createBugModal.save();
    await expect(createBugModal.dialog).toBeHidden();
  }
}

test.describe("Search board (UI only)", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
  });

  test("shows no bugs when the search matches no bug title", async ({
    boardPage,
    createBugModal,
    token,
  }) => {
    // Arrange: the board must hold at least one bug, or it shows "No bugs."
    await createBugs(boardPage, createBugModal, [`${token} Login fails`]);

    // Act
    await boardPage.search(`${token} no such title`);

    // Assert
    await expect(boardPage.noBugsMatchedMessage).toBeVisible();
    await expect(boardPage.bugRows).toHaveCount(0);
  });

  test("shows only the bug whose title matches exactly one bug", async ({
    boardPage,
    createBugModal,
    token,
  }) => {
    // Arrange
    await createBugs(boardPage, createBugModal, [
      `${token} Login fails`,
      `${token} Logout missing`,
    ]);

    // Act
    await boardPage.search(`${token} Login fails`);

    // Assert
    await expect(boardPage.bugRows).toHaveCount(1);
    await expect(boardPage.bugRowByTitle(`${token} Login fails`)).toBeVisible();
  });

  test("shows only the two bugs whose titles match the search", async ({
    boardPage,
    createBugModal,
    token,
  }) => {
    // Arrange
    await createBugs(boardPage, createBugModal, [
      `${token} Login fails`,
      `${token} Login times out`,
      `${token} Logout missing`,
    ]);

    // Act
    await boardPage.search(`${token} Login`);

    // Assert
    await expect(boardPage.bugRows).toHaveCount(2);
    await expect(boardPage.bugRowByTitle(`${token} Login fails`)).toBeVisible();
    await expect(boardPage.bugRowByTitle(`${token} Login times out`)).toBeVisible();
  });
});
