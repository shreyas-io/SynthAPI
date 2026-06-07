import type { AppContext } from "../../../../application/agent_orchestration/context";
import type { ToolDefinition } from "../../../entities/agent_orchestration/tool";

export type ToolWorkspaceContext = {
  project_id: string;
};

export interface ITool {
  definition: ToolDefinition;
  execute: (
    ctx: AppContext,
    workspace: ToolWorkspaceContext,
    input: unknown,
  ) => Promise<unknown>;
}
