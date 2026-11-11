import { expect, type Locator, type Page } from "@playwright/test";

export type SortColumn = "ID" | "Severity" | "Title" | "Owner";
export type SortDirection = "ascending" | "descending";

export const SORT_COLUMNS: SortColumn[] = ["ID", "Severity", "Title", "Owner"];

/** Position of each column in the board table (1-based, for :nth-child). */
const COLUMN_NUMBER: Record<SortColumn, number> = {
  ID: 1,
  Severity: 2,
  Title: 3,
  Owner: 4,
};

/** Sortable column headers of the board's "Bugs" table and their indicators. */
export class Sorting {
  readonly page: Page;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.getByRole("table", { name: "Bugs" });
  }

  header(column: SortColumn): Locator {
    return this.table.getByRole("columnheader", { name: column, exact: true });
  }

  headerButton(column: SortColumn): Locator {
    return this.header(column).getByRole("button");
  }

  /**
   * The header button whose accessible name is exactly `column`. The sort
   * arrow is aria-hidden, so it must not be part of the name.
   */
  headerButtonByExactName(column: SortColumn): Locator {
    return this.table.getByRole("button", { name: column, exact: true });
  }

  async sortBy(column: SortColumn): Promise<void> {
    await this.headerButton(column).click();
  }

  /** The visible rows' cells in `column`, top to bottom. */
  cells(column: SortColumn): Locator {
    return this.table.locator(`tbody tr td:nth-child(${COLUMN_NUMBER[column]})`);
  }

  /** The visible rows' IDs, top to bottom. */
  async ids(): Promise<number[]> {
    return (await this.cells("ID").allTextContents()).map(Number);
  }

  /** Asserts the exact values of `column` in the visible rows, top to bottom. */
  async expectColumnValues(column: SortColumn, values: string[]): Promise<void> {
    await expect(this.cells(column)).toHaveText(values);
  }

  /** Asserts that only `column` shows a sort indicator, in `direction`. */
  async expectSortIndicator(
    column: SortColumn,
    direction: SortDirection,
  ): Promise<void> {
    for (const other of SORT_COLUMNS) {
      const header = this.header(other);
      const button = this.headerButton(other);
      if (other === column) {
        await expect(header).toHaveAttribute("aria-sort", direction);
        await expect(button).toContainText(
          direction === "ascending" ? "↑" : "↓",
        );
      } else {
        await expect(header).not.toHaveAttribute("aria-sort");
        await expect(button).not.toContainText(/[↑↓]/);
      }
    }
  }
}
