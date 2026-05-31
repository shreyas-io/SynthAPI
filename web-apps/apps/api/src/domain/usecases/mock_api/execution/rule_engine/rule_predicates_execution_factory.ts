import Ajv from "ajv";
import _ from "lodash";

import type { MockApiContext } from "../../../../../application/mockapi/context";
import { MockApiException } from "../../../../exceptions/exception";
import { ExecutionContextEt } from "../../../../entities/execution_context";
import { MockApiPredicateEt } from "../../../../entities/mock_api_response/rule_tree";
import { recursivelyMapTemplateParams } from "../../utils/template_params";

const ajv = new Ajv();

const executeSimplePredicate = (
  predicate: Extract<MockApiPredicateEt, { type: "simple" }>,
  execution_context: ExecutionContextEt,
): boolean => {
  const actual_value = recursivelyMapTemplateParams(
    predicate.actual,
    execution_context,
  );
  const expected_value =
    "expected" in predicate
      ? recursivelyMapTemplateParams(predicate.expected, execution_context)
      : undefined;

  switch (predicate.operator) {
    case "equals":
      return _.isEqual(expected_value, actual_value);
    case "not_equals":
      return !_.isEqual(expected_value, actual_value);
    case "regex":
      if (
        typeof actual_value !== "string" ||
        typeof expected_value !== "string"
      ) {
        return false;
      }
      return new RegExp(expected_value).test(actual_value);
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
      return Array.isArray(actual_value) && actual_value.includes(expected_value);
    case "is_set":
      return actual_value !== null && actual_value !== undefined;
    case "is_not_set":
      return actual_value === null || actual_value === undefined;
    case "string_empty":
      return actual_value === null || actual_value === undefined || actual_value === "";
    case "string_not_empty":
      return typeof actual_value === "string" && actual_value.length > 0;
    case "string_includes":
      return (
        typeof actual_value === "string" &&
        typeof expected_value === "string" &&
        actual_value.includes(expected_value)
      );
    case "string_not_includes":
      return (
        typeof actual_value === "string" &&
        typeof expected_value === "string" &&
        !actual_value.includes(expected_value)
      );
    case "empty_array":
      return Array.isArray(actual_value) && actual_value.length === 0;
    case "not_empty_array":
      return Array.isArray(actual_value) && actual_value.length !== 0;
    case "valid_json_schema":
      const validate = ajv.compile(expected_value);
      return validate(actual_value);
    default:
      break;
  }

  throw new MockApiException({
    public_message: `Predicate operator not supported: ${predicate?.["operator"]}`,
  });
};

export async function executePredicate(
  ctx: MockApiContext,
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
