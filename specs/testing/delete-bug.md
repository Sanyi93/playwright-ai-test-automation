# BuggyBoard - Delete Bug Test Plan

## Application Overview

Test plan for deleting a bug in BuggyBoard (http://localhost:5173). It is based on `specs/features/12-delete-bug.md` and `specs/features/09-edit-bug.md`, and on live exploration of the app with `playwright-cli`.

**Observed app behaviour that the expected results rely on:**

- **Opening a bug:** each bug row on the board is exposed as a `button` whose accessible name is "ID SEVERITY TITLE OWNER" (for example `"HIGH [token] Login fails buggy"`). Clicking it sends `GET /api/bugs/:id` and opens a `dialog` named "Edit bug #<id>".
- **Edit modal buttons:** the footer has **Delete** on the left and **Cancel** and **Save** on the right. Delete is red outlined text on a white background, and it is enabled even while Save is disabled because nothing has changed.
- **Confirmation:** clicking Delete in the Edit bug modal does not delete anything. It opens a second `dialog` named "Delete bug #<id>?" on top of the Edit bug modal, which stays open. The confirmation's message names the bug and ends "This cannot be undone.". It has **Delete** and **Cancel** buttons and a "Close" (×) button, and focus starts on Cancel. Cancel, × and Escape close only the confirmation and send no request. Clicking its backdrop does nothing.
- **Deleting:** clicking **Delete in the confirmation** sends `DELETE /api/bugs/:id`. On `204` both modals close, the board reloads its list (`GET /api/bugs`), and the row disappears. Afterwards `GET /api/bugs/:id` returns `404` with `{"error":"not_found","message":"Bug not found."}`.
- **Empty board:** when the database has no bugs left, the table shows the row "No bugs.". When bugs exist but none match the current state filter, it shows "No bugs matched.".
- **Errors:** when the delete request fails, the confirmation closes. The error is shown inside the Edit bug modal as an `alert` list item, and that modal stays open:
  - server error: the response's `message` is shown (for example "Internal error"), and the bug is not deleted
  - network failure: "Something went wrong. Please try again."
  - bug already deleted elsewhere: "Bug not found."

## Test Data and Setup

These rules apply to every scenario:

- **Fresh bugs per test:** each scenario creates the bugs it needs during its own Arrange step, before the board is opened. Create them through the API with the `bugsApi` fixture (`bugsApi.create(...)`, which sends `POST /api/bugs` and expects `201`). No scenario may depend on bugs that already exist on the board or on bugs created by another scenario.
- **Unique titles:** every created bug's title starts with a unique token, for example `zq<uuid>` as in `tests/tests-vibed/search-board.spec.ts`, so rows can be found by title on a shared board. Rows must always be located by that token, never by position or by ID.
- **Cleanup:** the `bugsApi` fixture deletes whatever it created after each test. A delete that the test already performed returns `404` during cleanup, which is expected and harmless.
- **Order matters:** create the bugs first, then navigate to `/board` (or reload), so that the board's initial `GET /api/bugs` includes them.
- **Shared login (CLAUDE.md rule 7):** import `test` and `expect` from `tests/fixtures/auth.ts`, whose worker-scoped fixture logs in once per worker and gives every test a logged-in browser context. Only the authentication state is shared.
- **"Click Delete" means confirming too:** in groups 2 to 5, "click Delete" means clicking Delete in the Edit bug modal (`editBugModal.delete()`) and then Delete in the confirmation (`deleteBugConfirmModal.confirm()`). Group 6 tests the confirmation itself.
- **Never delete all bugs:** scenarios delete only the bugs they created. Do not depend on, or assert, an empty database, because other test files share it. Scenario 2.6 creates an extra unrelated bug so that its result does not depend on what else is in the database.
- **Seed:** `tests/seed.spec.ts` (logs in as `buggy`, the first user in `users.json`, and lands on `/board`).

## Test Scenarios

### 1. Delete button in the Edit bug modal

**Seed:** `tests/seed.spec.ts`

#### 1.1 Edit bug modal shows an enabled Delete button

**File:** `tests/delete-bug/delete-button.spec.ts`

**Arrange:** create one open bug `"<token> Delete button check"` (severity `high`, owner `buggy`), then open `/board`.

**Steps:**
  1. Click the row whose name contains `<token>`.
    - expect: A dialog named "Edit bug #<id>" is visible, where `<id>` is the created bug's ID.
    - expect: The dialog contains a button named exactly "Delete", and it is enabled.
    - expect: The dialog also contains "Cancel" and "Save" buttons.

#### 1.2 Delete button sits on the left of the footer and is styled as a destructive action

**File:** `tests/delete-bug/delete-button.spec.ts`

**Arrange:** create one open bug `"<token> Delete layout check"`, then open `/board`.

**Steps:**
  1. Open the bug's Edit bug modal.
    - expect: The Delete button is to the left of the Cancel and Save buttons: its bounding box's right edge is less than or equal to Cancel's left edge.
    - expect: The Delete button's background colour is white (`rgb(255, 255, 255)`), and its text colour differs from Save's, because Delete is a red outlined button and Save uses the primary colour `#b8ae76`.
    - Note: `specs/design/theme.md` only defines the primary colour, so the red styling is observed behaviour rather than a spec requirement.

#### 1.3 Delete is enabled while Save is disabled

**File:** `tests/delete-bug/delete-button.spec.ts`

**Arrange:** create one open bug `"<token> Delete enabled check"`, then open `/board`.

**Steps:**
  1. Open the bug's Edit bug modal without changing any field.
    - expect: Save is disabled, because nothing has changed (`specs/features/09-edit-bug.md`).
    - expect: Delete is enabled.

### 2. Deleting a bug (happy paths)

**Seed:** `tests/seed.spec.ts`

#### 2.1 Deleting a bug closes the modal and removes its row from the board

**File:** `tests/delete-bug/delete-bug.spec.ts`

**Arrange:** create one open bug `"<token> Remove me"` (severity `mid`), then open `/board`.

**Steps:**
  1. Open the bug's Edit bug modal.
  2. Click Delete.
    - expect: The dialog "Edit bug #<id>" is no longer visible.
    - expect: No row whose name contains `<token>` is shown on the board.
    - expect: No error alert is shown.

#### 2.2 Deleting a bug removes it from the database

**File:** `tests/delete-bug/delete-bug.spec.ts`

**Arrange:** create one open bug `"<token> Remove from DB"`, keep its `id`, then open `/board`.

**Steps:**
  1. Open the bug's Edit bug modal and click Delete, while waiting for the `DELETE /api/bugs/<id>` response.
    - expect: The `DELETE /api/bugs/<id>` response status is `204`.
    - expect: A follow-up `GET /api/bugs/<id>` through the `request` fixture returns `404`.
    - expect: `GET /api/bugs` does not contain a bug with that `id`.

#### 2.3 A deleted bug stays deleted after reloading the page

**File:** `tests/delete-bug/delete-bug.spec.ts`

**Arrange:** create one open bug `"<token> Gone after reload"`, then open `/board`.

**Steps:**
  1. Open the bug's Edit bug modal and click Delete.
  2. Reload the page.
    - expect: The page is still `/board` and the user is still logged in.
    - expect: No row whose name contains `<token>` is shown.

#### 2.4 Deleting one bug leaves the other bugs untouched

**File:** `tests/delete-bug/delete-bug.spec.ts`

**Arrange:** create three open bugs: `"<token> Keep first"` (`high`), `"<token> Delete middle"` (`mid`), and `"<token> Keep last"` (`low`). Then open `/board`.

**Steps:**
  1. Open the Edit bug modal for `"<token> Delete middle"` and click Delete.
    - expect: The row for `"<token> Delete middle"` is gone.
    - expect: The rows for `"<token> Keep first"` and `"<token> Keep last"` are still visible, with unchanged severity and owner.
    - expect: Searching the board for `<token>` shows exactly 2 rows.

#### 2.5 A closed bug can be deleted from the Closed view

**File:** `tests/delete-bug/delete-bug.spec.ts`

**Arrange:** create one bug `"<token> Closed bug"`. Close it through the API with `PUT /api/bugs/<id>`, sending all fields with `state: "closed"` and expecting `200`. Then open `/board`.

**Steps:**
  1. Click the "Closed" state filter button. Locate it with an exact name match, `getByRole('button', { name: 'Closed', exact: true })`, because bug rows are also buttons and a row whose title contains "Closed" would otherwise match too.
    - expect: The row for `"<token> Closed bug"` is visible.
  2. Open its Edit bug modal.
    - expect: The State field shows "Closed", and the Delete button is visible and enabled.
  3. Click Delete.
    - expect: The modal closes, and the row is no longer shown in the Closed view.
    - expect: `GET /api/bugs/<id>` returns `404`.

#### 2.6 Deleting the only matching bug leaves a "No bugs matched." search result

**File:** `tests/delete-bug/delete-bug.spec.ts`

**Arrange:**
- Create one open bug `"<token> Only match"`.
- Create one more open bug with a different unique token, for example `"<other-token> Unrelated bug"`.
- Open `/board`.

The unrelated bug is required. The board shows "No bugs matched." only when the search hides bugs that exist, and it shows "No bugs." when the database holds no bugs at all. Without the extra bug, this scenario would fail on an empty database and pass on a busy one, so its result would depend on other tests' data.

**Steps:**
  1. Type `<token>` into the "Search bugs by title" field.
    - expect: Exactly one row is shown, and the unrelated bug is not shown.
  2. Open that bug's Edit bug modal and click Delete.
    - expect: The modal closes.
    - expect: No bug rows are shown, and the table shows "No bugs matched.".

### 3. Leaving the modal without deleting

**Seed:** `tests/seed.spec.ts`

#### 3.1 Cancel, × and Escape close the modal without deleting the bug

**File:** `tests/delete-bug/delete-cancel.spec.ts`

**Arrange:** create one open bug `"<token> Not deleted"`, then open `/board`. Write this as three separate tests, one for each way of closing, so that each test stays atomic.

**Steps:**
  1. Open the bug's Edit bug modal.
  2. Close it with one of: the Cancel button, the "Close" (×) button, or the Escape key.
    - expect: The dialog is no longer visible.
    - expect: The row for `"<token> Not deleted"` is still visible.
    - expect: `GET /api/bugs/<id>` returns `200`.

#### 3.2 Delete with unsaved edits deletes the bug and discards the edits

**File:** `tests/delete-bug/delete-cancel.spec.ts`

**Arrange:** create one open bug `"<token> Edited then deleted"`, then open `/board`.

**Steps:**
  1. Open the bug's Edit bug modal and change the Title to `"<token> Edited title"` without saving.
    - expect: Delete is still enabled.
  2. Click Delete.
    - expect: The modal closes.
    - expect: No row containing `<token>` is shown, neither the original title nor the edited one.
    - expect: `GET /api/bugs/<id>` returns `404`.
  - Not verified live: exploration confirmed only that Delete stays enabled after an unsaved edit. Clicking Delete after an edit was not exercised.

### 4. Error handling

**Seed:** `tests/seed.spec.ts`

#### 4.1 Server error on delete keeps the modal open, shows the error and keeps the bug

**File:** `tests/delete-bug/delete-errors.spec.ts`

**Arrange:** create one open bug `"<token> Server error"`, then open `/board`. Route `**/api/bugs/*` so that only `DELETE` requests are fulfilled with status `500` and body `{"error":"server_error","message":"Internal error"}`, and every other method falls through with `route.fallback()`. Opening the modal sends a `GET` to the same URL, so the route must check the method.

**Steps:**
  1. Open the bug's Edit bug modal and click Delete.
    - expect: The dialog "Edit bug #<id>" stays visible.
    - expect: An `alert` inside the dialog shows "Internal error".
  2. Remove the route, then call `GET /api/bugs/<id>` through the `request` fixture.
    - expect: The response is `200`, so the bug still exists.

#### 4.2 Network failure on delete shows a generic error

**File:** `tests/delete-bug/delete-errors.spec.ts`

**Arrange:** create one open bug `"<token> Network error"`, then open `/board`. Route `**/api/bugs/*` so that only `DELETE` requests are aborted with `route.abort()`.

**Steps:**
  1. Open the bug's Edit bug modal and click Delete.
    - expect: The dialog stays visible.
    - expect: An `alert` inside the dialog shows "Something went wrong. Please try again.".
    - expect: `GET /api/bugs/<id>` returns `200`.

#### 4.3 Deleting a bug that was already deleted elsewhere shows "Bug not found."

**File:** `tests/delete-bug/delete-errors.spec.ts`

**Arrange:** create one open bug `"<token> Already deleted"`, then open `/board`.

**Steps:**
  1. Open the bug's Edit bug modal.
  2. While the modal is open, delete the bug through the API (`DELETE /api/bugs/<id>`, expecting `204`).
  3. Click Delete in the modal.
    - expect: The dialog stays visible.
    - expect: An `alert` inside the dialog shows "Bug not found.".

### 5. Spec versus app notes (possible defects to confirm)

**Seed:** `tests/seed.spec.ts`

#### 5.1 Possible defect: the board keeps showing a bug that no longer exists after "Bug not found."

**File:** `tests/delete-bug/delete-errors.spec.ts`

**Arrange:** same as scenario 4.3.

**Steps:**
  1. Follow scenario 4.3 until "Bug not found." is shown, then press Escape.
    - expect (spec): the board no longer displays that bug (`specs/features/12-delete-bug.md`: "the board no longer displays that bug").
    - OBSERVED: the modal closes, but the row for `"<token> Already deleted"` stays on the board until the page is reloaded. The board does not refresh after a `404` on delete.
  2. Reload the page.
    - expect: The row is gone.
  - Record this as a possible defect. If the product decision is to keep the current behaviour, change step 1's expected result to match it.

### 6. Delete confirmation

**Seed:** `tests/seed.spec.ts`

These scenarios follow the acceptance criteria in `specs/features/12-delete-bug.md`. Every scenario uses the same Arrange step, done in `beforeEach`: create one open bug `"<token> Delete confirmation target"` with `bugsApi`, open `/board`, search for `<token>`, and open the bug's Edit bug modal (named "Edit bug #<id>").

#### 6.1 Clicking Delete asks for confirmation and names the bug

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal.
    - expect: A dialog named "Delete bug #<id>?" is visible, with the heading "Delete bug #<id>?".
    - expect: Its message contains `#<id> "<title>"` and "This cannot be undone.".

#### 6.2 Clicking Delete does not delete the bug yet

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal.
    - expect: The confirmation and the Edit bug modal are both visible.
    - expect: `GET /api/bugs/<id>` returns `200`.

#### 6.3 The confirmation offers Delete, Cancel and Close, with focus on Cancel

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal.
    - expect: The confirmation has visible "Delete", "Cancel" and "Close" (×) buttons.
    - expect: The "Cancel" button has keyboard focus.

#### 6.4 Confirming the deletion removes the bug from the database

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal, then Delete in the confirmation, while waiting for the `DELETE /api/bugs/<id>` response.
    - expect: The response status is `204`, and `GET /api/bugs/<id>` returns `404`.

#### 6.5 Confirming the deletion closes both modals and removes the bug from the board

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal, then Delete in the confirmation.
    - expect: The confirmation and the Edit bug modal are both hidden.
    - expect: No row for the bug is shown on the board.

#### 6.6 Cancelling the confirmation leaves the bug in place

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal, then Cancel in the confirmation.
    - expect: The confirmation is hidden, and no `DELETE` request was sent.
    - expect: `GET /api/bugs/<id>` returns `200`, and the bug's row is still on the board.

#### 6.7 Cancelling the confirmation returns to the Edit bug modal with unsaved edits kept

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Change the Title in the Edit bug modal without saving, click Delete, then Cancel in the confirmation.
    - expect: The confirmation is hidden, the Edit bug modal is visible, and its Title field still shows the changed title.

#### 6.8 Closing the confirmation with the × leaves the bug in place

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal, then the "Close" (×) button in the confirmation.
    - expect: The confirmation is hidden, the Edit bug modal is visible, and `GET /api/bugs/<id>` returns `200`.

#### 6.9 Pressing Escape closes only the confirmation and leaves the bug in place

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal, then press Escape.
    - expect: The confirmation is hidden, the Edit bug modal is still visible, and `GET /api/bugs/<id>` returns `200`.

#### 6.10 Clicking outside the confirmation does not close it

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Steps:**
  1. Click Delete in the Edit bug modal, then click the dimmed backdrop near the left edge of the viewport, at x 5 and y 400.
    - expect: The confirmation is still visible, and `GET /api/bugs/<id>` returns `200`.

#### 6.11 A failed deletion keeps the bug and shows an error in the Edit bug modal

**File:** `tests/delete-bug/delete-confirmation.spec.ts`

**Arrange:** in addition to the shared setup, route `**/api/bugs/*` so that only `DELETE` requests are fulfilled with status `500` and body `{"error":"server_error","message":"Internal error"}`.

**Steps:**
  1. Click Delete in the Edit bug modal, then Delete in the confirmation.
    - expect: The confirmation is hidden, and the Edit bug modal is visible with the `alert` "Internal error".
    - expect: The bug's row is still on the board, and `GET /api/bugs/<id>` returns `200`.

## Not Covered or Not Verified

- **Double-clicking Delete in the confirmation:** both buttons are disabled while the request is in flight, so a second request should not be sent. This was not exercised.
- **Keyboard-only deletion:** focus starts on Cancel (scenario 6.3). Tabbing to the confirmation's Delete and pressing Enter was not checked.
- **Other users' bugs:** every user can see and delete every bug. Permission rules are not specified, so they are not tested.
- **Delete from other places:** the only delete entry point is the Edit bug modal. There is no delete control on the board rows.
