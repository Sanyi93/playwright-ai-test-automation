import { type Locator, type Page } from "@playwright/test";

export class BoardPage {
  readonly page: Page;
  readonly newBugButton: Locator;
  readonly bugTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newBugButton = page.getByRole("button", { name: "New Bug" });
    this.bugTable = page.getByRole("table", { name: "Bugs" });
  }

  async openNewBugModal(): Promise<void> {
    await this.newBugButton.click();
  }

  bugRowByTitle(title: string): Locator {
    return this.bugTable.locator("tbody tr", { hasText: title });
  }
}
