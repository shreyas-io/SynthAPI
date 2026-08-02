import "dotenv/config";

import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import { logger } from "../logger";
import { rollbackMigrations, runMigrations } from "./run_migrations";

const { Pool } = pg;

type Database = Record<string, never>;

const buildConnectionString = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const name = process.env.DB_NAME;

  if (!user || !password || !host || !port || !name) {
    throw new Error(
      "Database connection not configured. Set DATABASE_URL or DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME.",
    );
  }

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
};

const buildPoolSslConfig = (): pg.PoolConfig["ssl"] | undefined =>
  process.env["USE_VAULT_SECRETS"] === "true"
    ? { rejectUnauthorized: false }
    : undefined;

const run = async () => {
  const command = process.argv[2];

  if (command !== "latest" && command !== "down") {
    throw new Error("Usage: pnpm migrate:latest | pnpm migrate:down");
  }

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: buildConnectionString(),
        max: 1,
        ssl: buildPoolSslConfig(),
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
  logger.error({ err: error }, "Database migration command failed");
  process.exit(1);
});
