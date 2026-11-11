import { type Locator, type Page } from "@playwright/test";

export class EditBugModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly deleteButton: Locator;
  readonly stateSelect: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", { name: /^Edit bug #\d+$/ });
    this.deleteButton = this.dialog.getByRole("button", { name: "Delete" });
    this.stateSelect = this.dialog.getByLabel("State", { exact: true });
    this.errorAlert = this.dialog.getByRole("alert");
  }

  async delete(): Promise<void> {
    await this.deleteButton.click();
  }
}
