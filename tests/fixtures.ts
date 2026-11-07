import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { BoardPage } from "./pages/BoardPage";
import { CreateBugModal } from "./pages/CreateBugModal";
import { BugsApi } from "./api/BugsApi";

interface Fixtures {
  loginPage: LoginPage;
  boardPage: BoardPage;
  createBugModal: CreateBugModal;
  bugsApi: BugsApi;
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  boardPage: async ({ page }, use) => {
    await use(new BoardPage(page));
  },
  createBugModal: async ({ page }, use) => {
    await use(new CreateBugModal(page));
  },
  bugsApi: async ({ request }, use) => {
    const bugsApi = new BugsApi(request);
    await use(bugsApi);
    await bugsApi.deleteCreated();
  },
});

export { expect } from "@playwright/test";
