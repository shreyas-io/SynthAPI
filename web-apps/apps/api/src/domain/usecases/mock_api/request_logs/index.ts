import type { AppContext } from "../../../../server";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import { ProjectsUsecase } from "../projects";

export const RequestLogsUsecase = (ctx: AppContext) => {
  const projects = ProjectsUsecase(ctx);

  return {
    listProjectRequestLogs: async (
      user: AuthenticatedUser,
      projectId: string,
      filters: {
        mock_api_id?: string;
      },
      pagination: {
        limit: number;
        cursor?: string; // base64url encoded ISO string
      },
    ) => {
      const project = await projects.getProject(user, projectId);
      await projects.assertOrganizationAccess(user, project.organization_id);

      let query = ctx.logDb
        .selectFrom("mock_api_request_logs")
        .selectAll()
        .where("project_id", "=", projectId);

      if (filters.mock_api_id) {
        query = query.where("mock_api_id", "=", filters.mock_api_id);
      }

      if (pagination.cursor) {
        const decodedCursor = Buffer.from(pagination.cursor, "base64url").toString("utf-8");
        query = query.where("created_at", "<", new Date(decodedCursor));
      }

      const records = await query
        .orderBy("created_at", "desc")
        .limit(pagination.limit + 1)
        .execute();

      const hasMore = records.length > pagination.limit;
      const results = records.slice(0, pagination.limit).map((record) => {
        const decompressed = record.blob instanceof Buffer ? record.blob.toString("utf-8") : (record.blob as unknown as string);
        const payload = JSON.parse(decompressed);
        const { blob, ...rest } = record;
        return {
          ...rest,
          request_headers: typeof payload.request_headers === 'string' ? payload.request_headers : JSON.stringify(payload.request_headers),
          request_body: payload.request_body,
          response_headers: typeof payload.response_headers === 'string' ? payload.response_headers : JSON.stringify(payload.response_headers),
          response_body: payload.response_body,
        };
      });
      const nextCursor = hasMore 
        ? Buffer.from(results[results.length - 1]!.created_at.toISOString()).toString("base64url") 
        : null;

      return {
        records: results,
        next_cursor: nextCursor,
      };
    },
  };
};
