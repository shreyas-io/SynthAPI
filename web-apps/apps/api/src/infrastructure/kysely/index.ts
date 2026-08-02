import { Kysely, sql } from "kysely";
import { CockroachDialect } from "./cockroach_dialect";
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

const buildPoolSslConfig = (): pg.PoolConfig["ssl"] | undefined =>
  process.env["USE_VAULT_SECRETS"] === "true"
    ? { rejectUnauthorized: false }
    : undefined;

export const createDatabaseClient = (secrets: Secrets): ApiGatewayDatabase => {
  const db = new Kysely<Database>({
    dialect: new CockroachDialect({
      pool: new Pool({
        connectionString: buildConnectionString(secrets),
        max: 10,
        ssl: buildPoolSslConfig(),
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
