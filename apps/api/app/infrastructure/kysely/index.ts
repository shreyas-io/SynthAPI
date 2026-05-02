import { Kysely, PostgresDialect, sql, type ColumnType } from "kysely";
import pg from "pg";

import type { getSecrets } from "../../config/secrets.js";

const { Pool } = pg;

type Secrets = Awaited<ReturnType<typeof getSecrets>>;

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type UsersTable = {
  id: ColumnType<string, string | undefined, never>;
  username: string;
  password_hash: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AuthorizedSessionsTable = {
  id: ColumnType<string, string | undefined, never>;
  user_id: string;
  token_prefix: string;
  token_suffix: string;
  token_hash: string;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Database = {
  users: UsersTable;
  authorized_sessions: AuthorizedSessionsTable;
};

export type ApiGatewayDatabase = {
  db: Kysely<Database>;
  checkHealth: () => Promise<{ status: "ok"; result: number }>;
  destroy: () => Promise<void>;
};

const buildConnectionString = (secrets: Secrets): string => {
  const user = encodeURIComponent(secrets.API_GATEWAY_DB_USER);
  const password = encodeURIComponent(secrets.API_GATEWAY_DB_PASS);
  const host = secrets.API_GATEWAY_DB_HOST;
  const port = String(secrets.API_GATEWAY_DB_PORT);
  const name = secrets.API_GATEWAY_DB_NAME;

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
