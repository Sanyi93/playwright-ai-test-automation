import { test, expect } from "./fixtures";
import type { BoardPage } from "./pages/BoardPage";
import type { CreateBugModal } from "./pages/CreateBugModal";
import users from "../users.json" with { type: "json" };

const [user] = users;
let createdTitles: string[] = [];

async function createBugs(
  boardPage: BoardPage,
  createBugModal: CreateBugModal,
  titles: string[]
): Promise<void> {
  for (const title of titles) {
    await boardPage.openNewBugModal();
    await createBugModal.fill({ title, severity: "MID", description: "Search test bug." });
    await createBugModal.save();
    await expect(createBugModal.dialog).toBeHidden();
    createdTitles.push(title);
  }
}

test.describe("Search board (UI only)", () => {
  test.beforeEach(async ({ loginPage }) => {
    createdTitles = [];
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
  });

  test.afterEach(async ({ boardPage, editBugModal }) => {
    await boardPage.search("");
    for (const title of createdTitles) {
      await boardPage.openBug(title);
      await editBugModal.delete();
      await expect(editBugModal.dialog).toBeHidden();
    }
  });

  test("shows no bugs when the search matches no bug title", async ({ boardPage }) => {
    await boardPage.search(`no bug has this title ${Date.now()}`);

    await expect(boardPage.noBugsMatchedMessage).toBeVisible();
    await expect(boardPage.bugRows).toHaveCount(0);
  });

  test("shows only the bug whose title matches exactly one bug", async ({
    boardPage,
    createBugModal,
  }) => {
    const id = Date.now();
    await createBugs(boardPage, createBugModal, [`${id} Login fails`, `${id} Logout missing`]);

    await boardPage.search(`${id} Login fails`);

    await expect(boardPage.bugRows).toHaveCount(1);
    await expect(boardPage.bugRowByTitle(`${id} Login fails`)).toBeVisible();
  });

  test("shows only the two bugs whose titles match the search", async ({
    boardPage,
    createBugModal,
  }) => {
    const id = Date.now();
    await createBugs(boardPage, createBugModal, [
      `${id} Login fails`,
      `${id} Login times out`,
      `${id} Logout missing`,
    ]);

    await boardPage.search(`${id} Login`);

    await expect(boardPage.bugRows).toHaveCount(2);
    await expect(boardPage.bugRowByTitle(`${id} Login fails`)).toBeVisible();
    await expect(boardPage.bugRowByTitle(`${id} Login times out`)).toBeVisible();
  });
});
