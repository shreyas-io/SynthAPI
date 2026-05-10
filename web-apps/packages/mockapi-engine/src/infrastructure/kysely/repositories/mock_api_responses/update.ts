import type { MockApiResponseEt } from "../../../../domain/entities/mock_api_response/mock_api_response";
import type { DatabaseClient } from "../../index";

type MockApiResponseInput = Pick<
  MockApiResponseEt,
  | "mock_api_id"
  | "name"
  | "is_default"
  | "rule_tree"
  | "response"
  | "post_response_actions"
>;

export const updateMockApiResponse =
  (client: DatabaseClient) =>
  async (id: string, input: MockApiResponseInput): Promise<void> => {
    await client.db.transaction().execute(async (trx) => {
      if (input.is_default) {
        await trx
          .updateTable("mock_api_responses")
          .set({ is_default: false })
          .where("mock_api_id", "=", input.mock_api_id)
          .where("id", "!=", id)
          .execute();
      }

      await trx
        .updateTable("mock_api_responses")
        .set({
          mock_api_id: input.mock_api_id,
          name: input.name,
          is_default: input.is_default,
          response: JSON.stringify(input.response),
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
        .where("id", "=", id)
        .execute();
    });
  };
