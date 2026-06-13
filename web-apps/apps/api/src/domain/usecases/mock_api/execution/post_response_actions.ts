import _ from "lodash";

import type { AppContext } from "../../../../server";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import type { ExecutionContextEt } from "../../../entities/execution_context";
import type { PostResponseActionsEt } from "../../../entities/mock_api_response/post_response_actions";
import { postResponseActionsSchema } from "../../../entities/mock_api_response/post_response_actions_schema";
import {
  GLOBAL_VARIABLE_TTL_SECONDS,
  getGlobalVarKey,
  getLocalVarKey,
  LOCAL_VARIABLE_TTL_SECONDS,
} from "./context";
import { recursivelyMapTemplateParams } from "../utils/template_params";
import { z } from "zod";

type PostResponseAction = PostResponseActionsEt[number];

type ExecutePostResponseActionsInput = {
  project_id: string;
  mock_api_id: string;
  actions: PostResponseActionsEt | null;
  execution_context: ExecutionContextEt;
  allow_scripts?: boolean;
};

const getVariableKey = (
  input: Pick<ExecutePostResponseActionsInput, "project_id" | "mock_api_id">,
  action: Extract<PostResponseAction, { scope: "global" | "local" }>,
) => {
  return action.scope === "global"
    ? getGlobalVarKey(input.project_id, action.key)
    : getLocalVarKey(input.mock_api_id, action.key);
};

const getVariableTtl = (
  action: Extract<PostResponseAction, { scope: "global" | "local" }>,
) => {
  return action.scope === "global"
    ? GLOBAL_VARIABLE_TTL_SECONDS
    : LOCAL_VARIABLE_TTL_SECONDS;
};

const getVariableContext = (
  execution_context: ExecutionContextEt,
  action: Extract<PostResponseAction, { scope: "global" | "local" }>,
) => {
  return action.scope === "global"
    ? execution_context.globals
    : execution_context.variables;
};

const executeVariableAction = async (
  ctx: AppContext,
  input: Pick<
    ExecutePostResponseActionsInput,
    "project_id" | "mock_api_id" | "execution_context"
  >,
  action: Exclude<PostResponseAction, { type: "script" }>,
) => {
  const key = getVariableKey(input, action);
  const ttl_seconds = getVariableTtl(action);
  const variable_context = getVariableContext(input.execution_context, action);

  if (action.type === "unset") {
    await ctx.kvStore.delete(key);
    delete variable_context[action.key];
    return;
  }

  if (action.type === "increment" || action.type === "decrement") {
    const amount = action.type === "increment" ? action.amount : -action.amount;
    const value = await ctx.kvStore.increment(key, amount);
    await ctx.kvStore.set(key, value, { ttl_seconds });
    variable_context[action.key] = value;
    return;
  }

  const value = recursivelyMapTemplateParams(
    action.value,
    input.execution_context,
  );

  if (action.type === "set") {
    await ctx.kvStore.set(key, value, { ttl_seconds });
    variable_context[action.key] = value;
    return;
  }

  const existing_value = await ctx.kvStore.get(key);
  const array_value = existing_value ?? [];

  if (!Array.isArray(array_value)) {
    throw new MockApiException({
      public_message: `Post-response action '${action.type}' requires an array variable.`,
      status_code: HttpStatusCode.BAD_REQUEST,
    });
  }

  const updated_value =
    action.type === "append"
      ? [...array_value, value]
      : array_value.filter((item) => !_.isEqual(item, value));

  await ctx.kvStore.set(key, updated_value, { ttl_seconds });
  variable_context[action.key] = updated_value;
};

export const executePostResponseActions = async (
  ctx: AppContext,
  input: ExecutePostResponseActionsInput,
) => {
  if (!input.actions?.length) return;

  const actions = [...input.actions].sort((a, b) => a.order - b.order);

  for (const action of actions) {
    if (action.type !== "script") {
      await executeVariableAction(ctx, input, action);
      continue;
    }

    if (input.allow_scripts === false) {
      throw new MockApiException({
        public_message:
          "Nested script post-response actions are not supported.",
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    if (!action.code) {
      throw new MockApiException({
        public_message:
          "Script post-response action is missing the 'code' field.",
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    const resp = await ctx.pyodide.execute({
      code: action.code,
      timeout_ms: 5000,
      context: input.execution_context,
    });
    const parsedResult = postResponseActionsSchema.safeParse(resp.result);

    if (!parsedResult.success) {
      throw new MockApiException({
        public_message: `Script post-response action must return an array of valid actions: ${JSON.stringify(z.treeifyError(parsedResult.error))})`,
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    await executePostResponseActions(ctx, {
      ...input,
      actions: parsedResult.data as PostResponseActionsEt,
      allow_scripts: false,
    });
  }
};
