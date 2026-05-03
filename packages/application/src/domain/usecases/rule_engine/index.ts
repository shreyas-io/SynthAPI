import { AppContext } from "../../..";
import { ExecutionContextEt } from "../../entities/execution_context";
import { MockApiRuleTreeEt } from "../../entities/mock_api_response/rule_tree";

export const RuleTree = (app: AppContext) => {
  return {
    create: (tree: MockApiRuleTreeEt) => {},
    get: (id: string) => {},
    update: (tree: MockApiRuleTreeEt) => {},
    delete: (id: string) => {},
    execute: (tree: MockApiRuleTreeEt, ctx: ExecutionContextEt) => {},
  };
};
