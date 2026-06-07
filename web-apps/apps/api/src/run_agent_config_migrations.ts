import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AppContext } from "./application/agent_orchestration/context";
import {
  upsertAgentConfig,
  upsertAgentConfigInputSchema,
} from "./domain/usecases/agent_orchestration/agent_configs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(dirname, "../agent_config_migrations");

export const runAgentConfigMigrations = async (
  ctx: AppContext,
): Promise<void> => {
  const files = await fs.readdir(migrationsFolder);
  const jsonFiles = files
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (!jsonFiles.length) return;

  const upsert = upsertAgentConfig(ctx);

  for (const file of jsonFiles) {
    const filePath = path.join(migrationsFolder, file);
    const content = await fs.readFile(filePath, "utf-8");
    const entries = JSON.parse(content);

    if (!Array.isArray(entries)) {
      console.warn(`[agent-config-migrations] ${file}: expected an array, skipping`);
      continue;
    }

    for (let i = 0; i < entries.length; i++) {
      const parsed = upsertAgentConfigInputSchema.safeParse(entries[i]);
      if (!parsed.success) {
        console.warn(
          `[agent-config-migrations] ${file}[${i}]: validation failed — ${parsed.error.message}`,
        );
        continue;
      }

      await upsert(parsed.data);
      console.log(
        `[agent-config-migrations] ${file}[${i}]: upserted "${parsed.data.key}"`,
      );
    }
  }
};
