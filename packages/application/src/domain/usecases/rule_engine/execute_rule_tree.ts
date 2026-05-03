import { AppContext } from "../../..";
import { ExecutionContextEt } from "../../entities/execution_context";
import { MockApiRuleTreeEt } from "../../entities/mock_api_response/rule_tree";

export async function execute_rule_tree(
  app: AppContext,
  tree: MockApiRuleTreeEt,
  execution_context: ExecutionContextEt,
): Promise<{ result: boolean }> {
  return {
    result: false,
  };
}
