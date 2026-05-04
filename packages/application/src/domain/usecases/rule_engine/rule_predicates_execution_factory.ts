import { AppContext } from "../../..";
import { MockApiException } from "../../../exceptions/exception";
import { ExecutionContextEt } from "../../entities/execution_context";
import { MockApiPredicateEt } from "../../entities/mock_api_response/rule_tree";

export async function executePredicate(
  ctx: AppContext,
  predicate: MockApiPredicateEt,
  execution_context: Pick<
    ExecutionContextEt,
    "globals" | "constants" | "system"
  >,
): Promise<boolean> {
  if (predicate.type === "custom") {
    const { result, stderr } = await ctx.pyodide.execute({
      code: predicate.script,
      timeout_ms: 5000,
      context: execution_context,
    });

    if (result) {
      return Boolean(result);
    }

    throw new MockApiException({
      public_message: `Error while executing custom rule tree: ${JSON.stringify(stderr)}`,
    });
  } else if (predicate.type === "simple") {
  }

  throw new MockApiException({
    public_message: `Predicate type not supported: ${predicate.type}`,
  });
}
