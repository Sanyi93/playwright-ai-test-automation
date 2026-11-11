# BuggyBoard - REST API Test Plan

## Application Overview

Test plan for BuggyBoard's REST API, the Express backend in `backend/src/index.ts`, with validation in `backend/src/bugService.ts` and `backend/src/authService.ts`. Every endpoint has positive and negative cases. The expected results come from the backend code and were checked with live requests.

The UI tests only use the API to create and delete test data, so no test covers the API's own behaviour yet.

### Endpoints

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/api/health` | Server and database status | `200` |
| POST | `/api/login` | Check a username and password against `users.json` | `200` |
| GET | `/api/bugs` | List all bugs | `200` |
| GET | `/api/bugs/:id` | Get one bug | `200` |
| POST | `/api/bugs` | Create a bug | `201` |
| PUT | `/api/bugs/:id` | Replace all editable fields of a bug | `200` |
| DELETE | `/api/bugs/:id` | Delete a bug | `204` |

### Observed behaviour that the expected results rely on

- **Bug shape:** `{ id, title, severity, owner, description, state }`. `severity` is `HIGH`, `MID` or `LOW`, and `state` is `OPEN` or `CLOSED`, always in capitals in responses.
- **Errors from the routes:** JSON of the form `{ "error": "<code>", "message": "<text>" }`, with `Content-Type: application/json`. Each request returns at most one error, from the first check that fails.

  | Code | Message |
  |---|---|
  | `blank_title` | "Title is required." |
  | `blank_severity` | "Severity is required (high, mid, or low)." |
  | `blank_owner` | "Owner is required." |
  | `blank_description` | "Description is required." |
  | `invalid_state` | "State must be Open or Closed." |
  | `invalid_id` | "Bug ID must be a number." |
  | `not_found` | "Bug not found." |
  | `blank_username` | "Username cannot be blank." |
  | `blank_password` | "Password cannot be blank." |
  | `missing_credentials` | "Please enter your username and password." |
  | `invalid_credentials` | "Invalid username or password." |

- **Validation order:** for creating and updating, the checks run title, then severity, then owner, then description, then state (update only). On update, a missing bug (`404`) is reported before any body check.
- **Normalising input:** title, owner and description are trimmed. Severity and state are trimmed and case-insensitive (`" Low "` becomes `LOW`, `"Closed"` becomes `CLOSED`). A field that is not a string is treated as empty.
- **Creating:** the new bug is always `OPEN`. Any `state` or `id` in the body is ignored.
- **Updating:** all five fields (`title`, `severity`, `owner`, `description`, `state`) are required. There are no partial updates, and an `id` in the body is ignored.
- **IDs:** the `:id` is read with `parseInt`, so anything that does not start with a number gives `400 invalid_id`, while a value like `12abc` or `12.9` is read as `12`. That leniency is not tested in this plan.
- **Errors outside the routes:** these come from Express itself, as HTML pages, not JSON:
  - malformed JSON body: `400`
  - body over 100 KB: `413`
  - unknown route or unsupported method: `404`, "Cannot GET /api/…"
  - crashes: `500`
- **No authentication:** the bug endpoints accept requests without any login. Every response carries `Access-Control-Allow-Origin: http://localhost:5173`.

## Test Data and Setup

- **API tests only:** these tests use Playwright's `request` fixture and never open a browser page. Import `test` and `expect` from `tests/fixtures/api.ts`. The `page` fixture is not used, so no browser is started.
- **Base URL:** send requests to relative paths such as `/api/bugs`. The configured `baseURL` (`http://localhost:5173`) forwards `/api` to the backend on port 3000 through the Vite proxy, which is how the app itself calls the API.
- **Own data only:** create every bug a test needs in its Arrange step, with a title that starts with a unique token per test (for example `zq<uuid>`). Never read, change or delete bugs the test did not create. For list checks, filter the response by the token.
- **Cleanup:** use the `bugsApi` fixture to create bugs where possible, because it deletes them after the test. Bugs created by the request under test, such as the subject of a `POST /api/bugs` test, must be recorded and deleted in `afterEach`, accepting `204` or `404`. No test bugs may remain after the run.
- **Missing IDs:** for "does not exist" cases, create a bug, delete it, and use its ID. Do not guess a high number such as `99999999`, which could one day exist.
- **Credentials:** read them from `users.json`. Never hard-code passwords.
- **Data-driven cases:** where a scenario lists several inputs in a table, write one test per row, for example with a `for` loop over the rows that calls `test(...)` for each, so each test stays atomic and reports its own result.
- **Asserting errors:** for route errors, check the status, the `error` code and the `message`. For Express's HTML errors (group 8), check the status, and check that the content type is `text/html`.
- **Seed:** none. These tests do not need the browser login.

## Test Scenarios

### 1. GET /api/health

#### 1.1 Health check reports the API and database as running

**File:** `tests/rest-api/health.spec.ts`

**Steps:**
  1. Send `GET /api/health`.
    - expect: Status `200`, content type `application/json`.
    - expect: The body is `{ "ok": true, "message": "BuggyBoard API is running", "database": "connected" }`.

### 2. POST /api/login

#### 2.1 Valid credentials are accepted for every user in users.json

**File:** `tests/rest-api/login.spec.ts`

**Steps:**
  1. For each user in `users.json`, send `POST /api/login` with that user's `username` and `password`. Write one test per user.
    - expect: Status `200`, and the body is exactly `{ "username": "<username>" }`.
    - expect: The response does not contain the password.

#### 2.2 Invalid credentials are rejected with the same generic error

**File:** `tests/rest-api/login.spec.ts`

One test per row. Every row expects status `401` and `{ "error": "invalid_credentials", "message": "Invalid username or password." }`.

| Case | Body |
|---|---|
| Unknown username | `{ "username": "nobody", "password": "x" }` |
| Wrong password | `{ "username": "buggy", "password": "wrong" }` |
| Username in a different case | `{ "username": "BUGGY", "password": "<correct>" }` |
| Password in a different case | `{ "username": "buggy", "password": "<correct, upper case>" }` |
| Password with a leading space (passwords are not trimmed) | `{ "username": "buggy", "password": " <correct>" }` |
| Password sent as a number | `{ "username": "buggy", "password": 1970 }` |

### 3. GET /api/bugs

#### 3.1 The list contains newly created bugs with all their fields

**File:** `tests/rest-api/list-bugs.spec.ts`

**Arrange:** create two bugs with the token, one `high` and one `low`, through `bugsApi`.

**Steps:**
  1. Send `GET /api/bugs`.
    - expect: Status `200`, and the body is an array.
    - expect: Filtered by the token, it contains exactly the two created bugs, each with `id`, `title`, `severity`, `owner`, `description` and `state`, matching what was created, with `state` `OPEN`.

#### 3.2 A deleted bug is no longer listed

**File:** `tests/rest-api/list-bugs.spec.ts`

**Arrange:** create a bug with the token, then delete it.

**Steps:**
  1. Send `GET /api/bugs`.
    - expect: No bug with that ID is in the list.

### 4. GET /api/bugs/:id

#### 4.1 An existing bug is returned

**File:** `tests/rest-api/get-bug.spec.ts`

**Arrange:** create a bug with the token.

**Steps:**
  1. Send `GET /api/bugs/<id>`.
    - expect: Status `200`, and the body equals the bug returned when it was created.

#### 4.2 A bug that does not exist returns 404

**File:** `tests/rest-api/get-bug.spec.ts`

**Arrange:** create a bug, delete it, and keep its ID.

**Steps:**
  1. Send `GET /api/bugs/<deleted id>`.
    - expect: Status `404`, `{ "error": "not_found", "message": "Bug not found." }`.

#### 4.3 IDs that are not numbers are rejected

**File:** `tests/rest-api/get-bug.spec.ts`

One test per row. Every row expects status `400` and `{ "error": "invalid_id", "message": "Bug ID must be a number." }`.

| `:id` |
|---|
| `abc` |
| `-` |

### 5. POST /api/bugs

#### 5.1 A valid bug is created as Open and returned with its ID

**File:** `tests/rest-api/create-bug.spec.ts`

**Steps:**
  1. Send `{ "title": "<token> created", "severity": "high", "owner": "buggy", "description": "Created by an API test." }`.
    - expect: Status `201`, content type `application/json`.
    - expect: The body has a numeric `id`, the same title, owner and description, `severity` `HIGH` and `state` `OPEN`.
    - expect: `GET /api/bugs/<id>` returns the same bug.

#### 5.2 Each severity is accepted, in any case and with spaces

**File:** `tests/rest-api/create-bug.spec.ts`

One test per row. Every row expects status `201` and the given stored severity.

| `severity` sent | Stored |
|---|---|
| `"high"` | `HIGH` |
| `"MID"` | `MID` |
| `" Low "` | `LOW` |

#### 5.3 Spaces around title, owner and description are removed

**File:** `tests/rest-api/create-bug.spec.ts`

**Steps:**
  1. Send a bug whose title is `"  <token> trimmed  "`, owner `" buggy "` and description `" text "`.
    - expect: Status `201`, with the title `"<token> trimmed"`, owner `"buggy"` and description `"text"`.

#### 5.4 State and ID in the body are ignored

**File:** `tests/rest-api/create-bug.spec.ts`

**Steps:**
  1. Send a valid bug that also has `"state": "closed"` and `"id": 1`.
    - expect: Status `201`, `state` is `OPEN`, and `id` is a new ID, not `1`.

#### 5.5 Long text is accepted

**File:** `tests/rest-api/create-bug.spec.ts`

**Steps:**
  1. Send a valid bug with a 5,000-character title (starting with the token) and a 50,000-character description.
    - expect: Status `201`, and `GET /api/bugs/<id>` returns both texts in full.

#### 5.6 Missing or invalid fields are rejected

**File:** `tests/rest-api/create-bug.spec.ts`

Start each row from a valid body (`title` `"<token> invalid"`, `severity` `"mid"`, `owner` `"buggy"`, `description` `"d"`) and apply the change. One test per row. Every row expects status `400`, and no new bug with the token appears in `GET /api/bugs`.

| Change | `error` | `message` |
|---|---|---|
| `title` removed | `blank_title` | "Title is required." |
| `title` is `"   "` | `blank_title` | "Title is required." |
| `title` is the number `123` | `blank_title` | "Title is required." |
| `severity` removed | `blank_severity` | "Severity is required (high, mid, or low)." |
| `severity` is `"urgent"` | `blank_severity` | "Severity is required (high, mid, or low)." |
| `owner` removed | `blank_owner` | "Owner is required." |
| `owner` is `""` | `blank_owner` | "Owner is required." |
| `description` removed | `blank_description` | "Description is required." |
| `description` is `" "` | `blank_description` | "Description is required." |

### 6. PUT /api/bugs/:id

**Arrange (whole group):** create one bug with the token through `bugsApi` (`severity` `mid`, `owner` `buggy`, `description` `Original`), and keep its ID. "A full valid body" means `title`, `severity`, `owner`, `description` and `state`, all valid.

#### 6.1 A full valid update replaces all fields

**File:** `tests/rest-api/update-bug.spec.ts`

**Steps:**
  1. Send `PUT /api/bugs/<id>` with `{ "title": "<token> updated", "severity": "low", "owner": "zed", "description": "Changed", "state": "closed" }`.
    - expect: Status `200`, and the body has the same `id`, the new values, `severity` `LOW` and `state` `CLOSED`.
    - expect: `GET /api/bugs/<id>` returns the updated bug.

#### 6.2 Fields are trimmed, and severity and state are case-insensitive

**File:** `tests/rest-api/update-bug.spec.ts`

**Steps:**
  1. Send a full body with the title `" <token> spaced "`, owner `" zed "`, `severity` `"High"` and `state` `"Closed"`.
    - expect: Status `200`, with the title `"<token> spaced"`, owner `"zed"`, `severity` `HIGH` and `state` `CLOSED`.

#### 6.3 A closed bug can be reopened

**File:** `tests/rest-api/update-bug.spec.ts`

**Arrange:** close the bug with a full body and `state: "closed"`.

**Steps:**
  1. Send a full body with `state: "open"`.
    - expect: Status `200` and `state` `OPEN`.

#### 6.4 Missing or invalid fields are rejected and nothing is changed

**File:** `tests/rest-api/update-bug.spec.ts`

Start each row from a full valid body and apply the change. One test per row. Every row expects status `400`, and `GET /api/bugs/<id>` still returns the original bug.

| Change | `error` | `message` |
|---|---|---|
| `title` is `""` | `blank_title` | "Title is required." |
| `severity` is `"x"` | `blank_severity` | "Severity is required (high, mid, or low)." |
| `owner` is `""` | `blank_owner` | "Owner is required." |
| `description` is `" "` | `blank_description` | "Description is required." |
| `state` removed | `invalid_state` | "State must be Open or Closed." |
| `state` is `"done"` | `invalid_state` | "State must be Open or Closed." |

#### 6.5 Updating a bug that does not exist returns 404

**File:** `tests/rest-api/update-bug.spec.ts`

**Arrange:** create a bug, delete it, and keep its ID.

**Steps:**
  1. Send a full valid body to `PUT /api/bugs/<deleted id>`.
    - expect: Status `404`, `not_found`.
  2. In a separate test, send `{}` to the same ID.
    - expect: Status `404`, not `400`, because the missing bug is reported before the body is checked.

### 7. DELETE /api/bugs/:id

#### 7.1 An existing bug is deleted

**File:** `tests/rest-api/delete-bug.spec.ts`

**Arrange:** create a bug with the token.

**Steps:**
  1. Send `DELETE /api/bugs/<id>`.
    - expect: Status `204` with an empty body.
    - expect: `GET /api/bugs/<id>` returns `404`.

#### 7.2 Deleting the same bug twice returns 404 the second time

**File:** `tests/rest-api/delete-bug.spec.ts`

**Arrange:** create a bug and delete it.

**Steps:**
  1. Send `DELETE /api/bugs/<id>` again.
    - expect: Status `404`, `not_found`.

### 8. Behaviour shared by all endpoints

#### 8.1 Malformed JSON is rejected

**File:** `tests/rest-api/general.spec.ts`

**Steps:**
  1. Send `POST /api/bugs` with the content type `application/json` and the body `{bad`, passed as a raw string.
    - expect: Status `400`, and no bug is created.
  - Repeat for `POST /api/login` and `PUT /api/bugs/<id>`, one test each.

#### 8.2 Unknown routes and unsupported methods return 404

**File:** `tests/rest-api/general.spec.ts`

One test per row. Every row expects status `404`.

| Request |
|---|
| `GET /api/nope` |
| `PATCH /api/bugs/<id>` |

#### 8.3 Responses allow the frontend's origin

**File:** `tests/rest-api/general.spec.ts`

**Steps:**
  1. Send `GET /api/bugs` directly to the backend at `http://localhost:3000/api/bugs`, bypassing the proxy.
    - expect: The `Access-Control-Allow-Origin` header is `http://localhost:5173`, and `Access-Control-Allow-Methods` lists `GET, POST, PUT, DELETE, OPTIONS`.

### 9. Possible defects to confirm

These scenarios document current behaviour that looks wrong. Write them so they fail if the behaviour changes, mark them clearly, and agree the intended behaviour with the product owner before treating them as bugs.

#### 9.1 Possible defect: a non-string username crashes the server and leaks a stack trace

**File:** `tests/rest-api/login.spec.ts`

**Steps:**
  1. Send `POST /api/login` with `{ "username": 123, "password": "x" }`.
    - OBSERVED: status `500`, an HTML page containing `TypeError: username.trim is not a function` and a stack trace with server file paths.
    - expect (suggested): status `400`, a JSON error such as `blank_username` or `invalid_credentials`, and no stack trace.

#### 9.2 Possible defect: an invalid severity is reported as blank

**File:** `tests/rest-api/create-bug.spec.ts`

**Steps:**
  1. Send a valid bug with `severity` `"urgent"`.
    - OBSERVED: the error code is `blank_severity`, although the severity is not blank. The message, "Severity is required (high, mid, or low).", does list the allowed values.
    - expect (suggested): a separate code such as `invalid_severity`, like the `invalid_state` code used for state.

## Not Covered or Not Verified

- **Non-JSON content types,** such as `text/plain` or form data: the probes for these were not reliable, so check how the backend treats them before adding scenarios.
- **`OPTIONS` preflight:** a preflight request returned `200` with the CORS headers, but there is no explicit `OPTIONS` route, so the response comes from Express's defaults. It is not covered beyond scenario 8.3.
- **Concurrent updates to the same bug:** last write wins, and this is out of scope according to `specs/features/09-edit-bug.md`.
- **Database failure:** `GET /api/health` reports `"database": "error"` if the database cannot be queried. Producing that state would mean breaking the shared database, so it is not covered.
- **Performance and rate limiting:** not specified.
