# BuggyBoard - Bug Status Test Plan

## Application Overview

Test plan for bug states (Open and Closed) and the board's state filter in BuggyBoard (http://localhost:5173). It is based on `specs/features/13-bug-status.md` and on live exploration with `playwright-cli`.

The existing tests click the Closed filter only as a step in other flows: deleting a closed bug, and checking that the sort survives a filter change. None tests the filter itself, the default state of new bugs, or changing a bug's state.

**Observed app behaviour that the expected results rely on:**

- **New bugs:** they are created with state `OPEN`, both through the Create bug modal and through `POST /api/bugs` without a state.
- **State filter:** a `group` named "Filter by bug state", centred above the table (its centre matches the table's centre), with no "State:" label. It has two buttons, "Open" and "Closed".
- **Selected option:** shown by its background. The selected button has the primary colour `rgb(184, 174, 118)` (`#b8ae76`), and the other button is transparent. Clicking the selected button again changes nothing. The buttons have no `aria-pressed` attribute.
- **Default and reload:** the default is "Open", and the filter returns to "Open" when the page is reloaded.
- **Filtering:** the table shows only bugs with the selected state. Search and sort apply to the filtered bugs. When nothing matches, the table shows "No bugs matched.", as long as the database holds at least one bug.
- **Changing the state:** the Edit bug modal has a "State" select with the options Open (`open`) and Closed (`closed`). Saving a bug as Closed removes it from the Open view and shows it in the Closed view.

## Test Data and Setup

- **Fixtures:** import `test` and `expect` from `tests/fixtures/auth.ts`, so tests start logged in.
- **Own data only:** in `beforeEach`, create the bugs a test needs through the API, with titles that start with a unique token per test. To make a closed bug, create it and then send `PUT /api/bugs/<id>` with all its fields and `state: "closed"`, expecting `200`. Then open `/board` and search for `<token>`.
- **Standard data set:** `<token> open high` (HIGH, open), `<token> open low` (LOW, open), `<token> closed mid` (MID, closed) and `<token> closed high` (HIGH, closed).
- **Cleanup:** in `afterEach`, delete every bug the test created, including any created through the UI, which you find by token. Accept `204` or `404`.
- **Page objects:** use `boardPage` (`openFilterButton`, `closedFilterButton`, `showOpenBugs()`, `showClosedBugs()`, `search()`, `bugRows`, `bugRowByTitle()`, `noBugsMatchedMessage`), `createBugModal`, `editBugModal` (`stateSelect`) and `sorting`. Add a `stateFilter` locator (the group) to `BoardPage`, and `save()` with the Save button to `EditBugModal` if the edit-bug plan has not added it yet.
- **Seed:** `tests/seed.spec.ts`.

## Test Scenarios

### 1. State of new bugs

**Seed:** `tests/seed.spec.ts`

#### 1.1 A bug created in the Create bug modal is Open

**File:** `tests/bug-status/new-bug-state.spec.ts`

**Steps:**
  1. Click "New Bug", enter the title `<token> created in UI` and a description, and click Save.
    - expect: The new bug's row is visible in the Open view.
    - expect: `GET /api/bugs` returns the bug with state `OPEN`.
  2. Click "Closed".
    - expect: The bug is not listed.

#### 1.2 A bug created through the API without a state is Open

**File:** `tests/bug-status/new-bug-state.spec.ts`

**Steps:**
  1. Create `<token> api default` with `POST /api/bugs`, without a `state` field.
    - expect: The response has state `OPEN`.

### 2. State filter

**Seed:** `tests/seed.spec.ts`

#### 2.1 The filter shows Open by default and lists only open bugs

**File:** `tests/bug-status/state-filter.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Inspect the filter and the table.
    - expect: The "Open" button has the background `rgb(184, 174, 118)`, and "Closed" does not.
    - expect: Exactly 2 rows are shown: `<token> open high` and `<token> open low`.

#### 2.2 Selecting Closed lists only closed bugs

**File:** `tests/bug-status/state-filter.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Click "Closed".
    - expect: Exactly 2 rows are shown: `<token> closed mid` and `<token> closed high`.
    - expect: "Closed" now has the background `rgb(184, 174, 118)`, and "Open" is transparent.

#### 2.3 Selecting Open again returns to the open bugs

**File:** `tests/bug-status/state-filter.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click "Closed".

**Steps:**
  1. Click "Open".
    - expect: The 2 open bugs are shown again, and "Open" is the highlighted option.

#### 2.4 Clicking the selected option again changes nothing

**File:** `tests/bug-status/state-filter.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Click "Open", which is already selected.
    - expect: "Open" is still highlighted, and the same 2 open bugs are shown.

#### 2.5 The filter is centred above the table and has no "State:" label

**File:** `tests/bug-status/state-filter.spec.ts`

**Steps:**
  1. Inspect the group named "Filter by bug state".
    - expect: It is above the table: its bottom edge is above the table's top edge.
    - expect: Its horizontal centre is within 4px of the table's horizontal centre.
    - expect: The page has no visible text "State:" next to the filter.

#### 2.6 The filter returns to Open after a reload

**File:** `tests/bug-status/state-filter.spec.ts`

**Arrange:** standard data set, open `/board`, and click "Closed".

**Steps:**
  1. Reload the page.
    - expect: "Open" is highlighted again.
  - The spec only defines the default, not whether the choice should be remembered. This records current behaviour.

### 3. Changing a bug's state

**Seed:** `tests/seed.spec.ts`

#### 3.1 The Edit bug modal shows the bug's state

**File:** `tests/bug-status/change-state.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Open `<token> open high`.
    - expect: The State field's value is `open`, and its options are Open and Closed.
  2. Close the modal, click "Closed", and open `<token> closed mid`.
    - expect: The State field's value is `closed`.

#### 3.2 Closing a bug moves it from the Open view to the Closed view

**File:** `tests/bug-status/change-state.spec.ts`

**Arrange:** standard data set, open `/board`, and search for `<token>`.

**Steps:**
  1. Open `<token> open high`, set State to Closed, and click Save.
    - expect: The modal closes, and `<token> open high` is no longer listed in the Open view.
  2. Click "Closed".
    - expect: `<token> open high` is listed.
    - expect: `GET /api/bugs/<id>` returns state `CLOSED`.

#### 3.3 Reopening a bug moves it back to the Open view

**File:** `tests/bug-status/change-state.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click "Closed".

**Steps:**
  1. Open `<token> closed mid`, set State to Open, and click Save.
    - expect: It is no longer listed in the Closed view.
  2. Click "Open".
    - expect: `<token> closed mid` is listed, and `GET /api/bugs/<id>` returns state `OPEN`.

### 4. Filter with search and sort

**Seed:** `tests/seed.spec.ts`

#### 4.1 Search applies only to bugs with the selected state

**File:** `tests/bug-status/filter-search-sort.spec.ts`

**Arrange:** standard data set, open `/board`.

**Steps:**
  1. Search for `<token> high`.
    - expect: In the Open view, only `<token> open high` is listed.
  2. Click "Closed".
    - expect: Only `<token> closed high` is listed.

#### 4.2 Sorting applies to bugs with the selected state

**File:** `tests/bug-status/filter-search-sort.spec.ts`

**Arrange:** standard data set, open `/board`, search for `<token>`, and click "Closed".

**Steps:**
  1. Read the rows with the default sort, Severity descending.
    - expect: The order is `<token> closed high`, then `<token> closed mid`.
  2. Click the Severity header (ascending).
    - expect: The order is `<token> closed mid`, then `<token> closed high`.

#### 4.3 A state with no matching bugs shows "No bugs matched."

**File:** `tests/bug-status/filter-search-sort.spec.ts`

**Arrange:** create only open bugs: `<token> open high` and `<token> open low`. Open `/board` and search for `<token>`.

**Steps:**
  1. Click "Closed".
    - expect: No bug rows are shown, and the table shows "No bugs matched.".
  - The test's own open bugs guarantee that the database is not empty, so the board shows "No bugs matched." rather than "No bugs.".

### 5. Observations

**Seed:** `tests/seed.spec.ts`

#### 5.1 Observation: the selected filter is not announced to screen readers

**File:** `tests/bug-status/state-filter.spec.ts`

**Steps:**
  1. Inspect the "Open" and "Closed" buttons.
    - OBSERVED: neither has `aria-pressed` (or a similar attribute), so the selection is shown only by colour.
    - expect (suggested): the selected button has `aria-pressed="true"` and the other `aria-pressed="false"`.
  - The spec only asks for a clear visual indication, which the app meets. Record this as an accessibility improvement for the product owner to decide on.

## Not Covered or Not Verified

- **More than two states:** the app only supports Open and Closed.
- **Who may close or reopen a bug:** any logged-in user can. Permissions are not specified.
- **Deleting closed bugs:** covered in `specs/testing/delete-bug.md`, scenario 2.5.
