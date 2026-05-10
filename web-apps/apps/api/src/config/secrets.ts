import { InfisicalSDK } from "@infisical/sdk";
import * as z from "zod";

const secretsSchema = z.object({
  APPLICATION_DB_USER: z.string(),
  APPLICATION_DB_PASS: z.string(),
  APPLICATION_DB_HOST: z.string(),
  APPLICATION_DB_PORT: z
    .union([z.string(), z.number().int()])
    .transform((v) => +v),
  APPLICATION_DB_NAME: z.string(),
  AGENT_ORCHESTRATION_DB_USER: z.string(),
  AGENT_ORCHESTRATION_DB_PASS: z.string(),
  AGENT_ORCHESTRATION_DB_HOST: z.string(),
  AGENT_ORCHESTRATION_DB_PORT: z
    .union([z.string(), z.number().int()])
    .transform((v) => +v),
  AGENT_ORCHESTRATION_DB_NAME: z.string(),
  API_GATEWAY_DB_USER: z.string(),
  API_GATEWAY_DB_PASS: z.string(),
  API_GATEWAY_DB_HOST: z.string(),
  API_GATEWAY_DB_PORT: z
    .union([z.string(), z.number().int()])
    .transform((v) => +v),
  API_GATEWAY_DB_NAME: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.union([z.string(), z.number().int()]).transform((v) => +v),
  REDIS_PASS: z.string(),
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
