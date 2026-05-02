import "dotenv/config";

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from "kysely";
import pg from "pg";

import { getSecrets } from "../../config/secrets.js";

const { Pool } = pg;

type Database = Record<string, never>;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFolder = path.join(dirname, "../../../migrations");

const buildConnectionString = (secrets: Awaited<ReturnType<typeof getSecrets>>) => {
  const user = encodeURIComponent(secrets.API_GATEWAY_DB_USER);
  const password = encodeURIComponent(secrets.API_GATEWAY_DB_PASS);
  const host = secrets.API_GATEWAY_DB_HOST;
  const port = String(secrets.API_GATEWAY_DB_PORT);
  const name = secrets.API_GATEWAY_DB_NAME;

  return `postgres://${user}:${password}@${host}:${port}/${name}`;
};

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

const run = async () => {
  const command = process.argv[2];

  if (command !== "latest" && command !== "down") {
    throw new Error("Usage: pnpm migrate:latest | pnpm migrate:down");
  }

  const secrets = await getSecrets();
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: buildConnectionString(secrets),
        max: 1,
      }),
    }),
  });
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });

  try {
    const result =
      command === "latest"
        ? await migrator.migrateToLatest()
        : await migrator.migrateDown();

    logResults(result.results);

    if (result.error) {
      console.error(result.error);
      process.exitCode = 1;
    }
  } finally {
    await db.destroy();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
