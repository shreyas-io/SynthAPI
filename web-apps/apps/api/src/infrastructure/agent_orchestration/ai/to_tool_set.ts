import { jsonSchema, type ToolSet } from "ai";

import type { ToolDefinition } from "../../../domain/entities/agent_orchestration/tool";

export function toToolSet(tools: Array<ToolDefinition>): ToolSet | undefined {
  if (!tools.length) return undefined;

  const toolSet: ToolSet = {} as ToolSet;

  for (const tool of tools) {
    (toolSet as any)[tool.name] = {
      description: tool.description,
      inputSchema: jsonSchema(
        (tool.input_schema as any) ?? { type: "object", properties: {} },
      ),
    };
  }

  return toolSet;
}
