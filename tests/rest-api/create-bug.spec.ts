// plan: specs/testing/rest-api.md (5. POST /api/bugs, 9.2)

import { test, expect } from "../fixtures/api";
import { expectApiError } from "../api/expectApiError";
import type { StoredBug } from "../api/BugsApiClient";

test.describe("POST /api/bugs", () => {
  test("creates a valid bug as Open and returns it with its ID", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Arrange
    const payload = {
      title: `${token} created`,
      severity: "high",
      owner: "buggy",
      description: "Created by an API test.",
    };

    // Act
    const response = await request.post("/api/bugs", { data: payload });
    await bugsApi.track(response);

    // Assert
    expect(response.status()).toBe(201);
    expect(response.headers()["content-type"]).toContain("application/json");
    const created = (await response.json()) as StoredBug;
    expect(typeof created.id).toBe("number");
    expect(created).toEqual({
      id: created.id,
      title: payload.title,
      severity: "HIGH",
      owner: payload.owner,
      description: payload.description,
      state: "OPEN",
    });
    expect(await (await request.get(`/api/bugs/${created.id}`)).json()).toEqual(
      created,
    );
  });

  const severities: { sent: string; stored: StoredBug["severity"] }[] = [
    { sent: "high", stored: "HIGH" },
    { sent: "MID", stored: "MID" },
    { sent: " Low ", stored: "LOW" },
  ];

  for (const { sent, stored } of severities) {
    test(`accepts the severity "${sent}" and stores it as ${stored}`, async ({
      request,
      bugsApi,
      token,
    }) => {
      // Act
      const response = await request.post("/api/bugs", {
        data: {
          title: `${token} severity`,
          severity: sent,
          owner: "buggy",
          description: "Severity check.",
        },
      });
      await bugsApi.track(response);

      // Assert
      expect(response.status()).toBe(201);
      expect(((await response.json()) as StoredBug).severity).toBe(stored);
    });
  }

  test("removes spaces around title, owner and description", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Act
    const response = await request.post("/api/bugs", {
      data: {
        title: `  ${token} trimmed  `,
        severity: "mid",
        owner: " buggy ",
        description: " text ",
      },
    });
    await bugsApi.track(response);

    // Assert
    expect(response.status()).toBe(201);
    const created = (await response.json()) as StoredBug;
    expect(created.title).toBe(`${token} trimmed`);
    expect(created.owner).toBe("buggy");
    expect(created.description).toBe("text");
  });

  test("ignores a state and an ID in the body", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Act
    const response = await request.post("/api/bugs", {
      data: {
        title: `${token} ignored fields`,
        severity: "mid",
        owner: "buggy",
        description: "Has state and id.",
        state: "closed",
        id: 1,
      },
    });
    await bugsApi.track(response);

    // Assert
    expect(response.status()).toBe(201);
    const created = (await response.json()) as StoredBug;
    expect(created.state).toBe("OPEN");
    expect(created.id).not.toBe(1);
  });

  test("accepts long text", async ({ request, bugsApi, token }) => {
    // Arrange
    const title = `${token} ${"t".repeat(5000 - token.length - 1)}`;
    const description = "d".repeat(50000);

    // Act
    const response = await request.post("/api/bugs", {
      data: { title, severity: "low", owner: "buggy", description },
    });
    await bugsApi.track(response);

    // Assert
    expect(response.status()).toBe(201);
    const created = (await response.json()) as StoredBug;
    const stored = (await (
      await request.get(`/api/bugs/${created.id}`)
    ).json()) as StoredBug;
    expect(stored.title).toBe(title);
    expect(stored.description).toBe(description);
  });

  const invalidFields: {
    change: string;
    apply: (body: Record<string, unknown>) => void;
    error: string;
    message: string;
  }[] = [
    { change: "title removed", apply: (b) => delete b.title, error: "blank_title", message: "Title is required." },
    { change: 'title is "   "', apply: (b) => (b.title = "   "), error: "blank_title", message: "Title is required." },
    { change: "title is the number 123", apply: (b) => (b.title = 123), error: "blank_title", message: "Title is required." },
    { change: "severity removed", apply: (b) => delete b.severity, error: "blank_severity", message: "Severity is required (high, mid, or low)." },
    { change: 'severity is "urgent"', apply: (b) => (b.severity = "urgent"), error: "blank_severity", message: "Severity is required (high, mid, or low)." },
    { change: "owner removed", apply: (b) => delete b.owner, error: "blank_owner", message: "Owner is required." },
    { change: 'owner is ""', apply: (b) => (b.owner = ""), error: "blank_owner", message: "Owner is required." },
    { change: "description removed", apply: (b) => delete b.description, error: "blank_description", message: "Description is required." },
    { change: 'description is " "', apply: (b) => (b.description = " "), error: "blank_description", message: "Description is required." },
  ];

  for (const { change, apply, error, message } of invalidFields) {
    test(`rejects a bug with ${change}`, async ({ request, bugsApi, token }) => {
      // Arrange
      const body: Record<string, unknown> = {
        title: `${token} invalid`,
        severity: "mid",
        owner: "buggy",
        description: "d",
      };
      apply(body);

      // Act
      const response = await request.post("/api/bugs", { data: body });
      await bugsApi.track(response);

      // Assert
      await expectApiError(response, 400, error, message);
      const bugs = (await (await request.get("/api/bugs")).json()) as StoredBug[];
      expect(bugs.filter((bug) => bug.title.startsWith(token))).toEqual([]);
    });
  }

  test.describe("Possible defects", () => {
    test("an invalid severity is reported as blank", async ({
      request,
      bugsApi,
      token,
    }) => {
      test.info().annotations.push({
        type: "possible defect",
        description:
          "Documents current behaviour (plan 9.2). Suggested: a separate code such as invalid_severity.",
      });

      // Act
      const response = await request.post("/api/bugs", {
        data: {
          title: `${token} urgent`,
          severity: "urgent",
          owner: "buggy",
          description: "d",
        },
      });
      await bugsApi.track(response);

      // Assert: current behaviour
      await expectApiError(
        response,
        400,
        "blank_severity",
        "Severity is required (high, mid, or low).",
      );
    });
  });
});
