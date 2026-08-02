import type { Kysely } from "kysely";

import { getActiveOrganizationPlan } from "../../domain/usecases/organizations/plans";
import type { Database } from "../kysely/models";

export type MockApiRequestLogInput = {
  project_id: string;
  mock_api_id: string | null;
  method: string;
  url: string;
  request_headers: Record<string, any>;
  request_body: string | null;
  response_status: number;
  response_headers: Record<string, any>;
  response_body: string | null;
};

export interface IMockApiRequestLogger {
  logRequest(input: MockApiRequestLogInput): Promise<void>;
  destroy(): Promise<void>;
}

export const persistRequestLog = async (
  db: Kysely<Database>,
  data: MockApiRequestLogInput,
): Promise<void> => {
  // 1. Insert the new log
  await db
    .insertInto("mock_api_request_logs")
    .values({
      project_id: data.project_id,
      mock_api_id: data.mock_api_id,
      method: data.method,
      url: data.url,
      request_headers: JSON.stringify(data.request_headers),
      request_body: data.request_body,
      response_status: data.response_status,
      response_headers: JSON.stringify(data.response_headers),
      response_body: data.response_body,
    })
    .execute();

  // 2. Perform efficient cleanup
  // To prevent cleanup on every request, we can sample the cleanup based on probability (e.g. 5%)
  // This is efficient and eventually keeps the count near the limit.
  if (Math.random() < 0.05) {
    const project = await db
      .selectFrom("projects")
      .select("organization_id")
      .where("id", "=", data.project_id)
      .executeTakeFirst();

    if (project) {
      const plan = await getActiveOrganizationPlan(db, project.organization_id);
      const maxLogs = plan?.max_request_logs ?? 1000;

      // Delete logs beyond the max_logs limit using an efficient offset query
      await db.executeQuery(
        db
          .deleteFrom("mock_api_request_logs")
          .where(
            "id",
            "in",
            db
              .selectFrom("mock_api_request_logs")
              .select("id")
              .where("project_id", "=", data.project_id)
              .orderBy("created_at", "desc")
              .offset(maxLogs),
          )
          .compile(),
      );
    }
  }
};
