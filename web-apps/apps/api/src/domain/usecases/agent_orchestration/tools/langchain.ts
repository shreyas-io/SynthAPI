import { tool } from "@langchain/core/tools";
import { AgentToolRegistry } from "./registry";
import { getToolInputDto } from "./schemas";
import type { AppContext } from "../../../../server";
import { logger } from "../../../../infrastructure/logger";
import type { ToolWorkspaceContext } from "./types";

export function createLangChainTools(
  ctx: AppContext,
  workspace: ToolWorkspaceContext,
) {
  const registry = AgentToolRegistry();
  const all_tools = registry.getAllTools();

  // Per-tool invocation count for this turn. Passed to each tool's execute() as
  // runs_in_turn, where it is compared against the tool's per-turn limit
  // (CRUD tools > 100, web_search > 5). Scoped to this turn because
  // createLangChainTools is invoked once per chat turn.
  const runCounts = new Map<string, number>();

  const langchain_tools = all_tools.map((t) => {
    const schema = getToolInputDto(t.definition.name);

    return tool(
      async (input) => {
        const count = (runCounts.get(t.definition.name) ?? 0) + 1;
        runCounts.set(t.definition.name, count);
        try {
          const result = await t.execute(ctx, workspace, input, count);
          return JSON.stringify(result);
        } catch (error: any) {
          logger.error(
            { err: error, tool: t.definition.name },
            "Agent tool execution failed",
          );
          return JSON.stringify({ error: error.message });
        }
      },
      {
        name: t.definition.name,
        description: t.definition.description,
        schema: schema,
      },
    );
  });

  return langchain_tools;
}
