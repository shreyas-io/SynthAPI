import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table organization_credit_usages
    add column user_id uuid references users(id) on delete cascade;

    create index organization_credit_usages_user_id_idx on organization_credit_usages(user_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists organization_credit_usages_user_id_idx;

    alter table organization_credit_usages
    drop column if exists user_id;
  `.execute(db);
}
