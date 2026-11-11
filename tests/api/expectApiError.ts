import { expect, type APIResponse } from "@playwright/test";
import type { ApiError } from "./BugsApiClient";

/** Asserts a JSON error from the API's routes: status, error code and message. */
export async function expectApiError(
  response: APIResponse,
  status: number,
  error: string,
  message: string,
): Promise<void> {
  expect(response.status(), `status of ${response.url()}`).toBe(status);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect((await response.json()) as ApiError).toEqual({ error, message });
}
