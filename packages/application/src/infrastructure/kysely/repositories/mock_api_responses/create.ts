import type { MockApiResponseEt } from "../../../../domain/entities/mock_api_response/mock_api_response";
import type { DatabaseClient } from "../../index";
import { uuidv7 } from "uuidv7";

type MockApiResponseInput = Pick<
  MockApiResponseEt,
  | "mock_api_id"
  | "name"
  | "rule_tree"
  | "response"
  | "post_response_actions"
  | "rate_limit_config"
>;

export const createMockApiResponse =
  (client: DatabaseClient) =>
  async (input: MockApiResponseInput): Promise<string> => {
    const id = uuidv7();

    await client.db
      .insertInto("mock_api_responses")
      .values({
        id,
        mock_api_id: input.mock_api_id,
        name: input.name,
        response: JSON.stringify(input.response),
        ...(input.rate_limit_config
          ? { rate_limit_config: JSON.stringify(input.rate_limit_config) }
          : {}),
        ...(input.rule_tree
          ? { rule_tree: JSON.stringify(input.rule_tree) }
          : {}),
        ...(input.post_response_actions
          ? {
              post_response_actions: JSON.stringify(
                input.post_response_actions,
              ),
            }
          : {}),
      })
      .executeTakeFirstOrThrow();

    return id;
  };
