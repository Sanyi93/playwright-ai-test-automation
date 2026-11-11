// plan: specs/testing/rest-api.md (6. PUT /api/bugs/:id)

import { test, expect } from "../fixtures/api";
import { expectApiError } from "../api/expectApiError";
import type { StoredBug } from "../api/BugsApiClient";

/** The bug each test updates, created in beforeEach. */
let original: StoredBug;

/** A full valid body for PUT: every field is required. */
function fullBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: original.title,
    severity: "mid",
    owner: "buggy",
    description: "Original",
    state: "open",
    ...overrides,
  };
}

test.describe("PUT /api/bugs/:id", () => {
  // Arrange (shared): a fresh bug to update
  test.beforeEach(async ({ bugsApi, token }) => {
    const created = await bugsApi.create({
      title: `${token} to update`,
      severity: "mid",
      owner: "buggy",
      description: "Original",
    });
    original = { ...created, severity: "MID", state: "OPEN" };
  });

  test("a full valid update replaces all fields", async ({ request, token }) => {
    // Act
    const response = await request.put(`/api/bugs/${original.id}`, {
      data: {
        title: `${token} updated`,
        severity: "low",
        owner: "zed",
        description: "Changed",
        state: "closed",
      },
    });

    // Assert
    expect(response.status()).toBe(200);
    const expected: StoredBug = {
      id: original.id,
      title: `${token} updated`,
      severity: "LOW",
      owner: "zed",
      description: "Changed",
      state: "CLOSED",
    };
    expect(await response.json()).toEqual(expected);
    expect(await (await request.get(`/api/bugs/${original.id}`)).json()).toEqual(
      expected,
    );
  });

  test("trims fields and accepts severity and state in any case", async ({
    request,
    token,
  }) => {
    // Act
    const response = await request.put(`/api/bugs/${original.id}`, {
      data: fullBody({
        title: ` ${token} spaced `,
        owner: " zed ",
        severity: "High",
        state: "Closed",
      }),
    });

    // Assert
    expect(response.status()).toBe(200);
    const updated = (await response.json()) as StoredBug;
    expect(updated.title).toBe(`${token} spaced`);
    expect(updated.owner).toBe("zed");
    expect(updated.severity).toBe("HIGH");
    expect(updated.state).toBe("CLOSED");
  });

  test("reopens a closed bug", async ({ request }) => {
    // Arrange
    const closeResponse = await request.put(`/api/bugs/${original.id}`, {
      data: fullBody({ state: "closed" }),
    });
    expect(closeResponse.status()).toBe(200);

    // Act
    const response = await request.put(`/api/bugs/${original.id}`, {
      data: fullBody({ state: "open" }),
    });

    // Assert
    expect(response.status()).toBe(200);
    expect(((await response.json()) as StoredBug).state).toBe("OPEN");
  });

  const invalidFields: {
    change: string;
    apply: (body: Record<string, unknown>) => void;
    error: string;
    message: string;
  }[] = [
    { change: 'title is ""', apply: (b) => (b.title = ""), error: "blank_title", message: "Title is required." },
    { change: 'severity is "x"', apply: (b) => (b.severity = "x"), error: "blank_severity", message: "Severity is required (high, mid, or low)." },
    { change: 'owner is ""', apply: (b) => (b.owner = ""), error: "blank_owner", message: "Owner is required." },
    { change: 'description is " "', apply: (b) => (b.description = " "), error: "blank_description", message: "Description is required." },
    { change: "state removed", apply: (b) => delete b.state, error: "invalid_state", message: "State must be Open or Closed." },
    { change: 'state is "done"', apply: (b) => (b.state = "done"), error: "invalid_state", message: "State must be Open or Closed." },
  ];

  for (const { change, apply, error, message } of invalidFields) {
    test(`rejects an update with ${change} and changes nothing`, async ({
      request,
    }) => {
      // Arrange
      const body = fullBody({ title: `${original.title} changed` });
      apply(body);

      // Act
      const response = await request.put(`/api/bugs/${original.id}`, {
        data: body,
      });

      // Assert
      await expectApiError(response, 400, error, message);
      expect(
        await (await request.get(`/api/bugs/${original.id}`)).json(),
      ).toEqual(original);
    });
  }

  test("returns 404 for a bug that does not exist", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Arrange
    const deletedId = await bugsApi.createDeleted({
      title: `${token} gone`,
      severity: "mid",
      owner: "buggy",
      description: "Deleted by an API test.",
    });

    // Act
    const response = await request.put(`/api/bugs/${deletedId}`, {
      data: fullBody(),
    });

    // Assert
    await expectApiError(response, 404, "not_found", "Bug not found.");
  });

  test("reports a missing bug before checking the body", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Arrange
    const deletedId = await bugsApi.createDeleted({
      title: `${token} gone`,
      severity: "mid",
      owner: "buggy",
      description: "Deleted by an API test.",
    });

    // Act
    const response = await request.put(`/api/bugs/${deletedId}`, { data: {} });

    // Assert
    await expectApiError(response, 404, "not_found", "Bug not found.");
  });
});
