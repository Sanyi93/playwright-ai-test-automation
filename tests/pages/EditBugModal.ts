import { type Locator, type Page } from "@playwright/test";

export class EditBugModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", { name: /^Edit bug #\d+$/ });
    this.deleteButton = this.dialog.getByRole("button", { name: "Delete" });
  }

  async delete(): Promise<void> {
    await this.deleteButton.click();
  }
}
