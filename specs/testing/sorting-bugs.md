# BuggyBoard - Sorting Bugs Test Plan

## Application Overview

Test plan for sorting the bug board in BuggyBoard (http://localhost:5173). It is based on `specs/features/10-sort-board-columns.md` and on live exploration of the app with `playwright-cli`.

**Observed app behaviour that the expected results rely on:**

- **Headers:** the table `"Bugs"` has four column headers: ID, Severity, Title and Owner. Each header contains a button with the same accessible name, for example `getByRole('columnheader', { name: 'Title' }).getByRole('button')`.
- **Sort indicator:** the sorted column's header has `aria-sort="ascending"` or `aria-sort="descending"`. Its button shows an arrow, `↑` for ascending or `↓` for descending, which is hidden from screen readers (`aria-hidden`), so it is not part of the button's accessible name. Unsorted headers have no `aria-sort` attribute and show no arrow.
- **Default sort:** Severity, descending (HIGH, MID, LOW).
- **Clicking:** a header for a column that is not sorted sorts it ascending. Clicking the sorted column again flips the direction. Only one column is sorted at a time.
- **Sort rules:**
  - ID sorts numerically.
  - Severity ascending is LOW, MID, HIGH, and descending is HIGH, MID, LOW.
  - Title and Owner sort alphabetically and ignore case (`localeCompare`), so `alice, Bob, carol` is ascending.
  - Rows with equal values keep their original order, which is ascending ID, in both directions.
- **Persistence:** the sort stays when switching the Open and Closed filters, when changing or clearing the search, and when opening and cancelling the Edit bug modal. Reloading the page resets the sort to Severity descending and clears the search.
- **Keyboard:** with a header button focused, Enter or Space toggles the sort just like a click.

## Test Data and Setup

These rules apply to every scenario:

- **Only the test's own data:** each test creates its bugs in `beforeEach` through the API (`POST /api/bugs`, expecting `201`), using one unique token per test, for example `zq<uuid>`. The test then types that token into "Search bugs by title", so the board shows only its own bugs. Every order assertion is made on the visible rows, `boardPage.bugRows`, while that search is active. No test may depend on bugs that exist on the board for any other reason.
- **Standard data set:** unless a scenario says otherwise, `beforeEach` creates these four open bugs, in this order, so their IDs are ascending in this order:

  | Created | Title | Severity | Owner |
  |---|---|---|---|
  | 1st | `<token> banana` | HIGH | `carol` |
  | 2nd | `<token> Apple` | LOW | `alice` |
  | 3rd | `<token> cherry` | MID | `Bob` |
  | 4th | `<token> date` | MID | `dave` |

  Titles differ in their first letter and mix upper and lower case, owners mix case too, and two bugs share a severity. That covers case-insensitive sorting and equal values without depending on how a locale orders words that differ only in case.
- **Expected orders for the standard data set** (by title word):

  | Sort | Order |
  |---|---|
  | Severity descending (default) | banana, cherry, date, Apple |
  | Severity ascending | Apple, cherry, date, banana |
  | Title ascending | Apple, banana, cherry, date |
  | Title descending | date, cherry, banana, Apple |
  | Owner ascending | Apple (alice), cherry (Bob), banana (carol), date (dave) |
  | Owner descending | date (dave), banana (carol), cherry (Bob), Apple (alice) |
  | ID ascending | banana, Apple, cherry, date |
  | ID descending | date, cherry, Apple, banana |

  cherry stays before date in both severity directions, because equal values keep their ID order.
- **Order:** create the bugs first, then open `/board` (or reload), so that the board's first `GET /api/bugs` includes them. Then apply the search.
- **Cleanup (`afterEach`):** delete every bug the test created by its recorded ID, accepting `204` or `404`. Then call `GET /api/bugs` and delete any remaining bug whose title starts with the test's token, as a safety net. When the suite finishes, no bug containing any test's token may remain. If the database was empty before the run, it is empty again afterwards. Tests never delete bugs they did not create.
- **Shared login (CLAUDE.md rule 7):** log in once per file in `beforeAll` and reuse the saved storage state. The login is the only thing tests share.
- **Seed:** `tests/seed.spec.ts` (logs in as `buggy`, the first user in `users.json`, and lands on `/board`).

## Test Scenarios

### 1. Default sort

**Seed:** `tests/seed.spec.ts`

#### 1.1 Board loads sorted by Severity descending

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Read the titles of the visible rows from top to bottom.
    - expect: The order is banana (HIGH), cherry (MID), date (MID), Apple (LOW).

#### 1.2 Only the Severity header shows a sort indicator by default

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Inspect the four column headers.
    - expect: The Severity header has `aria-sort="descending"`, and its button contains `↓`.
    - expect: The ID, Title and Owner headers have no `aria-sort` attribute, and their buttons contain neither `↑` nor `↓`.

### 2. Sorting by clicking a header

**Seed:** `tests/seed.spec.ts`

#### 2.1 First click on Title sorts ascending

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Click the Title header button.
    - expect: The order is Apple, banana, cherry, date.
    - expect: The Title header has `aria-sort="ascending"`, and its button contains `↑`.
    - expect: No other header has an `aria-sort` attribute.

#### 2.2 Second click on Title sorts descending

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the Title header once.

**Steps:**
  1. Click the Title header button again.
    - expect: The order is date, cherry, banana, Apple.
    - expect: The Title header has `aria-sort="descending"`, and its button contains `↓`.

#### 2.3 Third click on Title returns to ascending

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the Title header twice.

**Steps:**
  1. Click the Title header button a third time.
    - expect: The order is Apple, banana, cherry, date, and the Title header has `aria-sort="ascending"`.

#### 2.4 Owner sorts ascending and ignores case

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Click the Owner header button.
    - expect: The owners from top to bottom are alice, Bob, carol, dave, so the uppercase "Bob" sits between "alice" and "carol".
    - expect: The Owner header has `aria-sort="ascending"`.

#### 2.5 Owner sorts descending on the second click

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the Owner header once.

**Steps:**
  1. Click the Owner header button again.
    - expect: The owners from top to bottom are dave, carol, Bob, alice.
    - expect: The Owner header has `aria-sort="descending"`.

#### 2.6 ID sorts ascending on the first click

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Click the ID header button.
    - expect: The rows are in creation order, banana, Apple, cherry, date, and their ID cells are strictly increasing when compared as numbers.
    - expect: The ID header has `aria-sort="ascending"`.

#### 2.7 ID sorts descending on the second click

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the ID header once.

**Steps:**
  1. Click the ID header button again.
    - expect: The order is date, cherry, Apple, banana, and the ID cells are strictly decreasing.
    - expect: The ID header has `aria-sort="descending"`.

### 3. Sorting by Severity

**Seed:** `tests/seed.spec.ts`

#### 3.1 Clicking Severity once from the default sorts LOW, MID, HIGH

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`. The board is already sorted by Severity descending.

**Steps:**
  1. Click the Severity header button.
    - expect: The severities from top to bottom are LOW, MID, MID, HIGH, which is Apple, cherry, date, banana.
    - expect: The Severity header has `aria-sort="ascending"`, and its button contains `↑`.
  - Note: because Severity is already the sorted column, this click flips the direction. That is how the spec's scenario "clicks the Severity column header once (ascending)" works out.

#### 3.2 Clicking Severity again sorts HIGH, MID, LOW

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the Severity header once (ascending).

**Steps:**
  1. Click the Severity header button again.
    - expect: The severities from top to bottom are HIGH, MID, MID, LOW, which is banana, cherry, date, Apple.
    - expect: The Severity header has `aria-sort="descending"`, and its button contains `↓`.

#### 3.3 Bugs with equal severity keep their ID order in both directions

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. With the default Severity descending sort, find the two MID rows.
    - expect: cherry, the lower ID, is directly above date.
  2. Click the Severity header button (ascending).
    - expect: cherry is still directly above date.

### 4. One sorted column at a time

**Seed:** `tests/seed.spec.ts`

#### 4.1 Sorting by Severity after Owner removes the Owner indicator

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the Owner header once.
  - expect (precondition): the Owner header has `aria-sort="ascending"`.

**Steps:**
  1. Click the Severity header button.
    - expect: The Severity header has `aria-sort="ascending"`, because it was not the sorted column, so the first click sorts ascending.
    - expect: The Owner header no longer has an `aria-sort` attribute, and its button contains no arrow.
    - expect: The order is Apple, cherry, date, banana, so it is sorted by severity only, with ties in ID order rather than owner order.

#### 4.2 A newly selected column always starts ascending

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the Title header twice (descending).

**Steps:**
  1. Click the Owner header button.
    - expect: The Owner header has `aria-sort="ascending"`, not descending.
    - expect: The Title header has no `aria-sort` attribute.
    - expect: The owners are alice, Bob, carol, dave.

### 5. Sort persistence

**Seed:** `tests/seed.spec.ts`

#### 5.1 The sort survives switching between the Open and Closed filters

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the ID header twice (descending).

**Steps:**
  1. Click the "Closed" filter button, using an exact name match (`{ name: 'Closed', exact: true }`), then click "Open" the same way.
    - expect: The ID header still has `aria-sort="descending"`.
    - expect: The order is still date, cherry, Apple, banana.

#### 5.2 The sort survives clearing and re-entering the search

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the Title header once (ascending).

**Steps:**
  1. Clear the search field, then type `<token>` again.
    - expect: The Title header still has `aria-sort="ascending"`.
    - expect: The order is Apple, banana, cherry, date.

#### 5.3 Reloading the page resets the sort to the default

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click the Owner header once.

**Steps:**
  1. Reload the page.
    - expect: The Severity header has `aria-sort="descending"`, and the Owner header has none.
    - expect: The search field is empty.
  2. Search for `<token>` again.
    - expect: The order is banana, cherry, date, Apple.
  - Note: the spec does not say whether the sort should survive a reload. This records current behaviour. If the product decides the sort should persist, this scenario must change.

### 6. Keyboard and accessibility

**Seed:** `tests/seed.spec.ts`

#### 6.1 Enter and Space on a focused header toggle the sort

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Focus the Title header button (for example with `focus()` on its locator) and press Enter.
    - expect: The Title header has `aria-sort="ascending"`, and the order is Apple, banana, cherry, date.
  2. Press Space.
    - expect: The Title header has `aria-sort="descending"`, and the order is date, cherry, banana, Apple.

#### 6.2 The arrow is not part of the header button's accessible name

**File:** `tests/sorting-bugs.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Inspect the Severity header button while it is the sorted column.
    - expect: Its accessible name is exactly "Severity", so `getByRole('button', { name: 'Severity', exact: true })` matches it, even though it visibly shows `↓`.
    - expect: The sort direction is exposed through the header's `aria-sort` attribute instead.

## Not Covered or Not Verified

- **Numeric ID sorting across digit counts** (for example 9 before 10): tests cannot choose the IDs the database assigns, and current IDs all have the same number of digits. The app compares IDs as numbers (`a.id - b.id`). Scenario 2.6 checks the numeric order of the IDs it gets, but it cannot force a digit-count boundary.
- **Titles that differ only in case** (for example "apple" and "Apple"): during exploration "apple" sorted above "Apple", but this depends on the browser's locale, so the standard data set avoids it.
- **Sorting the Closed view on its own data:** the sort carries over to the Closed view (scenario 5.1), but sorting a list of closed bugs was not checked separately.
