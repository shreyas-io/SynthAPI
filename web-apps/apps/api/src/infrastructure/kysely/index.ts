import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";

import type { getSecrets } from "../../config/secrets";
import type { Database } from "./models/index";

const { Pool } = pg;

type Secrets = Awaited<ReturnType<typeof getSecrets>>;

export type ApiGatewayDatabase = {
  db: Kysely<Database>;
  checkHealth: () => Promise<{ status: "ok"; result: number }>;
  destroy: () => Promise<void>;
};

export type DatabaseClient = ApiGatewayDatabase;

const buildConnectionString = (secrets: Secrets): string => {
  const user = encodeURIComponent(secrets.DB_USER);
  const password = encodeURIComponent(secrets.DB_PASS);
  const host = secrets.DB_HOST;
  const port = String(secrets.DB_PORT);
  const name = secrets.DB_NAME;

  return `postgres://${user}:${password}@${host}:${port}/${name}`;
};

export const createApiGatewayDatabase = (
  secrets: Secrets,
): ApiGatewayDatabase => {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: buildConnectionString(secrets),
        max: 5,
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
