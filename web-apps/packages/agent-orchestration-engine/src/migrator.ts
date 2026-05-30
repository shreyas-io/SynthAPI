import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import { rollbackMigrations, runMigrations } from "./run_migrations.js";

const { Pool } = pg;

type Database = Record<string, never>;

const getEnvironment = () => ({
  DB_USER: required("DB_USER"),
  DB_PASS: required("DB_PASS"),
  DB_HOST: required("DB_HOST"),
  DB_PORT: Number(required("DB_PORT")),
  DB_NAME: required("DB_NAME"),
});

const required = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const buildConnectionString = () => {
  const environment = getEnvironment();
  const user = encodeURIComponent(environment.DB_USER);
  const password = encodeURIComponent(environment.DB_PASS);
  const host = environment.DB_HOST;
  const port = String(environment.DB_PORT);
  const name = environment.DB_NAME;

  return `postgres://${user}:${password}@${host}:${port}/${name}`;
};

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
