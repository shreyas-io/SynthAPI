import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table organizations
    add column is_default_for_owner boolean not null default false;

    update organizations
    set is_default_for_owner = true
    where id in (
      select default_organization_id from users where default_organization_id is not null
    );

    create unique index organizations_owner_default_idx
    on organizations(created_by_user_id)
    where is_default_for_owner = true;

    alter table users
    drop column if exists default_organization_id;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists organizations_owner_default_idx;

    alter table organizations
    drop column if exists is_default_for_owner;

    alter table users
    add column default_organization_id uuid references organizations(id);
  `.execute(db);
}
