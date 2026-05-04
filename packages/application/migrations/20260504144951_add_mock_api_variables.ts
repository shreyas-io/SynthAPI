import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE mock_apis
    ADD COLUMN variables JSONB;`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE mock_apis
    DROP COLUMN variables;`.execute(db);
}
