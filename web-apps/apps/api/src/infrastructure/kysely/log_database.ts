import { Kysely, MysqlDialect, Generated, sql } from 'kysely';
import { createPool } from 'mysql2';

export interface LogDatabase {
  mock_api_request_logs: {
    id: string | Generated<string>;
    project_id: string;
    mock_api_id: string | null;
    method: string;
    url: string;
    response_status: number;
    created_at: Date | Generated<Date>;
    blob: Buffer;
  };
}

export async function createLogDatabaseClient(url: string): Promise<{
  db: Kysely<LogDatabase>;
  destroy: () => Promise<void>;
}> {
  const pool = createPool({
    uri: url,
    connectionLimit: 10,
  });

  const dialect = new MysqlDialect({
    pool
  });

  const db = new Kysely<LogDatabase>({
    dialect,
  });

  await sql`
    CREATE TABLE IF NOT EXISTS mock_api_request_logs (
      id varchar(36) PRIMARY KEY DEFAULT (UUID()),
      project_id varchar(255) NOT NULL,
      mock_api_id varchar(255),
      method varchar(255) NOT NULL,
      url text NOT NULL,
      response_status integer NOT NULL,
      \`blob\` longblob NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX mock_api_request_logs_project_id_idx (project_id),
      INDEX mock_api_request_logs_created_at_idx (created_at)
    ) ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
  `.execute(db);

  return {
    db,
    destroy: async () => {
      await db.destroy();
    }
  };
}
