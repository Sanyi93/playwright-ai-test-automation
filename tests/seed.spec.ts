import { test, expect } from "./fixtures";
import users from "../users.json" with { type: "json" };

const [user] = users;

test.describe("Test group", () => {
  test("seed", { tag: '@seed' }, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await expect(page).toHaveURL(/\/board$/);
  });
});
