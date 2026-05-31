import { z } from "zod";
import { toolDefinitionSchema } from "./tool";

export type ToolCallRequest = {
  tool_use_id: string;
  name: string;
  input: string;
  metadata?: unknown;
};

export type ToolCallResponse = {
  tool_use_id: string;
  name: string;
  output: string;
};

export type TextMessageContent = {
  type: "text";
  text: string;
};

export const llmConfigSchema = z.object({
  model_host: z.enum(["openrouter", "ollama", "workers_ai"]),
  model_provider: z.enum(["nvidia", "google", "meta"]),
  model_gateway: z.enum(["cloudflare_aig"]).nullable(),
  model_id: z.string(),
  system_prompt: z.string(),
  input_messages: z.array(
    z.discriminatedUnion("role", [
      z.object({
        role: z.literal("user"),
        content: z.object({ type: z.literal("text"), text: z.string() }),
      }),
      z.object({
        role: z.literal("assistant"),
        content: z.object({ type: z.literal("text"), text: z.string() }),
      }),
      z.object({
        role: z.literal("tool_call_response"),
        content: z.array(
          z.object({
            tool_use_id: z.string(),
            name: z.string(),
            output: z.string(),
          }),
        ),
      }),
    ]),
  ),
  custom_tools: z.array(toolDefinitionSchema),
  temperature: z.number(),
  max_tokens: z.number(),
});

export type LLMConfig = z.infer<typeof llmConfigSchema>;

export type GenerationRequest = {
  config: LLMConfig;
  raw: unknown | null;
};
