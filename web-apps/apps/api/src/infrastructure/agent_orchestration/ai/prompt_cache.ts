import { createHash } from "node:crypto";

export type PromptCacheOptions = {
  key: string;
  retention: "in_memory" | "24h";
};

export function createPromptCacheOptions(input: {
  model: string;
  system: string;
}): PromptCacheOptions {
  const digest = createHash("sha256")
    .update(input.model)
    .update("\0")
    .update(input.system)
    .digest("hex")
    .slice(0, 40);

  return {
    key: `agent-${digest}`,
    retention: "24h",
  };
}
