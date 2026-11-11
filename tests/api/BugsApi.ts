import {
  expect,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";

export type ApiSeverity = "high" | "mid" | "low";

export interface NewBugPayload {
  title: string;
  severity: ApiSeverity;
  owner: string;
  description: string;
}

export interface Bug extends NewBugPayload {
  id: number;
}

/** A bug exactly as the API returns it: severity and state in capitals. */
export interface StoredBug {
  id: number;
  title: string;
  severity: "HIGH" | "MID" | "LOW";
  owner: string;
  description: string;
  state: "OPEN" | "CLOSED";
}

/** The JSON body of an error returned by the API's routes. */
export interface ApiError {
  error: string;
  message: string;
}

/**
 * Seeds and removes bugs through the backend API so tests can arrange their
 * own data. Every bug created here is deleted again by `deleteCreated()`.
 */
export class BugsApi {
  private readonly request: APIRequestContext;
  private readonly createdIds: number[] = [];

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async create(bug: NewBugPayload): Promise<Bug> {
    const response = await this.request.post("/api/bugs", { data: bug });
    expect(response.status(), `create bug "${bug.title}"`).toBe(201);
    const created = (await response.json()) as Bug;
    this.createdIds.push(created.id);
    return created;
  }

  /**
   * Registers a bug created by the request under test (for example a
   * `POST /api/bugs` being tested), so `deleteCreated()` removes it too.
   * Does nothing unless the response is a successful creation.
   */
  async track(response: APIResponse): Promise<void> {
    if (response.status() !== 201) return;
    const body = (await response.json()) as { id?: unknown };
    if (typeof body.id === "number") this.createdIds.push(body.id);
  }

  /** Creates a bug and deletes it again, returning an ID that no bug has. */
  async createDeleted(bug: NewBugPayload): Promise<number> {
    const created = await this.create(bug);
    const response = await this.request.delete(`/api/bugs/${created.id}`);
    expect(response.status(), `delete bug ${created.id}`).toBe(204);
    return created.id;
  }

  async deleteCreated(): Promise<void> {
    for (const id of this.createdIds.splice(0)) {
      await this.request.delete(`/api/bugs/${id}`);
    }
  }
}
