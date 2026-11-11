# User Story

As a BuggyBoard user,
I want to delete bugs, and confirm each deletion before it happens,
So that I can remove bugs that are incorrect or no longer needed without deleting one by accident.


# Design

- The "Edit bug" modal should have a "delete" button.
- Clicking the delete button does **not** delete the bug. It opens a **delete confirmation modal** on top of the "Edit bug" modal, which stays open underneath.
- The confirmation modal:
  - Has the title **"Delete bug #&lt;id&gt;?"** with the bug's ID interpolated (e.g. "Delete bug #12?").
  - Shows a message that names the bug and warns that deleting cannot be undone, e.g. *Are you sure you want to delete bug #12 "Login fails with special characters"? This cannot be undone.*
  - Has two buttons at the bottom: **"Delete"**, which confirms, and **"Cancel"**.
  - The "Delete" button is styled as a destructive action, using the same red style as the delete button in the "Edit bug" modal.
  - When it opens, keyboard focus is on the "Cancel" button, so pressing Enter straight away cannot delete the bug.
  - Follows the shared modal rules in `specs/design/theme.md`: an **X** in the upper right corner, which has the same effect as "Cancel", and the **Escape** key, which also has the same effect as "Cancel".
  - Clicking the dimmed area outside the modal (the backdrop) does **not** close it, the same as the "Edit bug" modal.
- **Confirming** (clicking "Delete" in the confirmation modal) removes the bug from the database, closes both the confirmation modal and the "Edit bug" modal, and the board no longer displays the bug.
- **Cancelling** ("Cancel", the X, or Escape) closes only the confirmation modal. The bug is not deleted, and no delete request is sent to the backend. The "Edit bug" modal stays open, and any unsaved edits in it are kept.
- If the deletion **fails**, for example because of a server or network error, the bug is not removed from the board. The confirmation modal closes, and the "Edit bug" modal stays open and shows an error message.


# Acceptance Criteria

Scenario: Edit bug modal displays a delete button
  Given the user is authenticated into the app
  And the user is on the board page
  And there are bugs in the database
  When the user opens the edit modal for a bug
  Then the modal displays a delete button

Scenario: Clicking the delete button asks for confirmation
  Given the user is authenticated into the app
  And the edit modal is open for a bug
  When the user clicks the delete button
  Then a delete confirmation modal is displayed
  And its title is "Delete bug #<id>?" with the bug's ID
  And its message names the bug and warns that deleting cannot be undone

Scenario: Clicking the delete button does not delete the bug yet
  Given the user is authenticated into the app
  And the edit modal is open for a bug
  When the user clicks the delete button
  Then the bug is still in the database
  And the edit modal is still open beneath the confirmation modal

Scenario: Delete confirmation modal offers confirm and cancel actions
  Given the user is authenticated into the app
  And the delete confirmation modal is open for a bug
  Then the modal displays a "Delete" button and a "Cancel" button
  And the modal displays an X in the upper right corner
  And keyboard focus is on the "Cancel" button

Scenario: Confirming the deletion removes the bug from the database
  Given the user is authenticated into the app
  And the delete confirmation modal is open for a bug
  When the user clicks the "Delete" button in the confirmation modal
  Then the bug is removed from the database

Scenario: Confirming the deletion closes both modals and updates the board
  Given the user is authenticated into the app
  And the delete confirmation modal is open for a bug
  When the user clicks the "Delete" button in the confirmation modal
  Then the confirmation modal is closed
  And the edit modal is closed
  And the board no longer displays that bug

Scenario: Cancelling the confirmation leaves the bug in place
  Given the user is authenticated into the app
  And the delete confirmation modal is open for a bug
  When the user clicks the "Cancel" button in the confirmation modal
  Then the bug is still in the database
  And the board still displays that bug

Scenario: Cancelling the confirmation returns to the edit modal with unsaved edits kept
  Given the user is authenticated into the app
  And the edit modal is open for a bug
  And the user has changed the bug's title without saving
  And the delete confirmation modal is open for that bug
  When the user clicks the "Cancel" button in the confirmation modal
  Then the confirmation modal is closed
  And the edit modal is still open
  And the edit modal still shows the changed title

Scenario: Closing the confirmation with the X leaves the bug in place
  Given the user is authenticated into the app
  And the delete confirmation modal is open for a bug
  When the user clicks the X in the upper right corner of the confirmation modal
  Then the confirmation modal is closed
  And the edit modal is still open
  And the bug is still in the database

Scenario: Pressing Escape in the confirmation leaves the bug in place
  Given the user is authenticated into the app
  And the delete confirmation modal is open for a bug
  When the user presses the Escape key
  Then only the confirmation modal is closed
  And the edit modal is still open
  And the bug is still in the database

Scenario: Clicking outside the confirmation modal does not close it
  Given the user is authenticated into the app
  And the delete confirmation modal is open for a bug
  When the user clicks the dimmed area outside the confirmation modal
  Then the confirmation modal is still open
  And the bug is still in the database

Scenario: A failed deletion keeps the bug and shows an error
  Given the user is authenticated into the app
  And the delete confirmation modal is open for a bug
  And the backend fails to delete the bug
  When the user clicks the "Delete" button in the confirmation modal
  Then the confirmation modal is closed
  And the edit modal is still open and shows an error message
  And the board still displays that bug
