import Ajv from "ajv";
import _ from "lodash";

import { AppContext } from "../../../..";
import { MockApiException } from "../../../../exceptions/exception";
import { ExecutionContextEt } from "../../../entities/execution_context";
import { MockApiPredicateEt } from "../../../entities/mock_api_response/rule_tree";
import { recursivelyMapTemplateParams } from "../../utils/template_params";

const ajv = new Ajv();

const executeSimplePredicate = (
  predicate: Extract<MockApiPredicateEt, { type: "simple" }>,
  execution_context: ExecutionContextEt,
): boolean => {
  const expected_value = recursivelyMapTemplateParams(
    predicate.value,
    execution_context,
  );

  let actual_value;
  if ("modifier" in predicate) {
    actual_value = recursivelyMapTemplateParams(
      predicate.modifier,
      execution_context,
    );
  }
  switch (predicate.operator) {
    case "equals":
      return _.isEqual(expected_value, actual_value);
    case "not_equals":
      return !_.isEqual(expected_value, actual_value);
    case "regex":
      const regex = actual_value;
      const value = expected_value;
      if (typeof regex !== "string" || typeof value !== "string") {
        return false;
      }
      return new RegExp(regex).test(value);
    case "null":
      return actual_value === null || actual_value === undefined;
    case "not_null":
      return !(actual_value === null || actual_value === undefined);
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      if (
        typeof actual_value !== "number" ||
        typeof expected_value !== "number"
      ) {
        return false;
      }
      const left = actual_value;
      const right = expected_value;
      if (predicate.operator === "gt") return left > right;
      if (predicate.operator === "gte") return left >= right;
      if (predicate.operator === "lt") return left < right;
      return left <= right;
    case "array_includes":
      const arr = expected_value;
      const val_to_find = actual_value;
      return Array.isArray(arr) && arr.includes(val_to_find);
    case "empty_array":
      return Array.isArray(expected_value) && expected_value.length === 0;
    case "not_empty_array":
      return Array.isArray(expected_value) && expected_value.length !== 0;
    case "valid_json_schema":
      const validate = ajv.compile(actual_value);
      return validate(actual_value);
    default:
      break;
  }

  throw new MockApiException({
    public_message: `Predicate operator not supported: ${predicate?.["operator"]}`,
  });
};

export async function executePredicate(
  ctx: AppContext,
  predicate: MockApiPredicateEt,
  execution_context: ExecutionContextEt,
): Promise<boolean> {
  if (predicate.type === "custom") {
    const { result } = await ctx.pyodide.execute({
      code: predicate.script,
      timeout_ms: 5000,
      context: execution_context,
    });

    return Boolean(result);
  }

  return executeSimplePredicate(predicate, execution_context);
}
