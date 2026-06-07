import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FileMigrationProvider, Kysely, Migrator } from "kysely";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFolder = path.join(dirname, "../../../migrations");

const logResults = (
  results: Awaited<ReturnType<Migrator["migrateToLatest"]>>["results"],
) => {
  results?.forEach((result) => {
    if (result.status === "Success") {
      console.log(`migration "${result.migrationName}" succeeded`);
    } else if (result.status === "Error") {
      console.error(`migration "${result.migrationName}" failed`);
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
