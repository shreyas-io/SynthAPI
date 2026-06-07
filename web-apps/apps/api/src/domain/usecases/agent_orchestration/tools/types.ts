import type { AppContext } from "../../../../application/agent_orchestration/context";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import type { ToolDefinition } from "../../../entities/agent_orchestration/tool";

export type ToolWorkspaceContext = {
  project_id: string;
  user: AuthenticatedUser;
};

export interface ITool {
  definition: ToolDefinition;
  execute: (
    ctx: AppContext,
    workspace: ToolWorkspaceContext,
    input: unknown,
  ) => Promise<unknown>;
}
