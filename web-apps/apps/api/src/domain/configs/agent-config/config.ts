import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

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

export const AgentConfig = {
  agent: {
    prompt: system_prompt,
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
    prompt: compaction_prompt,
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
