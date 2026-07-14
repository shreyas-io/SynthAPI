import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TYPE plan_subscription_status ADD VALUE IF NOT EXISTS 'queued'`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Postgres does not easily allow dropping enum values, so down is a no-op
}
