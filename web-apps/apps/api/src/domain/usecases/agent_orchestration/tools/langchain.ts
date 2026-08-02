import { tool } from "@langchain/core/tools";
import { AgentToolRegistry } from "./registry";
import * as schemas from "./schemas";
import type { AppContext } from "../../../../context";
import { logger } from "../../../../infrastructure/logger";
import type { ToolWorkspaceContext } from "./types";
import { z } from "zod";

export function createLangChainTools(
  ctx: AppContext,
  workspace: ToolWorkspaceContext,
  runs_in_turn: number,
) {
  const registry = AgentToolRegistry();
  const all_tools = registry.getAllTools();

  const langchain_tools = all_tools.map((t) => {
    // Determine the corresponding Zod schema based on the tool's name
    let schema: z.ZodType<any> = z.any();

    // We map the snake_case tool name to the camelCase Dto name
    // e.g. "list_projects" -> "listProjectsToolInputDto"
    const camel_name = t.definition.name.replace(
      /_([a-z])/g,
      (g) => g[1]?.toUpperCase() ?? "",
    );
    const schema_name = `${camel_name}ToolInputDto` as keyof typeof schemas;

    if (schemas[schema_name]) {
      schema = schemas[schema_name] as z.ZodType<any>;
    } else if (
      t.definition.name === "get_project" ||
      t.definition.name === "render_ui_form"
    ) {
      schema =
        t.definition.name === "get_project"
          ? schemas.emptyToolInputDto
          : schemas.renderUiFormToolInputDto;
    }

    return tool(
      async (input) => {
        try {
          const result = await t.execute(ctx, workspace, input, runs_in_turn);
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
