import z from "zod";

export const environmentSchema = z.object({
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.number().int(),
  DB_NAME: z.string(),
});

export type Environment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (environment: Environment): Environment =>
  environmentSchema.parse(environment);
