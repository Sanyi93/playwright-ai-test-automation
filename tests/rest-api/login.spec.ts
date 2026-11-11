// plan: specs/testing/rest-api.md (2. POST /api/login, 9.1)

import { test, expect } from "../fixtures/api";
import { expectApiError } from "../api/expectApiError";
import users from "../../users.json" with { type: "json" };

const buggy = users.find((u) => u.username === "buggy");
if (!buggy) {
  throw new Error('Default user "buggy" not found in users.json');
}

test.describe("POST /api/login", () => {
  for (const user of users) {
    test(`accepts the valid credentials of user "${user.username}"`, async ({
      request,
    }) => {
      // Act
      const response = await request.post("/api/login", {
        data: { username: user.username, password: user.password },
      });

      // Assert
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ username: user.username });
      expect(await response.text()).not.toContain(user.password);
    });
  }

  const invalidCredentials: { name: string; body: object }[] = [
    { name: "an unknown username", body: { username: "nobody", password: "x" } },
    { name: "a wrong password", body: { username: "buggy", password: "wrong" } },
    {
      name: "the username in a different case",
      body: { username: buggy.username.toUpperCase(), password: buggy.password },
    },
    {
      name: "the password in a different case",
      body: { username: buggy.username, password: buggy.password.toUpperCase() },
    },
    {
      name: "a password with a leading space",
      body: { username: buggy.username, password: ` ${buggy.password}` },
    },
    {
      name: "a password sent as a number",
      body: { username: buggy.username, password: 1970 },
    },
  ];

  for (const { name, body } of invalidCredentials) {
    test(`rejects ${name} with the generic error`, async ({ request }) => {
      // Act
      const response = await request.post("/api/login", { data: body });

      // Assert
      await expectApiError(
        response,
        401,
        "invalid_credentials",
        "Invalid username or password.",
      );
    });
  }

  test.describe("Possible defects", () => {
    test("a non-string username crashes the server with a stack trace", async ({
      request,
    }) => {
      test.info().annotations.push({
        type: "possible defect",
        description:
          "Documents current behaviour (plan 9.1). Suggested: 400 with a JSON error and no stack trace.",
      });

      // Act
      const response = await request.post("/api/login", {
        data: { username: 123, password: "x" },
      });

      // Assert: current behaviour
      expect(response.status()).toBe(500);
      expect(response.headers()["content-type"]).toContain("text/html");
      expect(await response.text()).toContain(
        "TypeError: username.trim is not a function",
      );
    });
  });
});
