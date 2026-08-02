import type * as z from "zod";
import type { secretsSchema } from "./schema";

export type Secrets = z.infer<typeof secretsSchema>;

export interface ISecrets {
  getSecrets(): Promise<Secrets>;
}
