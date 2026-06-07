import { z } from "zod";
import { toolKeys } from "../../../entities/agent_orchestration/tool_keys";
import type { AgentConfigEt } from "../../../entities/agent_orchestration/agent_config";
import { llmConfigSchema } from "../../../entities/agent_orchestration/generation";
import type { ToolKey } from "../../../entities/agent_orchestration/tool_keys";
import type { ToolDefinition } from "../../../entities/agent_orchestration/tool";
import type { IAgentConfigsRepository } from "../../../interfaces/repositories/agent_orchestration/agent_configs";
import { AgentToolRegistry } from "../tools/registry";

const llmConfigInputSchema = llmConfigSchema.extend({
  tool_keys: z.array(z.enum(toolKeys)).optional(),
});

export const upsertAgentConfigInputSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  pricing_config: z.object({
    chat_config: z.record(z.string(), z.number()),
    chat_fallback_config: z.record(z.string(), z.number()),
    planning_config: z.record(z.string(), z.number()),
    compaction_config: z.record(z.string(), z.number()),
  }),
  chat_config: llmConfigInputSchema,
  chat_fallback_config: llmConfigInputSchema,
  planning_config: llmConfigInputSchema,
  compaction_config: llmConfigInputSchema.nullable(),
  compaction_threshold_tokens: z.number().nullable(),
  enabled: z.boolean(),
  version: z.number(),
});

export type UpsertAgentConfigInput = z.infer<
  typeof upsertAgentConfigInputSchema
>;

type LlmConfigInput = z.infer<typeof llmConfigInputSchema>;

const resolveTools = (keys: ToolKey[] | undefined): ToolDefinition[] => {
  const registry = AgentToolRegistry();
  return (keys ?? [])
    .map((key) => registry.getToolByName(key)?.definition ?? null)
    .filter((t): t is ToolDefinition => t !== null);
};

const withResolvedTools = (config: LlmConfigInput) => {
  const { tool_keys, ...rest } = config;
  return { ...rest, custom_tools: resolveTools(tool_keys) };
};

export const upsertAgentConfig =
  (repo: IAgentConfigsRepository) =>
  async (input: UpsertAgentConfigInput): Promise<void> => {
    const config: Omit<AgentConfigEt, "id" | "created_at" | "updated_at"> = {
      key: input.key,
      name: input.name,
      description: input.description,
      pricing_config: input.pricing_config,
      chat_config: withResolvedTools(input.chat_config),
      chat_fallback_config: withResolvedTools(input.chat_fallback_config),
      planning_config: withResolvedTools(input.planning_config),
      compaction_config: input.compaction_config
        ? withResolvedTools(input.compaction_config)
        : null,
      compaction_threshold_tokens: input.compaction_threshold_tokens,
      enabled: input.enabled,
      version: input.version,
    };

    const existing = await repo.list({
      filters: { keys: [input.key] },
      columns: ["id", "version"],
    });
    const existingConfig = existing[0];

    if (existingConfig && existingConfig.version === input.version) {
      return;
    }

    if (existingConfig) {
      await repo.update(existingConfig.id, config);
    } else {
      await repo.create(config, input.id);
    }
  };

export const getAgentConfigByKey =
  (repo: IAgentConfigsRepository) =>
  async (key: string): Promise<AgentConfigEt | undefined> => {
    const results = await repo.list({ filters: { keys: [key] } });
    return results[0];
  };

export const getEnabledAgentConfigs =
  (repo: IAgentConfigsRepository) => async (): Promise<AgentConfigEt[]> => {
    return repo.list({ filters: { enabled: true } });
  };
