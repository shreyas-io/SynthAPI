import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE mock_api_responses
    RENAME COLUMN label TO name;`;
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
