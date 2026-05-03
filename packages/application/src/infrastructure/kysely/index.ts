import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";

import type { AppContext } from "../..";
import type { ProjectsTable } from "./models/projects";

const { Pool } = pg;

export type Database = {
  projects: ProjectsTable;
};

export type DatabaseConfig = {
  app: Pick<AppContext, "environment">;
  maxConnections?: number;
};

export type DatabaseHealthResult = {
  status: "ok";
  result: number;
};

export type DatabaseClient = {
  db: Kysely<Database>;
  checkHealth: () => Promise<DatabaseHealthResult>;
  destroy: () => Promise<void>;
};

const buildDatabaseConnectionString = (
  app: Pick<AppContext, "environment">,
): string => {
  const user = encodeURIComponent(app.environment.DB_USER);
  const password = encodeURIComponent(app.environment.DB_PASS);
  const host = app.environment.DB_HOST;
  const port = String(app.environment.DB_PORT);
  const name = app.environment.DB_NAME;

  return `postgres://${user}:${password}@${host}:${port}/${name}`;
};

export const createPostgresDatabase = ({
  app,
  maxConnections = 15,
}: DatabaseConfig): DatabaseClient => {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: buildDatabaseConnectionString(app),
        max: maxConnections,
      }),
    }),
  });

  return {
    db,
    async checkHealth() {
      const result = await sql<{ ok: number }>`select 1 as ok`.execute(db);
      const row = result.rows[0];

      return {
        status: "ok",
        result: row?.ok ?? 0,
      };
    },
    async destroy() {
      await db.destroy();
    },
  };
};
