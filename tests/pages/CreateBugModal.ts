import { type Locator, type Page } from "@playwright/test";

export type Severity = "HIGH" | "MID" | "LOW";

export interface NewBugData {
  title: string;
  severity: Severity;
  description: string;
  owner?: string;
}

export class CreateBugModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly titleInput: Locator;
  readonly severitySelect: Locator;
  readonly ownerInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", { name: "Create bug" });
    this.titleInput = this.dialog.getByLabel("Title");
    this.severitySelect = this.dialog.getByLabel("Severity");
    this.ownerInput = this.dialog.getByLabel("Owner");
    this.descriptionInput = this.dialog.getByLabel("Description");
    this.saveButton = this.dialog.getByRole("button", { name: "Save" });
    this.cancelButton = this.dialog.getByRole("button", { name: "Cancel" });
  }

  async fill(bug: NewBugData): Promise<void> {
    await this.titleInput.fill(bug.title);
    await this.severitySelect.selectOption({ label: bug.severity });
    if (bug.owner !== undefined) {
      await this.ownerInput.fill(bug.owner);
    }
    await this.descriptionInput.fill(bug.description);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
