import type { LLMConfig } from "./generation";

type AgentConfigPricing = Record<string, number>;

type AgentPricingConfig = {
  chat_config: AgentConfigPricing;
  chat_fallback_config: AgentConfigPricing;
  planning_config: AgentConfigPricing;
  compaction_config: AgentConfigPricing;
};

export type AgentConfigEt = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  pricing_config: AgentPricingConfig;
  chat_config: LLMConfig;
  chat_fallback_config: LLMConfig;
  planning_config: LLMConfig;
  compaction_config: LLMConfig | null;
  compaction_threshold_tokens: number | null;
  enabled: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
};
