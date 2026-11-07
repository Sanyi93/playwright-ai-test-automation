import { expect, type APIRequestContext } from "@playwright/test";

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

  async deleteCreated(): Promise<void> {
    for (const id of this.createdIds.splice(0)) {
      await this.request.delete(`/api/bugs/${id}`);
    }
  }
}
