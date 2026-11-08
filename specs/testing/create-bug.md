# BuggyBoard - Create Bug Test Plan

## Application Overview

Test plan for the "New Bug" workflow in BuggyBoard (http://localhost:5173), based on specs/features/06-create-bug.md and specs/features/07-bug-board.md and on live exploration with Playwright MCP. Conventions: every scenario starts from the seed (tests/seed.spec.ts: logged in as `buggy`, on /board) and must use a unique title, for example `<scenario-tag> <Date.now()>`, so it does not depend on existing board data. Do not assume the board is empty; locate rows by title only. Observed app facts: modal is `dialog` named "Create bug" (aria-modal=true) with heading "Create bug", a "Close" (x) button, labelled fields Title (text), Severity (select: HIGH, MID, LOW; default MID), Owner (text; prefilled with current username), Description (textarea), and Cancel and Save buttons. Title receives focus on open. Fields have no HTML required/maxlength attributes; validation is custom and inline. Save sends POST /api/bugs with lower-case severity and receives 201 with state "OPEN"; the board row shows ID, severity badge (upper-case), title, owner. Board default sort is by severity HIGH, MID, LOW and the default filter is "Open". Existing code covers only one happy path (tests-vibed/create-bug.spec.ts: login, create HIGH bug, check row). Page objects: tests/pages/CreateBugModal.ts, tests/pages/BoardPage.ts. Use web-first assertions (toHaveValue, toBeVisible) because the modal form resets asynchronously after reopen.

## Test Scenarios

### 1. 1. Modal contents and defaults

**Seed:** `tests/seed.spec.ts`

#### 1.1. 1.1 New Bug button opens the Create bug modal with all fields

**File:** `tests/create-bug/modal-contents.spec.ts`

**Steps:**
  1. From /board (fresh, logged in as buggy) click the 'New Bug' button in the title bar.
    - expect: Dialog named 'Create bug' is visible with heading 'Create bug' and a 'Close' button showing x.
    - expect: Labelled fields exist: Title (text input), Severity (select), Owner (text input), Description (textarea).
    - expect: Buttons 'Cancel' and 'Save' are visible at the bottom.
    - expect: No validation messages are visible initially.
    - expect: The Title input has focus.

#### 1.2. 1.2 Field defaults: owner is current user, severity is MID, others empty

**File:** `tests/create-bug/modal-defaults.spec.ts`

**Steps:**
  1. Open the New Bug modal.
    - expect: Title is empty, Description is empty.
    - expect: Owner is prefilled with 'buggy'.
    - expect: Severity value is MID (spec does not define the default severity; MID observed).

#### 1.3. 1.3 Severity dropdown offers HIGH, MID, LOW only and is colour coded

**File:** `tests/create-bug/severity-options.spec.ts`

**Steps:**
  1. Open the modal and read the Severity options.
    - expect: Exactly three options in order HIGH, MID, LOW; there is no blank option.
  2. Select HIGH, then MID, then LOW and check the select's computed colours.
    - expect: HIGH uses terracotta text colour rgb(184, 74, 46) (class severity-select-high).
    - expect: MID uses amber rgb(166, 124, 71) (severity-select-mid).
    - expect: LOW uses sage rgb(74, 107, 94) (severity-select-low).
    - expect: Background is the same hue at 22% opacity. Colours match specs/features/08-board-severity.md tokens.

#### 1.4. 1.4 Owner field is editable

**File:** `tests/create-bug/owner-editable.spec.ts`

**Steps:**
  1. Open modal, clear Owner and type 'custom-owner'.
    - expect: Owner shows 'custom-owner' (field is not read-only).

### 2. 2. Happy paths

**Seed:** `tests/seed.spec.ts`

#### 2.1. 2.1 Create a HIGH bug with all fields

**File:** `tests/create-bug/create-high.spec.ts`

**Steps:**
  1. Open modal. Enter title '[HIGH-all] <timestamp>', select HIGH, set Owner 'custom-owner', Description 'Full description'. Click Save.
    - expect: Modal closes.
    - expect: POST /api/bugs returns 201 with severity 'HIGH', state 'OPEN', owner 'custom-owner' and a numeric id.
    - expect: A board row with the title appears with a numeric ID, a 'HIGH' badge (upper case), the title and owner 'custom-owner'.

#### 2.2. 2.2 Create a MID bug with defaults for severity and owner

**File:** `tests/create-bug/create-mid-required-only.spec.ts`

**Steps:**
  1. Open modal. Fill only Title '[MID-min] <timestamp>' and Description 'desc', leaving Severity (MID) and Owner (buggy) at defaults. Click Save.
    - expect: Modal closes; row appears with MID badge, the title and owner 'buggy'.
    - expect: Bug is in the Open filter and not in the Closed filter (new bugs have state OPEN).

#### 2.3. 2.3 Create a LOW bug

**File:** `tests/create-bug/create-low.spec.ts`

**Steps:**
  1. Open modal, fill title '[LOW] <timestamp>', select LOW, description 'low desc'. Save.
    - expect: Modal closes; row appears with 'LOW' badge, owner 'buggy'.

#### 2.4. 2.4 New row has a unique ID and the ID is assigned automatically

**File:** `tests/create-bug/auto-id.spec.ts`

**Steps:**
  1. Create two bugs with different unique titles in sequence; read the IDs from the rows (or API responses).
    - expect: Each ID is an integer; the two IDs differ and the second is greater than the first. IDs may skip numbers on this database (63 followed ids were seen), so do not assert consecutive IDs.

#### 2.5. 2.5 Created bug persists after page reload

**File:** `tests/create-bug/persistence.spec.ts`

**Steps:**
  1. Create bug '[persist] <timestamp>' (HIGH). Reload the page (stay logged in).
    - expect: After reload the row with the title, HIGH badge and owner 'buggy' is still listed.
    - expect: GET /api/bugs includes the bug with the same data and state OPEN.

#### 2.6. 2.6 Title and description are trimmed on save

**File:** `tests/create-bug/trim.spec.ts`

**Steps:**
  1. Open modal, enter Title '   [trim] <timestamp>   ', Owner '  trimowner  ', Description '  d  '. Save.
    - expect: Request body contains trimmed values: title '[trim] <timestamp>', owner 'trimowner', description 'd'.
    - expect: Row shows trimmed title and owner.

#### 2.7. 2.7 Modal form is clean on a subsequent open after saving

**File:** `tests/create-bug/reopen-after-save.spec.ts`

**Steps:**
  1. Create a bug with Severity LOW and Owner 'someone'. Click New Bug again.
    - expect: Eventually (use toHaveValue) Title and Description are empty, Severity is MID, Owner is 'buggy'. Note: right after reopen stale values may flash briefly (see 4.5).

### 3. 3. Validation (negative)

**Seed:** `tests/seed.spec.ts`

#### 3.1. 3.1 Saving an empty form shows required errors and does not save

**File:** `tests/create-bug/validation-empty.spec.ts`

**Steps:**
  1. Open modal. Leave Title and Description empty (Owner is prefilled). Click Save.
    - expect: Messages 'Title is required.' and 'Description is required.' appear in the modal; no message for Owner.
    - expect: Modal stays open.
    - expect: No POST /api/bugs request is sent and no row is added.

#### 3.2. 3.2 Whitespace-only values are rejected

**File:** `tests/create-bug/validation-whitespace.spec.ts`

**Steps:**
  1. Open modal, enter 3 spaces in Title, Owner and Description. Click Save.
    - expect: Messages 'Title is required.', 'Owner is required.' and 'Description is required.' appear.
    - expect: Modal stays open; no POST request is sent.

#### 3.3. 3.3 Blank Owner is rejected

**File:** `tests/create-bug/validation-owner.spec.ts`

**Steps:**
  1. Open modal, clear Owner, fill valid Title '[owner-blank] <timestamp>' and Description. Click Save.
    - expect: Only 'Owner is required.' appears.
    - expect: Modal stays open; bug not created.

#### 3.4. 3.4 Blank Title only

**File:** `tests/create-bug/validation-title.spec.ts`

**Steps:**
  1. Open modal, leave Title empty, fill Description 'd'. Save.
    - expect: Only 'Title is required.' appears; modal stays open; no POST.

#### 3.5. 3.5 Blank Description only

**File:** `tests/create-bug/validation-description.spec.ts`

**Steps:**
  1. Open modal, fill Title '[desc-blank] <timestamp>', leave Description empty. Save.
    - expect: Only 'Description is required.' appears; modal stays open; no POST; no row with that title.

#### 3.6. 3.6 Severity cannot be blank

**File:** `tests/create-bug/validation-severity.spec.ts`

**Steps:**
  1. Open modal and inspect Severity.
    - expect: There is no empty option, so the spec's 'severity must not be blank' case cannot be produced through the UI; MID is preselected. Record as covered by design.

#### 3.7. 3.7 Errors do not disappear while typing but are recomputed on the next Save

**File:** `tests/create-bug/validation-clearing.spec.ts`

**Steps:**
  1. Open modal, clear Owner, click Save with all required fields empty so three errors show.
    - expect: Errors for Title, Owner, Description are shown.
  2. Type valid Title and Description (do not click Save yet).
    - expect: Observed: the 'Title is required.' and 'Description is required.' messages are still visible (not cleared on input).
  3. Click Save again (Owner still blank).
    - expect: Only 'Owner is required.' remains; Title and Description errors are gone.
    - expect: Fix Owner and Save: modal closes and bug is created.

#### 3.8. 3.8 Validation errors are gone when the modal is reopened

**File:** `tests/create-bug/validation-reset.spec.ts`

**Steps:**
  1. Open modal, click Save with empty fields (errors appear), click Cancel, click New Bug.
    - expect: No validation messages are visible in the reopened modal.

### 4. 4. Cancel and dismiss

**Seed:** `tests/seed.spec.ts`

#### 4.1. 4.1 Cancel closes the modal without saving

**File:** `tests/create-bug/cancel.spec.ts`

**Steps:**
  1. Open modal, enter title '[cancel] <timestamp>', set Severity LOW, Description 'x'. Click Cancel.
    - expect: Modal closes; no POST /api/bugs; no row with that title, also after reload.

#### 4.2. 4.2 Close (x) button closes without saving

**File:** `tests/create-bug/close-x.spec.ts`

**Steps:**
  1. Open modal, enter title '[x-close] <timestamp>' and description. Click the 'Close' x button.
    - expect: Modal closes; bug is not saved.

#### 4.3. 4.3 Escape closes without saving

**File:** `tests/create-bug/escape.spec.ts`

**Steps:**
  1. Open modal, enter title '[esc] <timestamp>' and description. Press Escape.
    - expect: Modal closes; bug is not saved.

#### 4.4. 4.4 Clicking the backdrop does not close the modal

**File:** `tests/create-bug/backdrop.spec.ts`

**Steps:**
  1. Open modal, enter title 'x' and description 'y'. Click the dimmed area outside the dialog (for example at position 5,5).
    - expect: Modal remains open and the entered values are preserved, as per spec.

#### 4.5. 4.5 Entered data is discarded when the modal is reopened after Cancel, x or Escape

**File:** `tests/create-bug/discard-on-reopen.spec.ts`

**Steps:**
  1. Open modal; enter title, set Severity LOW, Owner 'someone', description. Dismiss using each of Cancel, x, Escape in turn (separate runs), then click New Bug.
    - expect: After the form settles, Title and Description are empty, Severity is MID and Owner is 'buggy' (use toHaveValue with retries).
    - expect: Possible defect: immediately after reopening, the previous values were briefly observed (Title, Severity, Owner, Description stale) before being reset asynchronously (about under 1.5 s). Confirm whether the stale flash is reproducible and report it.

### 5. 5. Edge cases and robustness

**Seed:** `tests/seed.spec.ts`

#### 5.1. 5.1 HTML special characters render as text

**File:** `tests/create-bug/special-chars.spec.ts`

**Steps:**
  1. Create a bug with title '[xss] <b>bold</b> & "q" <timestamp>', LOW, description '<img src=x onerror=alert(1)> and < > text'. Register a dialog listener before saving.
    - expect: Row cell text equals the literal title including the tags; cell innerHTML contains &lt;b&gt;; there is no <b> element in the title cell.
    - expect: No JavaScript dialog (alert) fires.
    - expect: API returns the description unchanged.

#### 5.2. 5.2 Spec example: description with < and >

**File:** `tests/create-bug/spec-example.spec.ts`

**Steps:**
  1. Create bug title 'Login fails with special characters <timestamp>', HIGH, description 'When I use < and > in my password, login fails.'
    - expect: Modal closes; row shows HIGH, the title and owner buggy; API stored the description verbatim.

#### 5.3. 5.3 Very long title and description are accepted

**File:** `tests/create-bug/long-values.spec.ts`

**Steps:**
  1. Create bug with title '[long] ' + 300 'A' characters + timestamp, 3000-character description, Owner 'custom-owner'.
    - expect: No length error is shown (no maxlength observed); modal closes; row exists; API returns the 3000-character description.
    - expect: Check the board layout is not broken for the long title (not verified visually). No limit is defined in the spec.

#### 5.4. 5.4 Duplicate titles are allowed

**File:** `tests/create-bug/duplicate-titles.spec.ts`

**Steps:**
  1. Create two bugs with the same title '[dup] <timestamp>' one after the other.
    - expect: Both saves succeed with different IDs; two rows with that title are listed. Spec does not forbid duplicates.

#### 5.5. 5.5 Double-clicking Save creates a single bug

**File:** `tests/create-bug/double-click-save.spec.ts`

**Steps:**
  1. Open modal, fill title '[dbl] <timestamp>' and description, double-click Save.
    - expect: Exactly one row with that title exists, and exactly one POST /api/bugs was observed (single bug ID 64 observed in exploration). Failure: two rows.

#### 5.6. 5.6 Server error (HTTP 500) keeps the modal open with an error

**File:** `tests/create-bug/server-error.spec.ts`

**Steps:**
  1. With page.route intercepting POST **/api/bugs to return 500 JSON, open modal, fill valid title '[500] <timestamp>' and description, click Save.
    - expect: Modal stays open showing 'Failed to save bug.'; entered values are preserved; no row is added.
    - expect: After unrouting, clicking Save again creates the bug.

#### 5.7. 5.7 Network failure keeps the modal open with a generic error

**File:** `tests/create-bug/network-error.spec.ts`

**Steps:**
  1. Route POST **/api/bugs to abort, fill valid data, click Save.
    - expect: Modal stays open showing 'Something went wrong. Please try again.'; values preserved; no row added. Browser console errors are expected.

#### 5.8. 5.8 Keyboard-only creation

**File:** `tests/create-bug/keyboard.spec.ts`

**Steps:**
  1. Open modal via keyboard (focus New Bug, Enter). Title is focused; type title; Tab to Severity, choose with arrow keys; Tab to Owner, Tab to Description, type; Tab to Cancel and Save and press Enter on Save.
    - expect: Fields are reachable in order Title, Severity, Owner, Description, Cancel, Save (Close x position in tab order not verified); bug is created. Tab order not verified in exploration, adjust if the real order differs.

### 6. 6. Spec versus app notes (possible defects to confirm)

**Seed:** `tests/seed.spec.ts`

#### 6.1. 6.1 Created bug is displayed on the board although spec lists it out of scope

**File:** `tests/create-bug/spec-diff-display.spec.ts`

**Steps:**
  1. Create a bug and check the board.
    - expect: The row is shown (feature 07 covers the board; 06 lists display as out of scope). Not a defect; note only that the spec text is outdated.

#### 6.2. 6.2 Inline errors are not cleared on edit

**File:** `tests/create-bug/spec-diff-error-clearing.spec.ts`

**Steps:**
  1. Follow scenario 3.7 and judge UX.
    - expect: Spec only says users are informed which fields are required and does not define clearing. Report as a usability observation, not a spec violation.

#### 6.3. 6.3 Stale form values flash after reopen

**File:** `tests/create-bug/spec-diff-stale-values.spec.ts`

**Steps:**
  1. Follow scenario 4.5 and read values immediately after clicking New Bug.
    - expect: Spec says cancelled data is not saved; it does not state that the form is cleared on reopen. Final state is cleared; the initial stale flash is a possible defect (data leak between openings).
