# BuggyBoard - Login Test Plan

## Application Overview

Test plan for logging in to BuggyBoard (http://localhost:5173), including user accounts and the redirects that protect the board. It is based on `specs/features/03-login.md` and `specs/features/02-user-accounts.md`, and on live exploration with `playwright-cli`. No automated test covers this area yet: the existing specs only log in as a setup step.

**Observed app behaviour that the expected results rely on:**

- **Login page (`/login`):** heading "BuggyBoard" (level 1), the text "Log in", a "Username" text field (`autocomplete="username"`), a "Password" field of type `password` (`autocomplete="current-password"`) and a "Login" button. The logo `/logo_50x50.png` is shown above the heading. The page title is "BuggyBoard".
- **Accounts:** `users.json` holds `buggy` / `1970beetle` and `vanny` / `1979bus`.
- **Successful login:** goes to `/board` and stores `{"username":"<name>"}` in `localStorage` under `buggyboard_user`. Leading and trailing spaces around the username are removed. Pressing Enter in either field submits the form.
- **Error messages,** shown in an `alert` on the login page while the URL stays `/login`:

  | Input | Message |
  |---|---|
  | Unknown username, or wrong password | "Invalid username or password." |
  | Blank username | "Username cannot be blank." |
  | Blank password | "Password cannot be blank." |
  | Both blank | "Please enter your username and password." |

  The username and password are case-sensitive, and the password is not trimmed. An error stays visible while the user edits the fields, and the typed password is kept.
- **Redirects:** while logged out, `/board`, `/` and unknown paths go to `/login`. While logged in, `/login`, `/` and unknown paths go to `/board`. After logging in from a redirect, the user always lands on `/board`.
- **Session:** the login survives a page reload. If `buggyboard_user` holds something that is not valid JSON, the app treats the user as logged out.

## Test Data and Setup

- **Fixtures:** import `test` and `expect` from `tests/fixtures/api.ts`, so every test starts logged out in a fresh browser context. Do not use `tests/fixtures/auth.ts` here, because these tests exercise the login itself.
- **Credentials:** read them from `users.json` (first user `buggy`, second user `vanny`). Never hard-code passwords in the specs.
- **No bug data:** no scenario creates or changes bugs, so no cleanup is needed.
- **Page objects:** use `loginPage` (`goto()`, `login(username, password)`, `usernameInput`, `passwordInput`, `loginButton`) and `boardPage`. Add to `LoginPage` what the plan needs and it lacks: an `errorMessage` locator (the `alert`), a `heading` and a `logo` locator.
- **Seed:** `tests/seed.spec.ts`.

## Test Scenarios

### 1. Login page

**Seed:** `tests/seed.spec.ts`

#### 1.1 The login page shows the logo, title and login form

**File:** `tests/login/login-page.spec.ts`

**Steps:**
  1. Open `/login`.
    - expect: The heading "BuggyBoard" and the text "Log in" are visible.
    - expect: The "Username" field, the "Password" field and the "Login" button are visible.
    - expect: The page title is "BuggyBoard".

#### 1.2 The password field hides what is typed

**File:** `tests/login/login-page.spec.ts`

**Steps:**
  1. Open `/login`.
    - expect: The Password field has `type="password"`, and the Username field has `type="text"`.
    - expect: The fields have `autocomplete="username"` and `autocomplete="current-password"`, so password managers can fill them.

#### 1.3 The login card shows the same logo as the title bar

**File:** `tests/login/login-page.spec.ts`

**Steps:**
  1. Open `/login`.
    - expect: An image with `src="/logo_50x50.png"` is visible above the "BuggyBoard" heading, horizontally centred in the card.
    - expect: The image's container has rounded corners (`border-radius` of `8px` was observed).
  - Not verified: the spec says the logo box has a border matching the input fields. Exploration found no border on the logo's direct container, so check where the border is drawn before writing this assertion, and record a defect if there is none.

### 2. Successful login

**Seed:** `tests/seed.spec.ts`

#### 2.1 Logging in with the default user opens the board

**File:** `tests/login/login-success.spec.ts`

**Steps:**
  1. Open `/login`, enter the first user's username and password, and click "Login".
    - expect: The URL is `/board`, and the "New Bug" and "Logout" buttons are visible.
    - expect: `localStorage` item `buggyboard_user` is `{"username":"buggy"}`.

#### 2.2 Any user in users.json can log in, and the app knows who they are

**File:** `tests/login/login-success.spec.ts`

**Steps:**
  1. Log in as the second user, `vanny`.
    - expect: The URL is `/board`.
  2. Click "New Bug".
    - expect: The Owner field in the Create bug modal is prefilled with `vanny`.

#### 2.3 Pressing Enter in the Password field submits the form

**File:** `tests/login/login-success.spec.ts`

**Steps:**
  1. Fill both fields with valid credentials, keep the focus in the Password field, and press Enter.
    - expect: The URL is `/board`.

#### 2.4 Pressing Enter in the Username field submits the form

**File:** `tests/login/login-success.spec.ts`

**Steps:**
  1. Fill both fields with valid credentials, focus the Username field, and press Enter.
    - expect: The URL is `/board`.

#### 2.5 Spaces around the username are ignored

**File:** `tests/login/login-success.spec.ts`

**Steps:**
  1. Log in with the username `"  buggy  "` and the correct password.
    - expect: The URL is `/board`.
    - expect: `buggyboard_user` is `{"username":"buggy"}`, without the spaces.

### 3. Failed login

**Seed:** `tests/seed.spec.ts`

Every scenario in this group expects the same outcome unless it says otherwise: the URL stays `/login`, `buggyboard_user` is not set in `localStorage`, and the error message shown is the one listed.

#### 3.1 An unknown username is rejected with a generic message

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Log in with the username `nosuchuser` and any password.
    - expect: The error is "Invalid username or password.".

#### 3.2 A wrong password is rejected with the same generic message

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Log in with the username `buggy` and the password `wrong`.
    - expect: The error is "Invalid username or password.", the same text as 3.1, so the page does not reveal whether the username exists.

#### 3.3 The username is case-sensitive

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Log in with the username `BUGGY` and the correct password.
    - expect: The error is "Invalid username or password.".

#### 3.4 The password is case-sensitive

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Log in with the username `buggy` and the password in upper case.
    - expect: The error is "Invalid username or password.".

#### 3.5 The password is not trimmed

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Log in with the username `buggy` and the correct password with a leading space.
    - expect: The error is "Invalid username or password.".

#### 3.6 A blank username is rejected with its own message

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Leave Username empty, enter any password, and click "Login".
    - expect: The error is "Username cannot be blank.".

#### 3.7 A blank password is rejected with its own message

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Enter `buggy`, leave Password empty, and click "Login".
    - expect: The error is "Password cannot be blank.".

#### 3.8 Both fields blank are rejected with a combined message

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Leave both fields empty and click "Login".
    - expect: The error is "Please enter your username and password.".

#### 3.9 After a failed login the user can correct the input and log in

**File:** `tests/login/login-failure.spec.ts`

**Steps:**
  1. Log in with a wrong password.
    - expect: The error "Invalid username or password." is shown, and the Username field still contains `buggy`.
  2. Replace the password with the correct one and click "Login".
    - expect: The URL is `/board`.
  - Observed: the error stays visible while the user edits the fields, and only changes on the next submit. The spec does not say whether it should clear, so do not assert either way.

### 4. Redirects and session

**Seed:** `tests/seed.spec.ts`

#### 4.1 A logged-out user opening the board is sent to the login page

**File:** `tests/login/login-redirects.spec.ts`

**Steps:**
  1. Without logging in, open `/board`.
    - expect: The URL is `/login`, and the login form is visible.

#### 4.2 A logged-out user opening the root or an unknown path is sent to the login page

**File:** `tests/login/login-redirects.spec.ts`

**Steps:**
  1. Without logging in, open `/`, and then open `/no-such-page`.
    - expect: Both end on `/login`.
  - Write this as two tests, one per path, to keep each test atomic.

#### 4.3 A logged-in user opening the login page is sent to the board

**File:** `tests/login/login-redirects.spec.ts`

**Steps:**
  1. Log in, then open `/login`.
    - expect: The URL is `/board`.

#### 4.4 A logged-in user opening the root or an unknown path is sent to the board

**File:** `tests/login/login-redirects.spec.ts`

**Steps:**
  1. Log in, then open `/`, and then open `/no-such-page`.
    - expect: Both end on `/board`. Write this as two tests.

#### 4.5 The login survives a page reload

**File:** `tests/login/login-redirects.spec.ts`

**Steps:**
  1. Log in, then reload the page.
    - expect: The URL is still `/board`, and the "Logout" button is visible.

#### 4.6 Corrupted session data is treated as logged out

**File:** `tests/login/login-redirects.spec.ts`

**Steps:**
  1. Open `/login`, set `localStorage` item `buggyboard_user` to `not-json`, then open `/board`.
    - expect: The URL is `/login`, and no error is logged in the browser console.

### 5. Observations (possible defects to confirm)

**Seed:** `tests/seed.spec.ts`

#### 5.1 Possible defect: a made-up session in localStorage opens the board

**File:** `tests/login/login-redirects.spec.ts`

**Steps:**
  1. Without logging in, set `buggyboard_user` to `{"username":"ghost"}`, a user who is not in `users.json`, then open `/board`.
    - OBSERVED: the board opens, and the app treats `ghost` as the logged-in user.
  - The spec says "Only users listed in the `users.json` file are valid login credentials". The app only checks the session in the browser, and the bug API answers without any login. Record this as a possible security defect. Until it is decided, write the test to document the current behaviour and mark it clearly, or leave it out of the suite.

## Not Covered or Not Verified

- **The logo's border colour** (scenario 1.3): not confirmed, see the note there.
- **Brute-force protection or rate limiting:** not specified and not explored.
- **Several tabs:** logging in in one tab while another tab shows `/login` was not explored.
