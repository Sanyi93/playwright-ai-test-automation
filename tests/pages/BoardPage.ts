import { type Locator, type Page } from "@playwright/test";

export class BoardPage {
  readonly page: Page;
  readonly newBugButton: Locator;
  readonly bugTable: Locator;
  readonly bugRows: Locator;
  readonly searchInput: Locator;
  readonly noBugsMatchedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newBugButton = page.getByRole("button", { name: "New Bug" });
    this.bugTable = page.getByRole("table", { name: "Bugs" });
    // Bug rows are clickable and exposed as buttons; message rows are not.
    this.bugRows = this.bugTable.locator("tbody").getByRole("button");
    this.searchInput = page.getByLabel("Search bugs by title");
    this.noBugsMatchedMessage = this.bugTable.getByText("No bugs matched.");
  }

  async openNewBugModal(): Promise<void> {
    await this.newBugButton.click();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  bugRowByTitle(title: string): Locator {
    return this.bugTable.locator("tbody tr", { hasText: title });
  }

  async openBug(title: string): Promise<void> {
    await this.bugRowByTitle(title).click();
  }
}
