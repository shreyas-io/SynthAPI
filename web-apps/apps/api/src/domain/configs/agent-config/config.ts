import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { AppContext } from "../../../server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const system_prompt = fs.readFileSync(
  path.join(__dirname, "system_prompt.md"),
  "utf-8",
);
const compaction_prompt = fs.readFileSync(
  path.join(__dirname, "compaction_prompt.md"),
  "utf-8",
);

export type AgentModelConfig = {
  reasoning?: { effort: "low" | "medium" | "high" };
  models: Array<{
    priority: number;
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
    pricing: {
      input_tokens: number;
      output_tokens: number;
    };
  }>;
};

export type AgentCompactionConfig = AgentModelConfig & {
  enabled: boolean;
  threshold_tokens: number;
};

export type AgentConfig = {
  agent: AgentModelConfig & { prompt: string };
  compaction: AgentCompactionConfig & { prompt: string };
};

export const loadAgentConfig = async (ctx: AppContext): Promise<AgentConfig> => {
  const row = await ctx.db
    .selectFrom("agent_runtime_config")
    .select(["agent_config", "compaction_config"])
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    throw new Error(
      "Agent runtime config is not configured. Insert a row into agent_runtime_config.",
    );
  }

  const agent_config: AgentModelConfig =
    typeof row.agent_config === "string"
      ? JSON.parse(row.agent_config)
      : row.agent_config;

  const compaction_config: AgentCompactionConfig =
    typeof row.compaction_config === "string"
      ? JSON.parse(row.compaction_config)
      : row.compaction_config;

  return {
    agent: { ...agent_config, prompt: system_prompt },
    compaction: { ...compaction_config, prompt: compaction_prompt },
  };
};
