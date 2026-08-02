import { secretsSchema } from "./schema";
import type { ISecrets, Secrets } from "./types";

export class EnvSecrets implements ISecrets {
  constructor(private env: Record<string, string | undefined>) {}

  async getSecrets(): Promise<Secrets> {
    return secretsSchema.parse(this.env);
  }
}
