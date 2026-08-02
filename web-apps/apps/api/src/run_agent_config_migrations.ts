import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  upsertAgentConfig,
  upsertAgentConfigInputSchema,
} from "./domain/usecases/agent_orchestration/agent_configs";
import { logger } from "./infrastructure/logger";
import type { AppContext } from "./server";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(dirname, "../agent_config_migrations");

export const runAgentConfigMigrations = async (
  ctx: AppContext,
): Promise<void> => {
  const files = await fs.readdir(migrationsFolder);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();

  if (!jsonFiles.length) return;

  const upsert = upsertAgentConfig(ctx);

  for (const file of jsonFiles) {
    const filePath = path.join(migrationsFolder, file);
    const content = await fs.readFile(filePath, "utf-8");
    const entries = JSON.parse(content);

    if (!Array.isArray(entries)) {
      logger.warn({ file }, "Agent config migration expected an array");
      continue;
    }

    for (let i = 0; i < entries.length; i++) {
      const parsed = upsertAgentConfigInputSchema.safeParse(entries[i]);
      if (!parsed.success) {
        logger.warn(
          { err: parsed.error, file, index: i },
          "Agent config migration validation failed",
        );
        continue;
      }

      await upsert(parsed.data);
      logger.info(
        { file, index: i, key: parsed.data.key },
        "Agent config migration upserted",
      );
    }
  }
};
