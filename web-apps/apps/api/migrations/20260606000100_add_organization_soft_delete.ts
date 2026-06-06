import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table organizations
    add column deleted_at timestamptz;

    create index organizations_deleted_at_idx on organizations(deleted_at);

    alter table projects
    drop constraint if exists projects_organization_id_fkey;

    alter table projects
    add constraint projects_organization_id_fkey
    foreign key (organization_id)
    references organizations(id)
    on delete cascade;

    alter table chat_sessions
    drop constraint if exists chat_sessions_project_id_fkey;

    alter table chat_sessions
    add constraint chat_sessions_project_id_fkey
    foreign key (project_id)
    references projects(id)
    on delete cascade;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table chat_sessions
    drop constraint if exists chat_sessions_project_id_fkey;

    alter table chat_sessions
    add constraint chat_sessions_project_id_fkey
    foreign key (project_id)
    references projects(id);

    alter table projects
    drop constraint if exists projects_organization_id_fkey;

    alter table projects
    add constraint projects_organization_id_fkey
    foreign key (organization_id)
    references organizations(id);

    drop index if exists organizations_deleted_at_idx;

    alter table organizations
    drop column if exists deleted_at;
  `.execute(db);
}
