import z from "zod";

export const agentModelHostDto = z.enum([
  "openrouter",
  "ollama",
  "workers_ai",
]);

export const agentModelProviderDto = z.enum(["nvidia", "google", "meta"]);

export const agentModelGatewayDto = z.enum(["cloudflare_aig"]).nullable();

export const textMessageContentDto = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const toolCallResponseDto = z.object({
  tool_use_id: z.string(),
  name: z.string(),
  output: z.string(),
});

const inputMessageDto = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: textMessageContentDto,
  }),
  z.object({
    role: z.literal("assistant"),
    content: textMessageContentDto,
  }),
  z.object({
    role: z.literal("tool_call_response"),
    content: toolCallResponseDto.array(),
  }),
]);

import { toolKeys } from "../../../domain/entities/agent_orchestration/tool_keys";

const toolDefinitionDto = z.object({
  name: z.enum(toolKeys),
  description: z.string(),
  input_schema: z.object({
    type: z.literal("object"),
    description: z.string(),
    properties: z.record(z.string(), z.any()),
    required: z.array(z.string()),
  }),
});

export const llmConfigDto = z.object({
  model_host: agentModelHostDto,
  model_provider: agentModelProviderDto,
  model_gateway: agentModelGatewayDto,
  model_id: z.string(),
  system_prompt: z.string(),
  input_messages: inputMessageDto.array(),
  tools: z.unknown().array(),
  custom_tools: toolDefinitionDto.array(),
  temperature: z.number(),
  max_tokens: z.number(),
});

export const generationRequestDto = z.object({
  config: llmConfigDto,
  raw: z.unknown().nullable(),
});
