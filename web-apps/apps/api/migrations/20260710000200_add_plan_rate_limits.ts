import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table plan_types
    add column rate_limit_req_per_sec integer not null default 10;
  `.execute(db);

  await sql`
    update plan_types set rate_limit_req_per_sec = 10 where key = 'basic';
    update plan_types set rate_limit_req_per_sec = 100 where key = 'plus';
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table plan_types
    drop column rate_limit_req_per_sec;
  `.execute(db);
}
