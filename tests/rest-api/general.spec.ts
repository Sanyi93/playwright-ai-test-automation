// plan: specs/testing/rest-api.md (8. Behaviour shared by all endpoints)

import { test, expect } from "../fixtures/api";
import type { StoredBug } from "../api/BugsApiClient";

const MALFORMED_JSON = "{bad";
const JSON_HEADERS = { "Content-Type": "application/json" };

test.describe("Behaviour shared by all endpoints", () => {
  test("POST /api/bugs rejects malformed JSON and creates nothing", async ({
    request,
    token,
  }) => {
    // Arrange: a body that would be a valid bug, but with broken JSON syntax
    const malformedBug = `{"title":"${token} malformed","severity":"mid","owner":"buggy","description":"d",}`;

    // Act
    const response = await request.post("/api/bugs", {
      headers: JSON_HEADERS,
      data: malformedBug,
    });

    // Assert
    expect(response.status()).toBe(400);
    expect(response.headers()["content-type"]).toContain("text/html");
    const bugs = (await (await request.get("/api/bugs")).json()) as StoredBug[];
    expect(bugs.filter((bug) => bug.title.startsWith(token))).toEqual([]);
  });

  test("POST /api/login rejects malformed JSON", async ({ request }) => {
    // Act
    const response = await request.post("/api/login", {
      headers: JSON_HEADERS,
      data: MALFORMED_JSON,
    });

    // Assert
    expect(response.status()).toBe(400);
    expect(response.headers()["content-type"]).toContain("text/html");
  });

  test("PUT /api/bugs/:id rejects malformed JSON and changes nothing", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Arrange
    const created = await bugsApi.create({
      title: `${token} malformed update`,
      severity: "mid",
      owner: "buggy",
      description: "Original",
    });

    // Act
    const response = await request.put(`/api/bugs/${created.id}`, {
      headers: JSON_HEADERS,
      data: MALFORMED_JSON,
    });

    // Assert
    expect(response.status()).toBe(400);
    expect(response.headers()["content-type"]).toContain("text/html");
    const stored = (await (
      await request.get(`/api/bugs/${created.id}`)
    ).json()) as StoredBug;
    expect(stored.title).toBe(created.title);
  });

  test("an unknown route returns 404", async ({ request }) => {
    // Act
    const response = await request.get("/api/nope");

    // Assert
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toContain("text/html");
  });

  test("an unsupported method returns 404", async ({
    request,
    bugsApi,
    token,
  }) => {
    // Arrange
    const created = await bugsApi.create({
      title: `${token} patch target`,
      severity: "mid",
      owner: "buggy",
      description: "Target of a PATCH request.",
    });

    // Act
    const response = await request.fetch(`/api/bugs/${created.id}`, {
      method: "PATCH",
      data: { title: `${token} patched` },
    });

    // Assert
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toContain("text/html");
  });

  test("responses allow the frontend's origin", async ({ request }) => {
    // Act: straight to the backend, bypassing the Vite proxy
    const response = await request.get("http://localhost:3000/api/bugs");

    // Assert
    expect(response.status()).toBe(200);
    expect(response.headers()["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers()["access-control-allow-methods"]).toBe(
      "GET, POST, PUT, DELETE, OPTIONS",
    );
  });
});
