import { test as base } from "@playwright/test";
import { LoginPage } from "../tests/pages/LoginPage";
import { BoardPage } from "../tests/pages/BoardPage";
import { CreateBugModal } from "../tests/pages/CreateBugModal";
import { EditBugModal } from "../tests/pages/EditBugModal";
import { BugsApi } from "../tests/api/BugsApi";

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
