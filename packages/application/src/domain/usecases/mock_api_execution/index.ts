import { AppContext } from "../../..";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import { MockApisRepository } from "../../../infrastructure/kysely/repositories/mock_apis";
import { ProjectsRepository } from "../../../infrastructure/kysely/repositories/projects";

async function executeMockApi(ctx: AppContext, id: string, request_data: any) {
  /**
   * First, get the mock api response with this id and then fetch the mock api
   * Second, check redis if all variables for this mock api exist...
   * ...and update TTL for all that exist, else insert again with default values.
   * Third, we map all the inputs of this request - URL, request body, headers, cookies, and rate limit config
   * Fourth, we check if rate limited or not.
   */

  const mock_api_repo = MockApisRepository(ctx.database);
  const projects_repo = ProjectsRepository(ctx.database);

  const mock_api = (
    await mock_api_repo.list({
      filters: { ids: [id] },
      columns: ["project_id", "variables"],
    })
  ).at(0);

  if (!mock_api) {
    throw new MockApiException({
      public_message: `Mock API not found with ID '${id}'`,
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  const project = (
    await projects_repo.list({
      filters: {
        ids: [mock_api.project_id],
      },
      columns: ["constants", "globals"],
    })
  ).at(0);

  if (!project) {
    throw new MockApiException({
      public_message: `Associated project with ID '${mock_api.project_id}' not found for Mock API with ID '${id}'`,
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }
}
