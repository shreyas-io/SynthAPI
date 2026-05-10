import z from "zod";

export const environmentSchema = z.object({
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.union([z.number().int(), z.string()]).transform((v) => +v),
  DB_NAME: z.string(),
  PORTKEY_API_KEY: z.string(),
  PORTKEY_WORKERS_AI_PROVIDER: z.string(),
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_API_TOKEN: z.string(),
});

export type Environment = z.infer<typeof environmentSchema>;
export type ParsedEnvironment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (environment: Environment): ParsedEnvironment =>
  environmentSchema.parse(environment);
