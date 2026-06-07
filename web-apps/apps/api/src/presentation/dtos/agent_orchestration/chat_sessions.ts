import z from "zod";

export const chatSessionStatusDto = z.enum(["active", "archived"]);

export const createChatSessionDto = z.object({
  agent_config_id: z.uuidv7(),
  project_id: z.uuidv7(),
  name: z.string().max(255),
  description: z.string().max(2048).nullable(),
  status: chatSessionStatusDto.default("active"),
});

export const createProjectChatSessionDto = z.object({
  name: z.string().max(255),
  description: z.string().max(2048).nullable().optional(),
});

export const updateChatSessionDto = z.object({
  name: z.string().max(255),
  description: z.string().max(2048).nullable(),
  status: chatSessionStatusDto,
});

export const listChatSessionsFilterDto = z.object({
  ids: z.uuidv7().array().optional(),
  agent_config_ids: z.uuidv7().array().optional(),
  project_ids: z.uuidv7().array().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  statuses: chatSessionStatusDto.array().optional(),
});

export const listChatSessionsPaginationDto = z.object({
  limit: z.number().min(0).max(100),
  offset: z.number().min(0),
});

export const listChatSessionsSortDto = z.object({
  by: z.enum(["name", "created_at"]),
  order: z.enum(["asc", "desc"]),
});
