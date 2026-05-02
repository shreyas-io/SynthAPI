import { AppContext } from "../../..";
import { ExecutionContext } from "../../entities/execution_context";
import { MockApiRuleTree } from "../../entities/rule_tree/rule_tree";

export const RuleTree = (app: AppContext) => {
  return {
    create: (tree: MockApiRuleTree) => {},
    get: (id: string) => {},
    update: (tree: MockApiRuleTree) => {},
    delete: (id: string) => {},
    execute: (tree: MockApiRuleTree, ctx: ExecutionContext) => {},
  };
};
