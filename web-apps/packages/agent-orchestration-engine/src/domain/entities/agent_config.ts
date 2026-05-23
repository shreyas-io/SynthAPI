import type { LLMConfig } from "./generation";

type AgentPricingConfig = Record<string, number>;

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
  created_at: Date;
  updated_at: Date;
};
