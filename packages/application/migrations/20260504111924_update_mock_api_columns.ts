import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_apis
    alter column method TYPE VARCHAR(16),
    alter column path TYPE text,
    alter column name TYPE VARCHAR(64),
    alter column description TYPE VARCHAR(255);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_apis
      alter column method TYPE text,
      alter column path TYPE text,
      alter column name TYPE text,
      alter column description TYPE text;
  `.execute(db);
}
