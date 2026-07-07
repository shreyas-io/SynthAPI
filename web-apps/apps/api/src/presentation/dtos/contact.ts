import z from "zod";

export const createContactMessageDto = z.object({
  name: z.string().min(1).max(255),
  email: z.email().max(255),
  company: z.string().max(255).optional(),
  message: z.string().min(1).max(10_000),
});