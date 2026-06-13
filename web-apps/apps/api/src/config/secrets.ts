import { InfisicalSDK } from "@infisical/sdk";
import * as z from "zod";

const emptyStringToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const secretsSchema = z.object({
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.union([z.string(), z.number().int()]).transform((v) => +v),
  DB_NAME: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.union([z.string(), z.number().int()]).transform((v) => +v),
  REDIS_PASSWORD: z.string(),
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_AI_GATEWAY_ID: z.string(),
  CLOUDFLARE_AI_GATEWAY_TOKEN: z.string(),
  PORTKEY_API_KEY: z.string(),
  OPENROUTER_API_KEY: z.preprocess(emptyStringToUndefined, z.string().optional()),
  OLLAMA_BASE_URL: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string(),
  WEB_APP_BASE_URL: z.string(),
  MOCK_API_BASE_URL_TEMPLATE: z.string(),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  MAILERSEND_API_KEY: z.string(),
  MAILERSEND_BASE_URL: z.preprocess(
    emptyStringToUndefined,
    z.string().url().optional(),
  ),
  EMAIL_FROM: z.email(),
  EMAIL_REPLY_TO: z.preprocess(emptyStringToUndefined, z.email().optional()),
  CORS_WHITELISTED_DOMAINS: z.string().transform((v) => {
    try {
      return v.split(",");
    } catch {
      return JSON.parse(v) as string[];
    }
  }),
});

const vaultInputs = z.object({
  INFISICAL_ENVIRONMENT: z.string(),
  INFISICAL_SITE_URL: z.string(),
  INFISICAL_PROJECT_ID: z.string(),
  INFISICAL_SECRET_PATH: z.string(),
  INFISICAL_CLIENT_ID: z.string(),
  INFISICAL_CLIENT_SECRET: z.string(),
});

type Secrets = z.infer<typeof secretsSchema>;

export async function getSecrets(): Promise<Secrets> {
  if (process.env["USE_VAULT_SECRETS"] === "true") {
    const infisicalConfig = vaultInputs.parse(process.env);
    const client = new InfisicalSDK({
      siteUrl: infisicalConfig.INFISICAL_SITE_URL,
    });

    await client.auth().universalAuth.login({
      clientId: infisicalConfig.INFISICAL_CLIENT_ID,
      clientSecret: infisicalConfig.INFISICAL_CLIENT_SECRET,
    });

    const secrets = await client.secrets().listSecretsWithImports({
      environment: infisicalConfig.INFISICAL_ENVIRONMENT,
      projectId: infisicalConfig.INFISICAL_PROJECT_ID,
      secretPath: infisicalConfig.INFISICAL_SECRET_PATH,
      recursive: true,
      expandSecretReferences: true,
      viewSecretValue: true,
    });

    const values = Object.fromEntries(
      secrets.map((s) => [s.secretKey, s.secretValue]),
    );

    return secretsSchema.parse(values);
  } else {
    return secretsSchema.parse(process.env);
  }
}
