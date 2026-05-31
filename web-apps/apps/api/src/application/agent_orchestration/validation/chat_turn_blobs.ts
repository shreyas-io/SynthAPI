import { Buffer } from "node:buffer";

import z from "zod";

export const chatTurnBlobMimeTypeDto = z.enum([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const createChatTurnBlobDto = z.object({
  mime_type: chatTurnBlobMimeTypeDto,
  size_bytes: z.number().min(0),
  content: z.instanceof(Buffer),
});

export const listChatTurnBlobsFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  mime_types: chatTurnBlobMimeTypeDto.array().optional(),
});

export const listChatTurnBlobsPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listChatTurnBlobsSortDto = z.object({
  by: z.enum(["created_at"]),
  order: z.enum(["asc", "desc"]),
});
