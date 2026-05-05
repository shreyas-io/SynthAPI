import { AppContext } from "../../../..";
import { ExecutionContextEt } from "../../../entities/execution_context";
import { MockApiRuleTreeEt } from "../../../entities/mock_api_response/rule_tree";

export async function executeRuleTree(
  app: AppContext,
  tree: MockApiRuleTreeEt,
  execution_context: Pick<
    ExecutionContextEt,
    "globals" | "constants"
  >,
): Promise<{ result: boolean }> {
  return {
    result: false,
  };
}
