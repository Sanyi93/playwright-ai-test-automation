// spec: specs/testing/sorting-bugs.md
// seed: tests/seed.spec.ts

import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures/auth";
import type { ApiSeverity, Bug } from "./api/BugsApiClient";

/** The standard data set from the plan, created in this order. */
const STANDARD_BUGS: { word: string; severity: ApiSeverity; owner: string }[] = [
  { word: "banana", severity: "high", owner: "carol" },
  { word: "Apple", severity: "low", owner: "alice" },
  { word: "cherry", severity: "mid", owner: "Bob" },
  { word: "date", severity: "mid", owner: "dave" },
];

/** Unique per test; the board is searched for it so only this test's bugs show. */
let token: string;
/** IDs of the bugs the current test created, deleted again in afterEach. */
let createdIds: number[] = [];

/** Full titles for the given words, in the given order. */
function titles(...words: string[]): string[] {
  return words.map((word) => `${token} ${word}`);
}

test.describe("Sorting bugs", () => {
  // Arrange (shared): create the standard data set and show only those bugs
  test.beforeEach(async ({ page, request, boardPage }) => {
    createdIds = [];
    token = `zq${randomUUID().replace(/-/g, "")}`;
    for (const { word, severity, owner } of STANDARD_BUGS) {
      const response = await request.post("/api/bugs", {
        data: {
          title: `${token} ${word}`,
          severity,
          owner,
          description: "Created for a sorting test.",
        },
      });
      expect(response.status(), `create bug "${word}"`).toBe(201);
      createdIds.push(((await response.json()) as Bug).id);
    }

    await page.goto("/board");
    await expect(page).toHaveURL(/\/board$/);
    await boardPage.search(token);
    await expect(boardPage.bugRows).toHaveCount(STANDARD_BUGS.length);
  });

  // Cleanup: delete this test's bugs, then sweep any left over with its token
  test.afterEach(async ({ request }) => {
    for (const id of createdIds) {
      const response = await request.delete(`/api/bugs/${id}`);
      expect([204, 404], `clean up bug ${id}`).toContain(response.status());
    }
    createdIds = [];

    const listResponse = await request.get("/api/bugs");
    const leftovers = ((await listResponse.json()) as Bug[]).filter((bug) =>
      bug.title.startsWith(token),
    );
    for (const bug of leftovers) {
      await request.delete(`/api/bugs/${bug.id}`);
    }
  });

  test.describe("Default sort", () => {
    test("board loads sorted by Severity descending", async ({ sorting }) => {
      // Assert
      await sorting.expectColumnValues(
        "Title",
        titles("banana", "cherry", "date", "Apple"),
      );
    });

    test("only the Severity header shows a sort indicator by default", async ({
      sorting,
    }) => {
      // Assert
      await sorting.expectSortIndicator("Severity", "descending");
    });
  });

  test.describe("Sorting by clicking a header", () => {
    test("first click on Title sorts ascending", async ({ sorting }) => {
      // Act
      await sorting.sortBy("Title");

      // Assert
      await sorting.expectColumnValues(
        "Title",
        titles("Apple", "banana", "cherry", "date"),
      );
      await sorting.expectSortIndicator("Title", "ascending");
    });

    test("second click on Title sorts descending", async ({ sorting }) => {
      // Arrange
      await sorting.sortBy("Title");

      // Act
      await sorting.sortBy("Title");

      // Assert
      await sorting.expectColumnValues(
        "Title",
        titles("date", "cherry", "banana", "Apple"),
      );
      await sorting.expectSortIndicator("Title", "descending");
    });

    test("third click on Title returns to ascending", async ({ sorting }) => {
      // Arrange
      await sorting.sortBy("Title");
      await sorting.sortBy("Title");

      // Act
      await sorting.sortBy("Title");

      // Assert
      await sorting.expectColumnValues(
        "Title",
        titles("Apple", "banana", "cherry", "date"),
      );
      await sorting.expectSortIndicator("Title", "ascending");
    });

    test("Owner sorts ascending and ignores case", async ({ sorting }) => {
      // Act
      await sorting.sortBy("Owner");

      // Assert
      await sorting.expectColumnValues("Owner", ["alice", "Bob", "carol", "dave"]);
      await sorting.expectSortIndicator("Owner", "ascending");
    });

    test("Owner sorts descending on the second click", async ({ sorting }) => {
      // Arrange
      await sorting.sortBy("Owner");

      // Act
      await sorting.sortBy("Owner");

      // Assert
      await sorting.expectColumnValues("Owner", ["dave", "carol", "Bob", "alice"]);
      await sorting.expectSortIndicator("Owner", "descending");
    });

    test("ID sorts ascending on the first click", async ({ sorting }) => {
      // Act
      await sorting.sortBy("ID");

      // Assert
      await sorting.expectColumnValues(
        "Title",
        titles("banana", "Apple", "cherry", "date"),
      );
      const ids = await sorting.ids();
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
      expect(new Set(ids).size).toBe(ids.length);
      await sorting.expectSortIndicator("ID", "ascending");
    });

    test("ID sorts descending on the second click", async ({ sorting }) => {
      // Arrange
      await sorting.sortBy("ID");

      // Act
      await sorting.sortBy("ID");

      // Assert
      await sorting.expectColumnValues(
        "Title",
        titles("date", "cherry", "Apple", "banana"),
      );
      const ids = await sorting.ids();
      expect(ids).toEqual([...ids].sort((a, b) => b - a));
      expect(new Set(ids).size).toBe(ids.length);
      await sorting.expectSortIndicator("ID", "descending");
    });
  });

  test.describe("Sorting by Severity", () => {
    test("clicking Severity once from the default sorts LOW, MID, HIGH", async ({
      sorting,
    }) => {
      // Act
      await sorting.sortBy("Severity");

      // Assert
      await sorting.expectColumnValues("Severity", ["LOW", "MID", "MID", "HIGH"]);
      await sorting.expectColumnValues(
        "Title",
        titles("Apple", "cherry", "date", "banana"),
      );
      await sorting.expectSortIndicator("Severity", "ascending");
    });

    test("clicking Severity again sorts HIGH, MID, LOW", async ({ sorting }) => {
      // Arrange
      await sorting.sortBy("Severity");

      // Act
      await sorting.sortBy("Severity");

      // Assert
      await sorting.expectColumnValues("Severity", ["HIGH", "MID", "MID", "LOW"]);
      await sorting.expectColumnValues(
        "Title",
        titles("banana", "cherry", "date", "Apple"),
      );
      await sorting.expectSortIndicator("Severity", "descending");
    });

    test("bugs with equal severity keep their ID order in both directions", async ({
      sorting,
    }) => {
      // Assert: default (descending), cherry (lower ID) directly above date
      await sorting.expectColumnValues(
        "Title",
        titles("banana", "cherry", "date", "Apple"),
      );

      // Act
      await sorting.sortBy("Severity");

      // Assert: ascending, cherry still directly above date
      await sorting.expectColumnValues(
        "Title",
        titles("Apple", "cherry", "date", "banana"),
      );
    });
  });

  test.describe("One sorted column at a time", () => {
    test("sorting by Severity after Owner removes the Owner indicator", async ({
      sorting,
    }) => {
      // Arrange
      await sorting.sortBy("Owner");
      await expect(sorting.header("Owner")).toHaveAttribute(
        "aria-sort",
        "ascending",
      );

      // Act
      await sorting.sortBy("Severity");

      // Assert
      await sorting.expectSortIndicator("Severity", "ascending");
      await sorting.expectColumnValues(
        "Title",
        titles("Apple", "cherry", "date", "banana"),
      );
    });

    test("a newly selected column always starts ascending", async ({
      sorting,
    }) => {
      // Arrange
      await sorting.sortBy("Title");
      await sorting.sortBy("Title");

      // Act
      await sorting.sortBy("Owner");

      // Assert
      await sorting.expectSortIndicator("Owner", "ascending");
      await sorting.expectColumnValues("Owner", ["alice", "Bob", "carol", "dave"]);
    });
  });

  test.describe("Sort persistence", () => {
    test("the sort survives switching between the Open and Closed filters", async ({
      boardPage,
      sorting,
    }) => {
      // Arrange
      await sorting.sortBy("ID");
      await sorting.sortBy("ID");

      // Act
      await boardPage.showClosedBugs();
      await boardPage.showOpenBugs();

      // Assert
      await sorting.expectSortIndicator("ID", "descending");
      await sorting.expectColumnValues(
        "Title",
        titles("date", "cherry", "Apple", "banana"),
      );
    });

    test("the sort survives clearing and re-entering the search", async ({
      boardPage,
      sorting,
    }) => {
      // Arrange
      await sorting.sortBy("Title");

      // Act
      await boardPage.search("");
      await boardPage.search(token);

      // Assert
      await sorting.expectSortIndicator("Title", "ascending");
      await sorting.expectColumnValues(
        "Title",
        titles("Apple", "banana", "cherry", "date"),
      );
    });

    test("reloading the page resets the sort to the default", async ({
      page,
      boardPage,
      sorting,
    }) => {
      // Arrange
      await sorting.sortBy("Owner");

      // Act
      await page.reload();

      // Assert
      await sorting.expectSortIndicator("Severity", "descending");
      await expect(boardPage.searchInput).toHaveValue("");
      await boardPage.search(token);
      await sorting.expectColumnValues(
        "Title",
        titles("banana", "cherry", "date", "Apple"),
      );
    });
  });

  test.describe("Keyboard and accessibility", () => {
    test("Enter and Space on a focused header toggle the sort", async ({
      page,
      sorting,
    }) => {
      // Arrange
      await sorting.headerButton("Title").focus();

      // Act
      await page.keyboard.press("Enter");

      // Assert
      await sorting.expectSortIndicator("Title", "ascending");
      await sorting.expectColumnValues(
        "Title",
        titles("Apple", "banana", "cherry", "date"),
      );

      // Act
      await page.keyboard.press("Space");

      // Assert
      await sorting.expectSortIndicator("Title", "descending");
      await sorting.expectColumnValues(
        "Title",
        titles("date", "cherry", "banana", "Apple"),
      );
    });

    test("the arrow is not part of the header button's accessible name", async ({
      sorting,
    }) => {
      // Assert
      const severityButton = sorting.headerButtonByExactName("Severity");
      await expect(severityButton).toHaveCount(1);
      await expect(severityButton).toContainText("↓");
      await expect(sorting.header("Severity")).toHaveAttribute(
        "aria-sort",
        "descending",
      );
    });
  });
});
