import { AppContext } from "../../..";
import { ExecutionContext } from "../../entities/execution_context";
import { MockApiRuleTree } from "../../entities/rule_tree/rule_tree";

export async function execute_rule_tree(
  app: AppContext,
  tree: MockApiRuleTree,
  execution_context: ExecutionContext,
): Promise<{ result: boolean }> {
  return {
    result: false,
  };
}
