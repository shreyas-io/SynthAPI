import type { ToolKey } from "../../entities/agent_orchestration/tool_keys";

export type ToolCallback = (args: Record<string, unknown>) => Promise<unknown>;

export interface IToolExecutor {
  tools: Record<ToolKey, ToolCallback>;
}
