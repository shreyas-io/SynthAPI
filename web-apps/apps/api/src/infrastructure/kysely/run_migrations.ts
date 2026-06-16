import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FileMigrationProvider, Kysely, Migrator } from "kysely";

import { logger } from "../logger";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFolder = path.join(dirname, "../../../migrations");

const logResults = (
  results: Awaited<ReturnType<Migrator["migrateToLatest"]>>["results"],
) => {
  results?.forEach((result) => {
    if (result.status === "Success") {
      logger.info(
        { migration_name: result.migrationName },
        "Database migration succeeded",
      );
    } else if (result.status === "Error") {
      logger.error(
        { migration_name: result.migrationName },
        "Database migration failed",
      );
    }
  });
};

export const runMigrations = async <T>(db: Kysely<T>) => {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });

  const result = await migrator.migrateToLatest();

  logResults(result.results);

  if (result.error) {
    throw result.error;
  }
};

export const rollbackMigrations = async <T>(db: Kysely<T>) => {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });

  const result = await migrator.migrateDown();

  logResults(result.results);

  if (result.error) {
    throw result.error;
  }
};
