import type { AppContext } from "../../../../../server";
import { ExecutionContextEt } from "../../../../entities/execution_context";
import { MockApiRuleTreeEt } from "../../../../entities/mock_api_response/rule_tree";
import { executePredicate } from "./rule_predicates_execution_factory";

export async function executeRuleTree(
  app: AppContext,
  tree: MockApiRuleTreeEt,
  execution_context: ExecutionContextEt,
): Promise<{ result: boolean }> {
  if (tree.type === "and") {
    for (const predicate of tree.predicates) {
      // TODO: run in parallel
      if (!(await executePredicate(app, predicate, execution_context))) {
        return { result: false };
      }
    }

    for (const child of tree.children ?? []) {
      const { result } = await executeRuleTree(app, child, execution_context);

      if (!result) {
        return { result: false };
      }
    }

    return { result: true };
  }

  // TODO: Use Promise.race
  for (const predicate of tree.predicates) {
    if (await executePredicate(app, predicate, execution_context)) {
      return { result: true };
    }
  }

  for (const child of tree.children ?? []) {
    const { result } = await executeRuleTree(app, child, execution_context);

    if (result) {
      return { result: true };
    }
  }

  return {
    result: false,
  };
}
