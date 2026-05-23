import z from "zod";
import { llmConfigDto } from "./generation";

const agentConfigPricingDto = z.record(z.string(), z.number());

const agentPricingConfigDto = z.object({
  chat_config: agentConfigPricingDto,
  chat_fallback_config: agentConfigPricingDto,
  planning_config: agentConfigPricingDto,
  compaction_config: agentConfigPricingDto,
});

export const createAgentConfigDto = z.object({
  key: z.string().max(128),
  name: z.string().max(255),
  description: z.string().nullable(),
  pricing_config: agentPricingConfigDto,
  chat_config: llmConfigDto,
  chat_fallback_config: llmConfigDto,
  planning_config: llmConfigDto,
  compaction_config: llmConfigDto.nullable(),
  compaction_threshold_tokens: z.number().nullable(),
  enabled: z.boolean(),
});

export const updateAgentConfigDto = createAgentConfigDto;

export const listAgentConfigsFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  keys: z.string().array().optional(),
  enabled: z.boolean().optional(),
});

export const listAgentConfigsPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listAgentConfigsSortDto = z.object({
  by: z.enum(["name", "created_at"]),
  order: z.enum(["asc", "desc"]),
});
