import type { ToolDefinition } from "../../../entities/agent_orchestration/tool";
import type { ToolKey } from "../../../entities/agent_orchestration/tool_keys";
import { mockApiResponseTools } from "./mock_api_responses";
import { mockApiTools } from "./mock_apis";
import { projectTools } from "./projects";
import type { ITool } from "./types";

const tools = {
  ...projectTools,
  ...mockApiTools,
  ...mockApiResponseTools,
} satisfies Record<ToolKey, ITool>;

export const AgentToolRegistry = () => ({
  getAllTools(): ITool[] {
    return Object.values(tools);
  },

  getAllToolDefinitions(): ToolDefinition[] {
    return Object.values(tools).map((tool) => tool.definition);
  },

  getToolByName(name: ToolKey): ITool | undefined {
    return tools[name];
  },
});
