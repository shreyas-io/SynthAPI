import type { ToolKey } from "../tool_keys";

export type ToolCallback = (args: Record<string, unknown>) => Promise<unknown>;

export interface IToolExecutor {
  tools: Record<ToolKey, ToolCallback>;
}
