# BuggyBoard - Search Form Test Plan

## Application Overview

Test plan for the board search form in BuggyBoard (http://localhost:5173), based on specs/features/11-search-board.md, specs/features/07-bug-board.md and live exploration with Playwright MCP. All scenarios are written in GIVEN-WHEN-THEN. Conventions: every scenario starts from the seed (tests/seed.spec.ts: logged in as buggy, on /board). Scenarios needing specific bugs create them first with unique titles (for example `<token> Login fails`, token = `zq` + random id) and locate rows by title only; the board is NOT assumed empty or fixed. Observed facts: the search field is `<input type=text role=search>` with aria-label "Search bugs by title", placeholder "Search bugs…", empty by default, sitting in the title bar left of "New Bug". A button with aria-label "Clear search" (x) sits next to it; it is always in the DOM but `invisible pointer-events-none` while the field is empty and visible when text is present. Filtering is client-side and instant: typing sends no extra network request (only GET /api/bugs on load), so there is no debounce. Search is not stored in the URL and is reset by reload; the board default state filter is Open (there were no closed bugs in the observed data). Matching observed: case-insensitive; leading/trailing/repeated whitespace ignored; punctuation in query and title is normalised to a space-like separator (query "log-in" and "log in" both match title "log-in"; "planner search" matches "[planner-search]"); query made only of punctuation or whitespace (`&`, `%`, `_`, `\`, spaces) behaves as blank and shows every bug of the current state filter; title only (owner, ID, description are not searched). Empty result shows the row text "No bugs matched." inside the still-rendered table. KNOWN SPEC DIFFERENCES / POSSIBLE DEFECTS: (D1) spec example says "login" should match "Issue with log-in", but the app returned no match for title "Issue with log-in" with query "login" (hyphen becomes a space, so "login" != "log in"); scenario 4.6 records this. (D2) Spec says the no-results message is shown "instead of the table", but the app keeps the table and column headers and shows "No bugs matched." as a row; scenario 3.2 records this. (D3) Failed GET /api/bugs (HTTP 500) shows the generic text "No bugs." with no error message (scenario 8.1). (D4) The spec says "normalize punctuation" without defining it; the observed behaviour above is the baseline. Existing coverage: tests-vibed/search-board.spec.ts (no match, exact one match, two matches) and tests-vibed/search-board-ui.spec.ts; page object tests/pages/BoardPage.ts (searchInput = getByLabel "Search bugs by title", noBugsMatchedMessage = "No bugs matched."). Use web-first assertions. Exploration bug left in the database: ID 71 "[planner-search] Issue with log-in   Check" (owner buggy, MID, description "descsentinelxyz").

## Test Scenarios

### 1. 1. Form contents and initial state

**Seed:** `tests/seed.spec.ts`

#### 1.1. 1.1 Search field is present in the title bar with label and placeholder

**File:** `tests/search-form/form-contents.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
WHEN I look at the title bar
    - expect: THEN a search field with accessible name "Search bugs by title" is visible to the left of the "New Bug" button
    - expect: AND its placeholder is "Search bugs…"
    - expect: AND the field is a single-line text input

#### 1.2. 1.2 Search field is blank and the clear control is hidden by default

**File:** `tests/search-form/default-state.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND I have not typed anything
WHEN the board has finished loading
    - expect: THEN the search field value is empty
    - expect: AND the "Clear search" x control is not visible and cannot be clicked
    - expect: AND there is no submit button for the search

#### 1.3. 1.3 Blank search shows all bugs and no no-match message

**File:** `tests/search-form/blank-shows-all.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug with a unique title "<token> Alpha" exists in state Open
WHEN the search field is blank
    - expect: THEN the row "<token> Alpha" is listed together with all other open bugs
    - expect: AND the text "No bugs matched." is not shown

### 2. 2. Matching and clearing (happy paths)

**Seed:** `tests/seed.spec.ts`

#### 2.1. 2.1 Full title search shows only that bug

**File:** `tests/search-form/full-title.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND bugs "<token> Login fails" and "<token> Logout button missing" exist
WHEN I type "<token> Login fails" into the search field
    - expect: THEN exactly one row is listed and it is "<token> Login fails"
    - expect: AND "<token> Logout button missing" is not listed

#### 2.2. 2.2 Partial search matches by substring

**File:** `tests/search-form/partial-match.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login fails" exists
WHEN I type "<token> logi" into the search field
    - expect: THEN the row "<token> Login fails" is listed

#### 2.3. 2.3 Search listing multiple matches

**File:** `tests/search-form/multiple-matches.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND bugs "<token> Login fails", "<token> Login times out" and "<token> Logout button missing" exist
WHEN I type "<token> Login" into the search field
    - expect: THEN exactly two rows are listed: "<token> Login fails" and "<token> Login times out"
    - expect: AND "<token> Logout button missing" is not listed

#### 2.4. 2.4 Results update as I type with no search request

**File:** `tests/search-form/live-filtering.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND bugs "<token> Login fails" and "<token> Logout button missing" exist
AND I record the network requests made so far
WHEN I type "<token> Logi" character by character without pressing Enter
    - expect: THEN after the last character both bugs are listed, after typing "n" only "<token> Login fails" is listed and the board updates without pressing Enter
    - expect: AND no additional request to /api/bugs is sent while typing (filtering is client-side, no debounce)

#### 2.5. 2.5 Clear control resets the search and the board

**File:** `tests/search-form/clear-control.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND bugs "<token> Login fails" and "<token> Logout button missing" exist
AND I have typed "<token> Login" so that only one of them is listed and the "Clear search" control is visible
WHEN I click the "Clear search" control
    - expect: THEN the search field is empty
    - expect: AND both "<token> Login fails" and "<token> Logout button missing" are listed again
    - expect: AND the "Clear search" control is hidden again

#### 2.6. 2.6 Deleting the typed text with the keyboard restores the list

**File:** `tests/search-form/delete-restores.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND bugs "<token> Login fails" and "<token> Logout button missing" exist
AND I have typed "<token> Login fails" so that one row is listed
WHEN I select all text in the search field and press Backspace
    - expect: THEN the search field is empty
    - expect: AND both bugs are listed
    - expect: AND "No bugs matched." is not shown

### 3. 3. No results

**Seed:** `tests/seed.spec.ts`

#### 3.1. 3.1 Search with no matching title shows the no-match message

**File:** `tests/search-form/no-match.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
WHEN I type a unique string "<token>nomatch" that is in no bug title
    - expect: THEN the text "No bugs matched." is visible
    - expect: AND zero bug rows are listed

#### 3.2. 3.2 Possible defect D2: table headers remain visible with the no-match message

**File:** `tests/search-form/no-match-layout.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
WHEN I type a unique string "<token>nomatch" into the search field
    - expect: THEN "No bugs matched." is shown
    - expect: AND (observed, differs from spec 'instead of the table') the Bugs table with column headers ID, Severity, Title, Owner is still rendered and the message is a row inside it
    - expect: AND record the difference as a possible defect; if the product decision is to follow the spec the table must not be rendered

#### 3.3. 3.3 Board recovers after a no-match search is edited to a matching one

**File:** `tests/search-form/recover-from-no-match.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login fails" exists
AND I have typed "<token> zzz" and "No bugs matched." is shown
WHEN I change the search text to "<token> Login"
    - expect: THEN the row "<token> Login fails" is listed
    - expect: AND "No bugs matched." is no longer shown

### 4. 4. Normalization: case, whitespace and punctuation

**Seed:** `tests/seed.spec.ts`

#### 4.1. 4.1 Search is case insensitive in both directions

**File:** `tests/search-form/case-insensitive.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login Fails" exists
WHEN I type "<TOKEN> LOGIN FAILS" (upper case) into the search field
    - expect: THEN the row "<token> Login Fails" is listed
    - expect: AND typing the lower case "<token> login fails" also lists it

#### 4.2. 4.2 Leading and trailing spaces are ignored

**File:** `tests/search-form/trim-spaces.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login fails" exists
WHEN I type "   <token> Login fails   " with leading and trailing spaces
    - expect: THEN the row "<token> Login fails" is listed
    - expect: AND "No bugs matched." is not shown

#### 4.3. 4.3 Repeated inner spaces collapse to one

**File:** `tests/search-form/collapse-whitespace.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login fails" exists
WHEN I type "<token>     Login      fails" with several spaces between the words
    - expect: THEN the row "<token> Login fails" is listed

#### 4.4. 4.4 Whitespace-only input behaves like a blank search

**File:** `tests/search-form/whitespace-only.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login fails" exists
WHEN I type three spaces "   " into the search field
    - expect: THEN all open bugs are listed including "<token> Login fails"
    - expect: AND "No bugs matched." is not shown
    - expect: AND the field keeps the typed spaces and the "Clear search" control is visible (observed in exploration: the control appeared for non-empty text; verify for whitespace-only text)

#### 4.5. 4.5 Hyphen and space in the query both match a hyphenated title

**File:** `tests/search-form/hyphen-normalization.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Issue with log-in" exists
WHEN I type "<token> issue with log in" into the search field
    - expect: THEN the row "<token> Issue with log-in" is listed
    - expect: AND typing "<token> issue with log-in" also lists it

#### 4.6. 4.6 Possible defect D1: query "login" does not match title "log-in"

**File:** `tests/search-form/login-vs-log-in.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND bugs "<token> Login fails" and "<token> Issue with log-in" exist
WHEN I type "<token> login" into the search field
    - expect: THEN "<token> Login fails" is listed
    - expect: AND per spec 11-search-board.md ('login' should match 'Login fails' and 'Issue with log-in') the row "<token> Issue with log-in" should also be listed
    - expect: AND OBSERVED: "<token> Issue with log-in" is NOT listed because punctuation becomes a space; record as a possible defect (spec example versus app) and mark the test with test.fail or an annotation until clarified

#### 4.7. 4.7 Punctuation-only query behaves like a blank search

**File:** `tests/search-form/punctuation-only.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login fails" exists
WHEN I type "&" into the search field
    - expect: THEN "<token> Login fails" is listed (the query normalises to empty, so all open bugs are shown)
    - expect: AND "No bugs matched." is not shown

### 5. 5. Special characters and long input

**Seed:** `tests/seed.spec.ts`

#### 5.1. 5.1 HTML tags in the query and titles are literal text

**File:** `tests/search-form/html-literal.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug titled "<token> <b>bold</b> end" exists
AND another bug "<token> plain" exists
WHEN I type "<token> <b>" into the search field
    - expect: THEN the row "<token> <b>bold</b> end" is listed with the angle-bracket text visible literally (no bold formatting, no element created inside the cell)
    - expect: AND "<token> plain" is not listed
    - expect: AND no script or dialog is triggered

#### 5.2. 5.2 Quotes and ampersand in the query

**File:** `tests/search-form/quotes-ampersand.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug titled "<token> say \"hi\" & 'bye'" exists
WHEN I type "<token> say \"hi\" & 'bye'" into the search field
    - expect: THEN the row is listed with quotes and ampersand shown literally
    - expect: AND the field keeps exactly the typed text

#### 5.3. 5.3 Percent, underscore and backslash are not wildcards

**File:** `tests/search-form/wildcard-chars.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login fails" exists
WHEN I type "<token> L_gin f%ils" into the search field
    - expect: THEN "<token> Login fails" is NOT listed and "No bugs matched." is shown (underscore and percent are not SQL wildcards; observed that these characters are normalised away, so the exact outcome must be re-confirmed when automating)
    - expect: AND no error appears and the page does not crash
    - expect: AND typing only "%", "_" or "\" behaves like a blank search (all open bugs listed, as observed)

#### 5.4. 5.4 SQL-like string is treated as literal text

**File:** `tests/search-form/sql-injection.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Login fails" exists
WHEN I type "' OR 1=1 --" into the search field
    - expect: THEN "No bugs matched." is shown (the board is not unfiltered by the injection)
    - expect: AND the board still works after I clear the field: all open bugs are listed

#### 5.5. 5.5 Very long input does not break the page

**File:** `tests/search-form/long-input.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
WHEN I type a 5000 character string of "x" into the search field
    - expect: THEN "No bugs matched." is shown
    - expect: AND there is no horizontal page overflow and the title bar layout is intact
    - expect: AND clicking "Clear search" restores the full list

### 6. 6. Fields covered by the search

**Seed:** `tests/seed.spec.ts`

#### 6.1. 6.1 Owner is not searched

**File:** `tests/search-form/owner-not-searched.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug "<token> Alpha" exists with owner "owner<token>"
WHEN I type "owner<token>" into the search field
    - expect: THEN "No bugs matched." is shown (observed: query "buggy" matched nothing although many rows are owned by buggy)
    - expect: AND "<token> Alpha" is not listed

#### 6.2. 6.2 Bug ID is not searched

**File:** `tests/search-form/id-not-searched.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug with unique title "<token> Alpha" exists and I know its numeric ID
WHEN I type that ID into the search field
    - expect: THEN the bug is not listed merely because of its ID (observed: query "64" showed "No bugs matched.")

#### 6.3. 6.3 Description is not searched

**File:** `tests/search-form/description-not-searched.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND a bug with title "<token> Alpha" and description "desc<token>" exists
WHEN I type "desc<token>" into the search field
    - expect: THEN "No bugs matched." is shown
    - expect: AND "<token> Alpha" is not listed (spec: search by description is out of scope)

### 7. 7. Interaction with state filter, sorting, reload and history

**Seed:** `tests/seed.spec.ts`

#### 7.1. 7.1 Sorting is preserved while searching

**File:** `tests/search-form/sort-preserved.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND bugs "<token> B", "<token> A" and "<token> C" exist
AND I have clicked the Title column header to sort by title
WHEN I type "<token>" into the search field
    - expect: THEN the three rows are listed in the same title order as the sort (A, B, C or the reverse according to the header indicator)
    - expect: AND the Title header still shows its sort indicator

#### 7.2. 7.2 Switching the state filter keeps the search text

**File:** `tests/search-form/state-filter.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND an open bug "<token> Alpha" exists and no closed bug has "<token>" in its title
AND I have typed "<token>" so that the bug is listed
WHEN I click the "Closed" state filter
    - expect: THEN "No bugs matched." is shown for the Closed list
    - expect: AND the search field still contains "<token>"
    - expect: AND clicking "Open" lists "<token> Alpha" again (searching within closed bugs with matches was not verified because no closed bugs existed)

#### 7.3. 7.3 Search text is reset by a page reload

**File:** `tests/search-form/reload.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND I have typed "<token>nomatch" and "No bugs matched." is shown
WHEN I reload the page
    - expect: THEN the search field is empty
    - expect: AND the URL is still /board with no query string
    - expect: AND all open bugs are listed

#### 7.4. 7.4 Browser back does not restore or leave a search state

**File:** `tests/search-form/browser-back.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page opened as the first history entry
AND I have typed "dupl" into the search field
WHEN I press the browser back button
    - expect: THEN no intermediate search history entry exists (observed: typing adds no history entry and the URL never changes, back left the app to the previous document)
    - expect: AND the application does not show an error

#### 7.5. 7.5 Rapid typing and replacing text ends with results for the final text

**File:** `tests/search-form/rapid-typing.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy on the board page
AND bugs "<token> Login fails" and "<token> Logout button missing" exist
WHEN I quickly type "<token> Logo" with no delay and immediately replace it with "<token> Logi"
    - expect: THEN only the results for "<token> Logi" are shown: "<token> Login fails" is listed and "<token> Logout button missing" is not
    - expect: AND no stale result from the older query overwrites the newer one (filtering is synchronous client-side, so race conditions were not observable)

### 8. 8. Server failure

**Seed:** `tests/seed.spec.ts`

#### 8.1. 8.1 Board load failure with search available (possible defect D3)

**File:** `tests/search-form/server-failure.spec.ts`

**Steps:**
  1. GIVEN I am logged in as buggy and the GET /api/bugs request is mocked to return HTTP 500
WHEN I load the board page
    - expect: THEN the board shows the text "No bugs." in the table (observed) and no error message explains the failure
    - expect: AND the search field is still visible and typing in it does not crash the page
    - expect: AND record the missing error message as a possible defect
