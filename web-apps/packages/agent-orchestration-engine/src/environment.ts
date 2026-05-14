import z from "zod";

export const environmentSchema = z.object({
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.union([z.number().int(), z.string()]).transform((v) => +v),
  DB_NAME: z.string(),
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_AI_GATEWAY_ID: z.string(),
  CLOUDFLARE_AI_GATEWAY_TOKEN: z.string(),
  OPENROUTER_API_KEY: z.string(),
  OLLAMA_BASE_URL: z.string().optional(),
});

export type Environment = z.infer<typeof environmentSchema>;
export type ParsedEnvironment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (environment: Environment): ParsedEnvironment =>
  environmentSchema.parse(environment);
