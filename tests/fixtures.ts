import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { BoardPage } from "./pages/BoardPage";
import { CreateBugModal } from "./pages/CreateBugModal";

interface PageObjects {
  loginPage: LoginPage;
  boardPage: BoardPage;
  createBugModal: CreateBugModal;
}

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  boardPage: async ({ page }, use) => {
    await use(new BoardPage(page));
  },
  createBugModal: async ({ page }, use) => {
    await use(new CreateBugModal(page));
  },
});

export { expect } from "@playwright/test";
