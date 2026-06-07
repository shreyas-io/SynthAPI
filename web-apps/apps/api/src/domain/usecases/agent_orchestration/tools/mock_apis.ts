import { MockApisUsecase } from "../../mock_api/apis";
import { toolDefinitions } from "./definitions";
import {
  createMockApiToolInputDto,
  getMockApiToolInputDto,
  listMockApisToolInputDto,
  updateMockApiToolInputDto,
} from "./schemas";
import type { ITool } from "./types";
import { assertMockApi, toJson } from "./utils";

export const mockApiTools = {
  list_mock_apis: {
    definition: toolDefinitions.list_mock_apis,
    async execute(ctx, workspace, input) {
      const parsed = listMockApisToolInputDto.parse(input ?? {});
      const mock_apis = MockApisUsecase(ctx);
      const filters: {
        project_ids: string[];
        method?: string;
        path?: string;
        name?: string;
        description?: string;
      } = {
        project_ids: [workspace.project_id],
      };
      if (parsed.method !== undefined) filters.method = parsed.method;
      if (parsed.path !== undefined) filters.path = parsed.path;
      if (parsed.name !== undefined) filters.name = parsed.name;
      if (parsed.description !== undefined) {
        filters.description = parsed.description;
      }

      return toJson(
        await mock_apis.getMockApis(
          filters,
          { limit: parsed.limit, offset: parsed.offset },
          { by: "created_at", order: "desc" },
        ),
      );
    },
  },
  get_mock_api: {
    definition: toolDefinitions.get_mock_api,
    async execute(ctx, workspace, input) {
      const parsed = getMockApiToolInputDto.parse(input);
      const mock_apis = MockApisUsecase(ctx);

      return toJson(
        assertMockApi(
          await mock_apis.getMockApi(parsed.mock_api_id),
          workspace.project_id,
        ),
      );
    },
  },
  create_mock_api: {
    definition: toolDefinitions.create_mock_api,
    async execute(ctx, workspace, input) {
      const parsed = createMockApiToolInputDto.parse(input);
      const mock_apis = MockApisUsecase(ctx);

      return toJson(
        await mock_apis.createMockApi({
          project_id: workspace.project_id,
          method: parsed.method,
          path: parsed.path,
          name: parsed.name,
          description: parsed.description ?? null,
          variables: (parsed.variables as any) ?? null,
        }),
      );
    },
  },
  update_mock_api: {
    definition: toolDefinitions.update_mock_api,
    async execute(ctx, workspace, input) {
      const parsed = updateMockApiToolInputDto.parse(input);
      const mock_apis = MockApisUsecase(ctx);
      const existing = assertMockApi(
        await mock_apis.getMockApi(parsed.mock_api_id),
        workspace.project_id,
      );

      await mock_apis.updateMockApi(existing.id, {
        project_id: workspace.project_id,
        method: parsed.method ?? existing.method,
        path: parsed.path ?? existing.path,
        name: parsed.name ?? existing.name,
        description:
          Object.prototype.hasOwnProperty.call(parsed, "description")
            ? (parsed.description ?? null)
            : existing.description,
        variables: Object.prototype.hasOwnProperty.call(parsed, "variables")
          ? ((parsed.variables as any) ?? null)
          : existing.variables,
      });

      return toJson(await mock_apis.getMockApi(existing.id));
    },
  },
} satisfies Pick<
  Record<string, ITool>,
  "list_mock_apis" | "get_mock_api" | "create_mock_api" | "update_mock_api"
>;
