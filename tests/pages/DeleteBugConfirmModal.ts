import { type Locator, type Page } from "@playwright/test";

/** The confirmation modal that opens on top of the Edit bug modal's Delete. */
export class DeleteBugConfirmModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly heading: Locator;
  readonly message: Locator;
  readonly deleteButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", { name: /^Delete bug #\d+\?$/ });
    this.heading = this.dialog.getByRole("heading", { level: 2 });
    this.message = this.dialog.getByText(/cannot be undone/);
    this.deleteButton = this.dialog.getByRole("button", {
      name: "Delete",
      exact: true,
    });
    this.cancelButton = this.dialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    this.closeButton = this.dialog.getByRole("button", {
      name: "Close",
      exact: true,
    });
  }

  async confirm(): Promise<void> {
    await this.deleteButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
