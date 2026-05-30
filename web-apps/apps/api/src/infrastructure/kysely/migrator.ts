import "dotenv/config";

import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import { getSecrets } from "../../config/secrets";
import { rollbackMigrations, runMigrations } from "./run_migrations";

const { Pool } = pg;

type Database = Record<string, never>;

const buildConnectionString = (
  secrets: Awaited<ReturnType<typeof getSecrets>>,
) => {
  const user = encodeURIComponent(secrets.DB_USER);
  const password = encodeURIComponent(secrets.DB_PASS);
  const host = secrets.DB_HOST;
  const port = String(secrets.DB_PORT);
  const name = secrets.DB_NAME;

  return `postgres://${user}:${password}@${host}:${port}/${name}`;
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

  try {
    if (command === "latest") {
      await runMigrations(db);
    } else {
      await rollbackMigrations(db);
    }
  } finally {
    await db.destroy();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
