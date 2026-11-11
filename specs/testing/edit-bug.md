# BuggyBoard - Edit Bug Test Plan

## Application Overview

Test plan for editing a bug in BuggyBoard (http://localhost:5173). It is based on `specs/features/09-edit-bug.md` and on live exploration with `playwright-cli`. The existing tests only open the Edit bug modal in order to delete a bug; none edits or saves one.

**Observed app behaviour that the expected results rely on:**

- **Opening:** clicking a bug's row on the board sends `GET /api/bugs/:id` and opens a `dialog` named "Edit bug #<id>". The Title field has focus when it opens.
- **Fields:** ID (read-only, typing into it changes nothing), Title, Severity (select with HIGH, MID and LOW; option values `high`, `mid`, `low`), State (select: Open, Closed), Owner and Description. All fields are prefilled with the bug's current values.
- **Severity colour:** the Severity select's text uses the same colour as the board's severity badge, with the same 22% background tint, and it changes as soon as another severity is selected. For example, MID is `rgb(166, 124, 71)` and HIGH is `rgb(184, 74, 46)`.
- **Buttons:** Delete on the left, Cancel and Save on the right, and a "Close" (×) button in the header.
- **Save button:** disabled while nothing has changed, including after a field is changed and then changed back to its original value. It is also disabled while Title, Owner or Description is empty or contains only spaces.
- **Saving:** sends `PUT /api/bugs/:id`, closes the modal, and the board shows the new values. Leading and trailing spaces are removed from Owner and Description, as they are for Title.
- **Leaving without saving:** Cancel, the × button and the Escape key all close the modal and discard changes. Clicking the backdrop does not close it, and edits are kept.
- **Errors:** if saving fails, the modal stays open and shows the server's message in an `alert`, for example "Internal error".
- **Bug deleted elsewhere:** clicking the row of a bug that no longer exists does not open the modal, and no message is shown.

## Test Data and Setup

- **Fixtures:** import `test` and `expect` from `tests/fixtures/auth.ts`, so tests start logged in.
- **Own data only:** in `beforeEach`, create one open bug through the API with a unique token per test: title `<token> Edit target`, severity `mid`, owner `dave`, description `Original description`. Keep its `id`. Then open `/board` and search for `<token>`.
- **Checking what was saved:** read the bug back with `GET /api/bugs/<id>` through the `request` fixture, rather than relying only on the board.
- **Cleanup:** in `afterEach`, delete every bug the test created, accepting `204` or `404`.
- **Page objects:** use `boardPage.openBug(title)` and `editBugModal`. `EditBugModal` currently has only `dialog`, `deleteButton`, `stateSelect` and `errorAlert`. Add locators for `idInput`, `titleInput`, `severitySelect`, `ownerInput`, `descriptionInput`, `saveButton`, `cancelButton` and `closeButton`, and actions `save()`, `cancel()` and `close()`, following the pattern in `CreateBugModal`.
- **Seed:** `tests/seed.spec.ts`.

## Test Scenarios

### 1. Opening a bug

**Seed:** `tests/seed.spec.ts`

#### 1.1 Clicking a bug's row opens the Edit bug modal with its ID in the title

**File:** `tests/edit-bug/edit-bug-open.spec.ts`

**Steps:**
  1. Click the row for `<token> Edit target`.
    - expect: A dialog named "Edit bug #<id>" is visible, where `<id>` is the created bug's ID.
    - expect: The dialog has a heading with the same text.

#### 1.2 The modal shows the bug's current values

**File:** `tests/edit-bug/edit-bug-open.spec.ts`

**Steps:**
  1. Open the bug.
    - expect: ID is `<id>`, Title is `<token> Edit target`, Severity is `mid`, State is `open`, Owner is `dave`, and Description is `Original description`.
    - expect: The Title field has focus.

#### 1.3 The ID is read-only and the other fields are editable

**File:** `tests/edit-bug/edit-bug-open.spec.ts`

**Steps:**
  1. Open the bug.
    - expect: The ID field is not editable (`toBeEditable()` fails, or it has the `readonly` attribute).
    - expect: Title, Severity, State, Owner and Description are editable.
  2. Try to type into the ID field.
    - expect: Its value is still `<id>`.

#### 1.4 The Severity field shows the board's severity colour and updates when changed

**File:** `tests/edit-bug/edit-bug-open.spec.ts`

**Steps:**
  1. Open the bug.
    - expect: The Severity select's text colour is `rgb(166, 124, 71)`, the MID colour.
  2. Select HIGH.
    - expect: The text colour changes to `rgb(184, 74, 46)`, the HIGH colour.
    - expect: The options are exactly HIGH, MID and LOW.

### 2. Saving changes

**Seed:** `tests/seed.spec.ts`

#### 2.1 Saving a new title updates the bug and closes the modal

**File:** `tests/edit-bug/edit-bug-save.spec.ts`

**Steps:**
  1. Open the bug, change the Title to `<token> Edited title`, and click Save.
    - expect: The modal closes.
    - expect: The board shows a row `<token> Edited title`, and no row `<token> Edit target`.
    - expect: `GET /api/bugs/<id>` returns the new title.

#### 2.2 Saving changes to every editable field updates them all

**File:** `tests/edit-bug/edit-bug-save.spec.ts`

**Steps:**
  1. Open the bug and change Title to `<token> All fields`, Severity to HIGH, Owner to `zed` and Description to `New description`. Click Save.
    - expect: The modal closes.
    - expect: The bug's row shows `HIGH`, `<token> All fields` and `zed`.
    - expect: `GET /api/bugs/<id>` returns severity `HIGH`, owner `zed` and description `New description`.

#### 2.3 Spaces around Owner and Description are removed on save

**File:** `tests/edit-bug/edit-bug-save.spec.ts`

**Steps:**
  1. Open the bug, set Owner to `"  zed  "` and Description to `"  New description  "`, and click Save.
    - expect: `GET /api/bugs/<id>` returns owner `zed` and description `New description`, without the spaces.

#### 2.4 Saved changes are still there after a reload

**File:** `tests/edit-bug/edit-bug-save.spec.ts`

**Steps:**
  1. Open the bug, change the Title to `<token> Persisted`, and click Save.
  2. Reload the page, search for `<token>` and open the bug again.
    - expect: The Title field shows `<token> Persisted`.

### 3. When Save is allowed

**Seed:** `tests/seed.spec.ts`

#### 3.1 Save is disabled while nothing has changed

**File:** `tests/edit-bug/edit-bug-save-rules.spec.ts`

**Steps:**
  1. Open the bug without changing anything.
    - expect: Save is disabled, and Cancel is enabled.

#### 3.2 Save becomes enabled after a change

**File:** `tests/edit-bug/edit-bug-save-rules.spec.ts`

**Steps:**
  1. Open the bug and append ` changed` to the Description.
    - expect: Save is enabled.

#### 3.3 Save is disabled again when a change is undone

**File:** `tests/edit-bug/edit-bug-save-rules.spec.ts`

**Steps:**
  1. Open the bug, change the Title, then change it back to `<token> Edit target`.
    - expect: Save is disabled.

#### 3.4 Save is disabled when Title, Owner or Description is empty

**File:** `tests/edit-bug/edit-bug-save-rules.spec.ts`

Write this as three separate tests, one per field.

**Steps:**
  1. Open the bug and clear one of Title, Owner or Description.
    - expect: Save is disabled.

#### 3.5 Save is disabled when a required field contains only spaces

**File:** `tests/edit-bug/edit-bug-save-rules.spec.ts`

**Steps:**
  1. Open the bug and set the Title to three spaces.
    - expect: Save is disabled, and no error message is shown.

### 4. Leaving without saving

**Seed:** `tests/seed.spec.ts`

#### 4.1 Cancel, × and Escape close the modal and discard changes

**File:** `tests/edit-bug/edit-bug-cancel.spec.ts`

Write this as three separate tests, one for each way of closing.

**Steps:**
  1. Open the bug and change the Title to `<token> Not saved`.
  2. Close the modal with one of: the Cancel button, the "Close" (×) button, or the Escape key.
    - expect: The modal closes.
    - expect: The board still shows `<token> Edit target`.
    - expect: `GET /api/bugs/<id>` still returns the original title.

#### 4.2 Clicking the backdrop does not close the modal or lose edits

**File:** `tests/edit-bug/edit-bug-cancel.spec.ts`

**Steps:**
  1. Open the bug and change the Title to `<token> Kept`.
  2. Click the dimmed area outside the dialog, for example near the left edge of the viewport, at x 5 and y 400.
    - expect: The dialog is still visible, and the Title field still contains `<token> Kept`.

#### 4.3 Reopening after Cancel shows the saved values, not the discarded edit

**File:** `tests/edit-bug/edit-bug-cancel.spec.ts`

**Steps:**
  1. Open the bug, change the Title to `<token> Discarded`, and click Cancel.
  2. Open the bug again.
    - expect: The Title field shows `<token> Edit target`.
  - The create-bug plan found that the Create bug modal briefly shows old values after being reopened (`specs/testing/create-bug.md`, scenario 6.3). Use web-first assertions (`toHaveValue`) here so the test waits for the form to settle, and check whether the Edit bug modal has the same flash.

### 5. Errors

**Seed:** `tests/seed.spec.ts`

#### 5.1 A server error on save keeps the modal open and shows the message

**File:** `tests/edit-bug/edit-bug-errors.spec.ts`

**Arrange:** route `**/api/bugs/*` so that only `PUT` requests are fulfilled with status `500` and body `{"error":"server_error","message":"Internal error"}`. Every other method falls through with `route.fallback()`, because opening the modal sends a `GET` to the same URL.

**Steps:**
  1. Open the bug, change the Description, and click Save.
    - expect: The dialog stays visible, and its `alert` shows "Internal error".
  2. Remove the route.
    - expect: `GET /api/bugs/<id>` still returns `Original description`.

#### 5.2 A network failure on save keeps the modal open

**File:** `tests/edit-bug/edit-bug-errors.spec.ts`

**Arrange:** route `**/api/bugs/*` so that only `PUT` requests are aborted with `route.abort()`.

**Steps:**
  1. Open the bug, change the Description, and click Save.
    - expect: The dialog stays visible, and an error is shown in its `alert`.
  - Not verified: the exact message was not checked for edits. The delete flow shows "Something went wrong. Please try again." for the same failure, so confirm the text before asserting it.

### 6. Observations (possible defects to confirm)

**Seed:** `tests/seed.spec.ts`

#### 6.1 Possible defect: clicking a bug that was deleted elsewhere does nothing

**File:** `tests/edit-bug/edit-bug-errors.spec.ts`

**Steps:**
  1. With the board showing `<token> Edit target`, delete the bug through the API (`DELETE /api/bugs/<id>`, expecting `204`).
  2. Click its row on the board.
    - OBSERVED: no modal opens, no message is shown, and the stale row stays on the board until a reload.
    - expect (suggested): a message tells the user the bug no longer exists, and the board refreshes.
  - The spec does not cover this. Record it so the product owner can decide on the behaviour.

## Not Covered or Not Verified

- **Two users editing the same bug:** out of scope by the spec ("last write wins").
- **Changing the state:** covered in `specs/testing/bug-status.md`.
- **Deleting from the Edit bug modal:** covered in `specs/testing/delete-bug.md`.
- **The exact network-failure message on save** (scenario 5.2).
- **Keyboard-only editing:** tab order and saving with Enter were not explored.
