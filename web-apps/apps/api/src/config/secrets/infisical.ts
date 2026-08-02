import { secretsSchema } from "./schema";
import type { ISecrets, Secrets } from "./types";

type InfisicalSecret = {
  secretKey: string;
  secretValue: string;
};

type InfisicalSecretsResponse = {
  secrets: InfisicalSecret[];
  imports?: Array<{ secrets: InfisicalSecret[] }>;
};

type InfisicalConfig = {
  siteUrl: string;
  clientId: string;
  clientSecret: string;
  projectId: string;
  environment: string;
  secretPath: string;
};

type Token = {
  accessToken: string;
  expiresAt: number;
};

const tokenCache = new Map<string, Token>();

async function getAccessToken(config: InfisicalConfig): Promise<string> {
  const cached = tokenCache.get(config.clientId);

  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.accessToken;
  }

  const res = await fetch(`${config.siteUrl}/api/v1/auth/universal-auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Infisical auth failed: ${res.status}`);
  }

  const { accessToken, expiresIn } = (await res.json()) as {
    accessToken: string;
    expiresIn: number;
  };

  tokenCache.set(config.clientId, {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return accessToken;
}

export class InfisicalSecrets implements ISecrets {
  constructor(private config: InfisicalConfig) {}

  async getSecrets(): Promise<Secrets> {
    const accessToken = await getAccessToken(this.config);

    const params = new URLSearchParams({
      projectId: this.config.projectId,
      environment: this.config.environment,
      secretPath: this.config.secretPath,
      viewSecretValue: "true",
      expandSecretReferences: "true",
      recursive: "true",
      includeImports: "true",
    });

    const res = await fetch(
      `${this.config.siteUrl}/api/v4/secrets?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch Infisical secrets: ${res.status}`);
    }

    const data = (await res.json()) as InfisicalSecretsResponse;

    const values = new Map<string, string>();

    for (const imp of data.imports ?? []) {
      for (const secret of imp.secrets) {
        if (!values.has(secret.secretKey)) {
          values.set(secret.secretKey, secret.secretValue);
        }
      }
    }

    for (const secret of data.secrets) {
      values.set(secret.secretKey, secret.secretValue);
    }

    return secretsSchema.parse(Object.fromEntries(values));
  }
}
