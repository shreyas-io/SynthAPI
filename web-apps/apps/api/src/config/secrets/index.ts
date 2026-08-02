import { EnvSecrets } from "./env";
import { InfisicalSecrets } from "./infisical";
import { secretsSchema } from "./schema";
import type { ISecrets, Secrets } from "./types";

export { secretsSchema };
export type { ISecrets, Secrets };
export { EnvSecrets, InfisicalSecrets };

export const createSecretsProvider = (
  env: Record<string, string | undefined>,
): ISecrets => {
  if (env["USE_VAULT_SECRETS"] === "true") {
    return new InfisicalSecrets({
      siteUrl: env["INFISICAL_SITE_URL"] ?? "https://us.infisical.com",
      clientId: env["INFISICAL_CLIENT_ID"] ?? "",
      clientSecret: env["INFISICAL_CLIENT_SECRET"] ?? "",
      projectId: env["INFISICAL_PROJECT_ID"] ?? "",
      environment: env["INFISICAL_ENVIRONMENT"] ?? "",
      secretPath: env["INFISICAL_SECRET_PATH"] ?? "/",
    });
  }

  return new EnvSecrets(env);
};

/**
 * Backwards-compatible helper for the existing Node/Express entrypoints.
 * Cloudflare Worker code should use `createSecretsProvider(env).getSecrets()` instead.
 */
export async function getSecrets(): Promise<Secrets> {
  const env =
    (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env ?? {};

  return createSecretsProvider(env).getSecrets();
}
