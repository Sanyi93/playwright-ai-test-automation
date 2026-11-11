# BuggyBoard - Bug Board Display Test Plan

## Application Overview

Test plan for how the board page shows bugs: the table, its columns and the severity colours (http://localhost:5173). It is based on `specs/features/07-bug-board.md` and `specs/features/08-board-severity.md`, and on live exploration with `playwright-cli`.

The existing tests use the board for sorting, searching and deleting, but none checks the table's columns, the row contents, the empty state or the severity colours.

**Observed app behaviour that the expected results rely on:**

- **Table:** `table` named "Bugs", with column headers ID, Severity, Title and Owner, in that order. Each bug row shows the bug's ID, severity, title and owner in those columns.
- **Severity:** the API returns severities in capitals (`HIGH`, `MID`, `LOW`), even when a bug is created with `"high"`, and the board shows them in capitals.
- **Severity badges:** each severity is shown in a badge (`severity-badge severity-badge-high`, `-mid` or `-low`). The text is the severity colour, and the background is the same colour at 22% opacity:

  | Severity | Text colour | Token on `:root` |
  |---|---|---|
  | HIGH | `rgb(184, 74, 46)` (`#b84a2e`) | `--color-severity-high` |
  | MID | `rgb(166, 124, 71)` (`#a67c47`) | `--color-severity-mid` |
  | LOW | `rgb(74, 107, 94)` (`#4a6b5e`) | `--color-severity-low` |

- **Empty board:** when `GET /api/bugs` returns no bugs, the table shows a single row "No bugs.".
- **Long titles:** a 250-character title makes the table wider than the page, but the table scrolls inside its own container, so the page itself does not scroll sideways.

## Test Data and Setup

- **Fixtures:** import `test` and `expect` from `tests/fixtures/auth.ts`, so tests start logged in.
- **Own data only:** in `beforeEach`, create the bugs a test needs through the API (`POST /api/bugs`, expecting `201`), each with a title that starts with a unique token per test (for example `zq<uuid>`). Then open `/board` and type the token into "Search bugs by title", so the table shows only the test's own bugs. Never assert on bugs the test did not create.
- **Standard data set:** three open bugs: `<token> high bug` (HIGH, owner `carol`), `<token> mid bug` (MID, owner `dave`) and `<token> low bug` (LOW, owner `erin`).
- **Cleanup:** in `afterEach`, delete every bug the test created, accepting `204` or `404`. No test bugs may remain after the run.
- **Empty state without an empty database:** scenario 1.5 mocks `GET /api/bugs` with `page.route` to return `[]`, instead of deleting real bugs.
- **Page objects:** use `boardPage` (`bugTable`, `bugRows`, `bugRowByTitle()`, `search()`, `noBugsMessage`) and `sorting.header()` or `sorting.cells()` for the column headers and cells. Add a `severityBadge(title)` method to `BoardPage` that returns the badge in a given bug's row.
- **Seed:** `tests/seed.spec.ts`.

## Test Scenarios

### 1. Bug table

**Seed:** `tests/seed.spec.ts`

#### 1.1 The table has the columns ID, Severity, Title and Owner, in that order

**File:** `tests/bug-board/bug-table.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Read the table's column headers from left to right.
    - expect: They are exactly ID, Severity, Title, Owner.

#### 1.2 Each row shows the bug's ID, severity, title and owner

**File:** `tests/bug-board/bug-table.spec.ts`

**Arrange:** standard data set, keeping the IDs returned by the API. Open `/board` and search for `<token>`.

**Steps:**
  1. Read the cells of the row for `<token> mid bug`.
    - expect: From left to right they are the bug's ID, `MID`, `<token> mid bug` and `dave`.

#### 1.3 The board shows every open bug the test created

**File:** `tests/bug-board/bug-table.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Count the visible bug rows.
    - expect: Exactly 3 rows, one for each created bug.

#### 1.4 Severity is shown in capitals even when created in lower case

**File:** `tests/bug-board/bug-table.spec.ts`

**Arrange:** create one bug with `severity: "low"` and the title `<token> lower case`. Open `/board` and search for `<token>`.

**Steps:**
  1. Read the bug's severity cell.
    - expect: The text is exactly `LOW`.

#### 1.5 An empty board shows "No bugs."

**File:** `tests/bug-board/bug-table.spec.ts`

**Arrange:** route `GET **/api/bugs` (the list only, not `/api/bugs/:id`) to return `200` with body `[]`. Then open `/board`.

**Steps:**
  1. Inspect the table.
    - expect: The column headers are still shown.
    - expect: The table body shows "No bugs.", and there are no bug rows.

#### 1.6 A very long title does not make the page scroll sideways

**File:** `tests/bug-board/bug-table.spec.ts`

**Arrange:** create one bug whose title is `<token> ` followed by 250 characters without spaces. Open `/board` and search for `<token>`.

**Steps:**
  1. Compare the page's width with the viewport.
    - expect: `document.documentElement.scrollWidth` equals the viewport width, so only the table area scrolls.
    - expect: The title bar's "Logout" button is still visible.

### 2. Severity colours

**Seed:** `tests/seed.spec.ts`

#### 2.1 HIGH severity uses the terracotta colour

**File:** `tests/bug-board/severity-colors.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Inspect the severity badge in the `<token> high bug` row.
    - expect: Its text colour is `rgb(184, 74, 46)`.
    - expect: Its background is the same colour with an alpha of about 0.22, so it reads as a light tint of the text colour.

#### 2.2 MID severity uses the amber colour

**File:** `tests/bug-board/severity-colors.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Inspect the severity badge in the `<token> mid bug` row.
    - expect: Its text colour is `rgb(166, 124, 71)`, with a background tint of the same colour.

#### 2.3 LOW severity uses the sage colour

**File:** `tests/bug-board/severity-colors.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Inspect the severity badge in the `<token> low bug` row.
    - expect: Its text colour is `rgb(74, 107, 94)`, with a background tint of the same colour.

#### 2.4 The three severity colours are different from each other

**File:** `tests/bug-board/severity-colors.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Read the text colours of the three badges.
    - expect: All three are different.

#### 2.5 The severity colours are defined as design tokens

**File:** `tests/bug-board/severity-colors.spec.ts`

**Steps:**
  1. Open `/board` and read the CSS custom properties on the document's root element.
    - expect: `--color-severity-high` is `#b84a2e`, `--color-severity-mid` is `#a67c47`, and `--color-severity-low` is `#4a6b5e`.

## Not Covered or Not Verified

- **What happens when loading the bugs fails:** a `500` on `GET /api/bugs` shows "No bugs." with no error message. This is already recorded as possible defect D3 in `specs/testing/search-form.md`, so it is not repeated here.
- **"Severity colors are visually distinct" as a human judgement:** scenario 2.4 only checks that the colours differ. Whether they are easy to tell apart, including for colour-blind users, needs a person to review.
- **The real empty-database state:** scenario 1.5 mocks the API. Emptying the shared database would break other tests running at the same time.
