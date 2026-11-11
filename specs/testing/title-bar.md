# BuggyBoard - Title Bar and Favicon Test Plan

## Application Overview

Test plan for BuggyBoard's branding: the title bar on the board page and the browser favicon (http://localhost:5173). It is based on `specs/features/04-title-bar.md` and `specs/features/01-favicon.md`, and on live exploration with `playwright-cli`. No automated test covers this area yet.

**Observed app behaviour that the expected results rely on** (at the default 1280 × 720 viewport):

- **Title bar:** the `/board` page has a `banner` that spans the full width. Its left group holds an image named "BuggyBoard" (`/logo_50x50.png`, 50px wide, at x 16 to 66) inside a container with rounded corners (`border-radius: 8px`), followed by the heading "BuggyBoard" (level 1) starting at x 78. Its right group holds the search field, the "New Bug" button and the "Logout" button, which is the last element and ends 16px from the right edge (x 1175 to 1264).
- **Favicon:** the page has `<link rel="icon" href="/favicon.ico" type="image/x-icon">`, and `/favicon.ico` is served with status `200` and content type `image/x-icon` (about 15 KB).
- **Page title:** "BuggyBoard" on both `/login` and `/board`.

## Test Data and Setup

- **Fixtures:** title bar tests import from `tests/fixtures/auth.ts` (start logged in) and open `/board` in `beforeEach`. Favicon and page title tests that do not need the board may import from `tests/fixtures/api.ts` and open `/login`.
- **No bug data:** no scenario creates or changes bugs.
- **Page objects:** add a `TitleBar` page object in `tests/pages/TitleBar.ts`, with a `banner`, `logo`, `title` and `logoutButton`, and register it as a `titleBar` fixture in `tests/fixtures/pages.ts`. The title bar is a self-contained region shared by the board, so it gets its own class (see `specs/engineering/test-automation-patterns.md`).
- **Layout checks:** compare `boundingBox()` values with a small tolerance rather than exact pixels, so the tests survive minor styling changes.
- **Seed:** `tests/seed.spec.ts`.

## Test Scenarios

### 1. Title bar

**Seed:** `tests/seed.spec.ts`

#### 1.1 The board page has a title bar across the top

**File:** `tests/title-bar/title-bar.spec.ts`

**Steps:**
  1. Open `/board`.
    - expect: A `banner` is visible at the top of the page (its top edge is at y 0), and it is as wide as the viewport.

#### 1.2 The logo is at the left, in a rounded box

**File:** `tests/title-bar/title-bar.spec.ts`

**Steps:**
  1. Inspect the banner's image named "BuggyBoard".
    - expect: Its `src` is `/logo_50x50.png`, and the image has loaded (`naturalWidth` greater than 0).
    - expect: It is the leftmost element in the banner: its left edge is within 24px of the banner's left edge.
    - expect: Its container has a non-zero `border-radius`.

#### 1.3 The app title is immediately to the right of the logo

**File:** `tests/title-bar/title-bar.spec.ts`

**Steps:**
  1. Inspect the heading "BuggyBoard" (level 1) in the banner.
    - expect: It is visible, and its left edge is to the right of the logo's right edge, within 24px of it.
    - expect: It is vertically aligned with the logo: their vertical centres differ by less than 10px.

#### 1.4 The Logout button is at the right

**File:** `tests/title-bar/title-bar.spec.ts`

**Steps:**
  1. Inspect the "Logout" button in the banner.
    - expect: It is visible, and its right edge is within 24px of the banner's right edge.
    - expect: It is to the right of the "New Bug" button.

### 2. Favicon and page title

**Seed:** `tests/seed.spec.ts`

#### 2.1 The page references the favicon file

**File:** `tests/title-bar/favicon.spec.ts`

**Steps:**
  1. Open `/login`.
    - expect: The document has a `link` element with `rel="icon"` and `href="/favicon.ico"`.

#### 2.2 The favicon file is served

**File:** `tests/title-bar/favicon.spec.ts`

**Steps:**
  1. Request `/favicon.ico` with the `request` fixture.
    - expect: The status is `200`, the content type is `image/x-icon`, and the body is not empty.

#### 2.3 The browser tab shows the app name

**File:** `tests/title-bar/favicon.spec.ts`

**Steps:**
  1. Open `/login`.
    - expect: The page title is "BuggyBoard".
  2. Log in.
    - expect: On `/board`, the page title is still "BuggyBoard".

### 3. Observations (possible defects to confirm)

**Seed:** `tests/seed.spec.ts`

#### 3.1 Possible defect: the title bar overflows on a phone-sized screen

**File:** `tests/title-bar/title-bar.spec.ts`

**Steps:**
  1. Set the viewport to 390 × 844 and open `/board`.
    - OBSERVED: the page becomes 532px wide, so it scrolls sideways, and the "Logout" button sits outside the visible area (its right edge is at x 532).
    - expect (if the product supports small screens): the page is no wider than the viewport, and "Logout" is fully visible.
  - The specs do not mention small screens. Record this so the product owner can decide whether it is in scope.

#### 3.2 Observation: the login page's logo has no accessible name

**File:** `tests/title-bar/title-bar.spec.ts`

**Steps:**
  1. Open `/login` and inspect the logo image.
    - OBSERVED: its `alt` text is empty, so screen readers skip it, while the same logo in the title bar is named "BuggyBoard".
  - An empty `alt` is acceptable for a decorative image that sits next to visible text "BuggyBoard". Record it only so the difference is a conscious choice.

## Not Covered or Not Verified

- **What the favicon looks like:** the spec asks for a cartoon-style, tan 1970 Volkswagen Beetle. This needs a human to look at it, or a visual comparison against an approved image. It is not covered by the scenarios above.
- **"The design should reflect the theme":** the theme only defines the primary colour, used by the "New Bug" button and the selected filter. There is no concrete rule for the title bar to assert.
