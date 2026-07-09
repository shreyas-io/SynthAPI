import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table organization_credit_usages
    alter column amount type numeric(12,2);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table organization_credit_usages
    alter column amount type int;
  `.execute(db);
}
