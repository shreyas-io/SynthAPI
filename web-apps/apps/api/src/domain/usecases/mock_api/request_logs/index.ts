import type { AppContext } from "../../../../context";
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

      let query = ctx.db
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
      const results = records.slice(0, pagination.limit);
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
