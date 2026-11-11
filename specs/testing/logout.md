# BuggyBoard - Logout Test Plan

## Application Overview

Test plan for logging out of BuggyBoard (http://localhost:5173). It is based on `specs/features/05-logout.md` and on live exploration with `playwright-cli`. No automated test covers logging out yet.

**Observed app behaviour that the expected results rely on:**

- **Logout button:** the title bar on `/board` has a "Logout" button at its right end.
- **Logging out:** clicking it goes to `/login` and removes `buggyboard_user` from `localStorage`.
- **After logging out:** opening `/board`, reloading, or using the browser's Back and Forward buttons all stay on `/login`. Logging in again lands on `/board`.
- **Other tabs:** a second tab that already shows the board keeps showing it until that tab reloads or navigates. Then it goes to `/login`.

## Test Data and Setup

- **Fixtures:** import `test` and `expect` from `tests/fixtures/auth.ts`, so every test starts logged in, in its own browser context. Logging out in one test does not affect the others, because each test has its own context and storage.
- **Start page:** each test opens `/board` in `beforeEach` and checks that the URL is `/board`.
- **Credentials** for logging in again (scenario 1.5) come from `users.json`.
- **No bug data:** no scenario creates or changes bugs.
- **Page objects:** use `boardPage` and `loginPage`. Add a `logoutButton` locator and a `logout()` action to `BoardPage`, which has no logout support yet.
- **Seed:** `tests/seed.spec.ts`.

## Test Scenarios

### 1. Logging out

**Seed:** `tests/seed.spec.ts`

#### 1.1 Logout returns the user to the login page and ends the session

**File:** `tests/logout/logout.spec.ts`

**Steps:**
  1. Click "Logout".
    - expect: The URL is `/login`, and the login form is visible.
    - expect: `localStorage` item `buggyboard_user` is no longer set.

#### 1.2 The board cannot be opened after logging out

**File:** `tests/logout/logout.spec.ts`

**Steps:**
  1. Click "Logout", then open `/board`.
    - expect: The URL is `/login`.

#### 1.3 The browser's Back button does not restore the session

**File:** `tests/logout/logout.spec.ts`

**Steps:**
  1. Click "Logout", then press the browser's Back button.
    - expect: The URL is `/login`, and the board is not shown.
  2. Press the browser's Forward button.
    - expect: The URL is still `/login`.

#### 1.4 Reloading after logging out stays logged out

**File:** `tests/logout/logout.spec.ts`

**Steps:**
  1. Click "Logout", then reload the page.
    - expect: The URL is `/login`.

#### 1.5 The user can log in again after logging out

**File:** `tests/logout/logout.spec.ts`

**Steps:**
  1. Click "Logout", then log in with the first user's credentials.
    - expect: The URL is `/board`, and `buggyboard_user` is `{"username":"buggy"}` again.

### 2. Observations

**Seed:** `tests/seed.spec.ts`

#### 2.1 Observation: another open tab keeps showing the board until it reloads

**File:** `tests/logout/logout.spec.ts`

**Steps:**
  1. Open a second page in the same browser context on `/board`.
  2. In the first page, click "Logout".
    - OBSERVED: the second page still shows the board, until it reloads or navigates.
  3. Reload the second page.
    - expect: The URL is `/login`.
  - The spec does not cover several tabs. Record the stale tab as behaviour to decide on. Only step 3 is a firm expectation.

## Not Covered or Not Verified

- **Logging out while a modal is open:** the title bar sits behind the modal's backdrop, so this was not explored.
- **Server-side sessions:** the app has none, so logging out only clears the browser's storage. See the login plan, scenario 5.1.
