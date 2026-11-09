import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { BoardPage } from "../pages/BoardPage";
import { CreateBugModal } from "../pages/CreateBugModal";
import { EditBugModal } from "../pages/EditBugModal";
import { BugsApi } from "../api/BugsApi";

interface Fixtures {
  loginPage: LoginPage;
  boardPage: BoardPage;
  createBugModal: CreateBugModal;
  editBugModal: EditBugModal;
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
  editBugModal: async ({ page }, use) => {
    await use(new EditBugModal(page));
  },
  bugsApi: async ({ request }, use) => {
    const bugsApi = new BugsApi(request);
    await use(bugsApi);
    await bugsApi.deleteCreated();
  },
});

export { expect } from "@playwright/test";
