import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { BoardPage } from "../pages/BoardPage";
import { CreateBugModal } from "../pages/CreateBugModal";
import { EditBugModal } from "../pages/EditBugModal";
import { DeleteBugConfirmModal } from "../pages/DeleteBugConfirmModal";
import { Sorting } from "../pages/Sorting";

/** One test-scoped fixture per page object in tests/pages/. */
type PageFixtures = {
  loginPage: LoginPage;
  boardPage: BoardPage;
  createBugModal: CreateBugModal;
  editBugModal: EditBugModal;
  deleteBugConfirmModal: DeleteBugConfirmModal;
  sorting: Sorting;
};

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  boardPage: async ({ page }, use) => {
    await use(new BoardPage(page));
  },
  createBugModal: async ({ page }, use) => {
    await use(new CreateBugModal(page));
  },
  editBugModal: async ({ page }, use) => {
    await use(new EditBugModal(page));
  },
  deleteBugConfirmModal: async ({ page }, use) => {
    await use(new DeleteBugConfirmModal(page));
  },
  sorting: async ({ page }, use) => {
    await use(new Sorting(page));
  },
});

export { expect } from "@playwright/test";
