import { z } from "zod";
import { uuidv7 } from "uuidv7";
import type { AppContext } from "../../../../server";
import { toolKeys } from "../../../entities/agent_orchestration/tool_keys";
import type { AgentConfigEt } from "../../../entities/agent_orchestration/agent_config";
import { llmConfigSchema } from "../../../entities/agent_orchestration/generation";
import type { ToolKey } from "../../../entities/agent_orchestration/tool_keys";
import type { ToolDefinition } from "../../../entities/agent_orchestration/tool";
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
  (ctx: AppContext) =>
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

    const existingConfig = await ctx.db
      .selectFrom("agent_configs")
      .select(["id", "version"])
      .where("key", "=", input.key)
      .executeTakeFirst();

    if (existingConfig && existingConfig.version === input.version) {
      return;
    }

    if (existingConfig) {
      await ctx.db
        .updateTable("agent_configs")
        .set({
          key: config.key,
          name: config.name,
          description: config.description,
          pricing_config: JSON.stringify(config.pricing_config),
          chat_config: JSON.stringify(config.chat_config),
          chat_fallback_config: JSON.stringify(config.chat_fallback_config),
          planning_config: JSON.stringify(config.planning_config),
          compaction_config: JSON.stringify(
            config.compaction_config ?? config.planning_config,
          ),
          compaction_threshold_tokens:
            config.compaction_threshold_tokens ?? 0,
          enabled: config.enabled,
          version: config.version,
        })
        .where("id", "=", existingConfig.id)
        .execute();
    } else {
      await ctx.db
        .insertInto("agent_configs")
        .values({
          id: input.id ?? uuidv7(),
          key: config.key,
          name: config.name,
          description: config.description,
          pricing_config: JSON.stringify(config.pricing_config),
          chat_config: JSON.stringify(config.chat_config),
          chat_fallback_config: JSON.stringify(config.chat_fallback_config),
          planning_config: JSON.stringify(config.planning_config),
          compaction_config: JSON.stringify(
            config.compaction_config ?? config.planning_config,
          ),
          compaction_threshold_tokens:
            config.compaction_threshold_tokens ?? 0,
          enabled: config.enabled,
          version: config.version,
        })
        .executeTakeFirstOrThrow();
    }
  };

export const getAgentConfigByKey =
  (ctx: AppContext) =>
  async (key: string): Promise<AgentConfigEt | undefined> => {
    return (await ctx.db
      .selectFrom("agent_configs")
      .selectAll()
      .where("key", "=", key)
      .executeTakeFirst()) as unknown as AgentConfigEt | undefined;
  };

export const getEnabledAgentConfigs =
  (ctx: AppContext) => async (): Promise<AgentConfigEt[]> => {
    return (await ctx.db
      .selectFrom("agent_configs")
      .selectAll()
      .where("enabled", "=", true)
      .execute()) as unknown as AgentConfigEt[];
  };
