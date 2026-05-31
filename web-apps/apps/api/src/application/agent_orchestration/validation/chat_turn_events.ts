import z from "zod";
import { chatTurnUserInputDto } from "./chat_session_turns";

const textMessageItemDto = z.object({
  type: z.literal("text"),
  source: z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
});

const toolUseDisplayBlockDto = z.object({
  tool_use_id: z.string(),
  label: z.string(),
  content: z.record(z.string(), z.any()),
});

export const chatTurnEventTypeDto = z.enum([
  "user-input",
  "assistant-message",
  "tool-input",
  "tool-response",
]);

const chatTurnEventPayloadDto = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user-input"),
    input: chatTurnUserInputDto,
  }),
  z.object({
    type: z.literal("assistant-message"),
    content: textMessageItemDto.array(),
  }),
  z.object({
    type: z.literal("tool-input"),
    input: toolUseDisplayBlockDto,
  }),
  z.object({
    type: z.literal("tool-result"),
    output: toolUseDisplayBlockDto.extend({
      status: z.enum(["success", "failed"]),
    }),
  }),
]);

export const createChatTurnEventDto = z.object({
  chat_turn_id: z.uuidv7(),
  sequence: z.number().min(0),
  event_type: chatTurnEventTypeDto,
  payload: chatTurnEventPayloadDto,
});

export const listChatTurnEventsFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  chat_turn_ids: z.uuidv7().array().optional(),
  event_types: chatTurnEventTypeDto.array().optional(),
});

export const listChatTurnEventsPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listChatTurnEventsSortDto = z.object({
  by: z.enum(["sequence", "created_at"]),
  order: z.enum(["asc", "desc"]),
});
