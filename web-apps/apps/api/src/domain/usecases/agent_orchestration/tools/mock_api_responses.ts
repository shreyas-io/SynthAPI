import { MockApisUsecase } from "../../mock_api/apis";
import { MockApiResponsesUsecase } from "../../mock_api/responses";
import { toolDefinitions } from "./definitions";
import {
  createMockApiResponseToolInputDto,
  getMockApiResponseToolInputDto,
  listMockApiResponsesToolInputDto,
  updateMockApiResponseToolInputDto,
  reorderMockApiResponsesToolInputDto,
} from "./schemas";
import type { ITool } from "./types";
import { assertMockApi, assertMockApiResponse, toJson } from "./utils";

export const mockApiResponseTools = {
  list_mock_api_responses: {
    definition: toolDefinitions.list_mock_api_responses,
    async execute(ctx, workspace, input) {
      const parsed = listMockApiResponsesToolInputDto.parse(input);
      const mock_apis = MockApisUsecase(ctx);
      assertMockApi(
        await mock_apis.getMockApi(parsed.mock_api_id),
        workspace.project_id,
      );

      const responses = MockApiResponsesUsecase(ctx);
      const filters: {
        mock_api_ids: string[];
        name?: string;
      } = {
        mock_api_ids: [parsed.mock_api_id],
      };
      if (parsed.name !== undefined) filters.name = parsed.name;

      return toJson(
        await responses.getMockApiResponses(
          filters,
          { limit: parsed.limit, offset: parsed.offset },
          { by: "created_at", order: "desc" },
        ),
      );
    },
  },
  get_mock_api_response: {
    definition: toolDefinitions.get_mock_api_response,
    async execute(ctx, workspace, input) {
      const parsed = getMockApiResponseToolInputDto.parse(input);
      const responses = MockApiResponsesUsecase(ctx);
      const response = await responses.getMockApiResponse(parsed.response_id);
      const mock_apis = MockApisUsecase(ctx);
      const mock_api = await mock_apis.getMockApi(response.mock_api_id);

      return toJson(
        assertMockApiResponse(response, mock_api, workspace.project_id),
      );
    },
  },
  create_mock_api_response: {
    definition: toolDefinitions.create_mock_api_response,
    async execute(ctx, workspace, input) {
      const parsed = createMockApiResponseToolInputDto.parse(input);
      const mock_apis = MockApisUsecase(ctx);
      assertMockApi(
        await mock_apis.getMockApi(parsed.mock_api_id),
        workspace.project_id,
      );

      const responses = MockApiResponsesUsecase(ctx);
      return toJson(
        await responses.createMockApiResponse(workspace.user, {
          mock_api_id: parsed.mock_api_id,
          name: parsed.name,
          is_default: parsed.is_default,
          response: parsed.response as any,
          rule_tree: (parsed.rule_tree as any) ?? null,
          post_response_actions: (parsed.post_response_actions as any) ?? null,
          ...(parsed.execution_order !== undefined
            ? { execution_order: parsed.execution_order }
            : {}),
        }),
      );
    },
  },
  update_mock_api_response: {
    definition: toolDefinitions.update_mock_api_response,
    async execute(ctx, workspace, input) {
      const parsed = updateMockApiResponseToolInputDto.parse(input);
      const responses = MockApiResponsesUsecase(ctx);
      const existing = await responses.getMockApiResponse(parsed.response_id);
      const mock_apis = MockApisUsecase(ctx);
      const mock_api = await mock_apis.getMockApi(existing.mock_api_id);
      assertMockApiResponse(existing, mock_api, workspace.project_id);

      await responses.updateMockApiResponse(workspace.user, existing.id, {
        mock_api_id: existing.mock_api_id,
        name: parsed.name ?? existing.name,
        is_default: parsed.is_default ?? existing.is_default,
        response: (parsed.response as any) ?? existing.response,
        rule_tree: Object.prototype.hasOwnProperty.call(parsed, "rule_tree")
          ? ((parsed.rule_tree as any) ?? null)
          : existing.rule_tree,
        post_response_actions: Object.prototype.hasOwnProperty.call(
          parsed,
          "post_response_actions",
        )
          ? ((parsed.post_response_actions as any) ?? null)
          : existing.post_response_actions,
        execution_order: parsed.execution_order ?? existing.execution_order,
      });

      return toJson(await responses.getMockApiResponse(existing.id));
    },
  },
  reorder_mock_api_responses: {
    definition: toolDefinitions.reorder_mock_api_responses,
    async execute(ctx, workspace, input) {
      const parsed = reorderMockApiResponsesToolInputDto.parse(input);
      const mock_apis = MockApisUsecase(ctx);
      assertMockApi(
        await mock_apis.getMockApi(parsed.mock_api_id),
        workspace.project_id,
      );

      const responses = MockApiResponsesUsecase(ctx);
      await responses.reorderMockApiResponses(
        workspace.user,
        parsed.mock_api_id,
        parsed.response_ids,
      );

      return toJson({ success: true });
    },
  },
} satisfies Pick<
  Record<string, ITool>,
  | "list_mock_api_responses"
  | "get_mock_api_response"
  | "create_mock_api_response"
  | "update_mock_api_response"
  | "reorder_mock_api_responses"
>;
