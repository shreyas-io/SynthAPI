import { compactionPrompt } from "./compaction_prompt";
import { systemPrompt } from "./system_prompt";

export const AgentConfig = {
  agent: {
    prompt: systemPrompt,
    reasoning: {
      effort: "medium",
    } as const,
    models: [
      {
        priority: 0,
        provider: "deepseek",
        model: "@openrouter-2/deepseek/deepseek-v4-flash",
        temperature: 0.2,
        max_tokens: 30 * 1024,
        pricing: {
          input_tokens: 9e-8,
          output_tokens: 1.8e-7,
        },
      },
      {
        priority: 1,
        provider: "nvidia",
        model: "@openrouter-2/nvidia/nemotron-3-super-120b-a12b:free",
        temperature: 0.2,
        max_tokens: 30 * 1024,
        pricing: {
          input_tokens: 8e-8,
          output_tokens: 4.5e-7,
        },
      },
      {
        priority: 2,
        provider: "nvidia",
        model: "@openrouter-2/nvidia/nemotron-3-super-120b-a12b",
        temperature: 0.2,
        max_tokens: 30 * 1024,
        pricing: {
          input_tokens: 8e-8,
          output_tokens: 4.5e-7,
        },
      },
    ],
  },
  compaction: {
    enabled: true,
    threshold_tokens: 300000,
    prompt: compactionPrompt,
    reasoning: {
      effort: "low",
    } as const,
    models: [
      {
        priority: 0,
        provider: "deepseek",
        model: "@openrouter-2/deepseek/deepseek-v4-flash",
        temperature: 0.2,
        max_tokens: 30 * 1024,
        pricing: {
          input_tokens: 9e-8,
          output_tokens: 1.8e-7,
        },
      },
      {
        priority: 1,
        provider: "nvidia",
        model: "@openrouter-2/nvidia/nemotron-3-super-120b-a12b",
        temperature: 0.2,
        max_tokens: 10 * 1024,
        pricing: {
          input_tokens: 8e-8,
          output_tokens: 4.5e-7,
        },
      },
      {
        priority: 2,
        provider: "nvidia",
        model: "@openrouter-2/nvidia/nemotron-3-super-120b-a12b",
        temperature: 0.2,
        max_tokens: 10 * 1024,
        pricing: {
          input_tokens: 8e-8,
          output_tokens: 4.5e-7,
        },
      },
    ],
  },
};
