import z from "zod";
import {
  agentModelGatewayDto,
  agentModelHostDto,
  agentModelProviderDto,
} from "./generation";

export const chatTurnModeDto = z.enum(["execution", "planning"]);
export const chatTurnStatusDto = z.enum([
  "in_progress",
  "completed",
  "failed",
]);

const textMessageItemDto = z.object({
  type: z.literal("text"),
  source: z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
});

const fileMessageItemDto = z.object({
  type: z.literal("file"),
  source: z.object({
    type: z.literal("blob_store"),
    id: z.uuidv7(),
  }),
});

export const chatTurnUserInputDto = z.array(
  z.discriminatedUnion("type", [textMessageItemDto, fileMessageItemDto]),
);

export const conversationContextDto = z.object({
  model_host: agentModelHostDto,
  model_provider: agentModelProviderDto,
  model_gateway: agentModelGatewayDto,
  model_id: z.string(),
  raw_context: z.unknown(),
});

export const createChatSessionTurnDto = z.object({
  chat_session_id: z.uuidv7(),
  mode: chatTurnModeDto,
  user_input: chatTurnUserInputDto,
  conversation_context: conversationContextDto.nullable().default(null),
  status: chatTurnStatusDto.default("in_progress"),
});

export const updateChatSessionTurnDto = z.object({
  conversation_context: conversationContextDto.nullable(),
  status: chatTurnStatusDto,
});

export const listChatSessionTurnsFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  chat_session_ids: z.uuidv7().array().optional(),
  modes: chatTurnModeDto.array().optional(),
  statuses: chatTurnStatusDto.array().optional(),
});

export const listChatSessionTurnsPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listChatSessionTurnsSortDto = z.object({
  by: z.enum(["created_at"]),
  order: z.enum(["asc", "desc"]),
});
