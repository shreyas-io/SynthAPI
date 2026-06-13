import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create type organization_invite_status as enum ('pending', 'accepted', 'expired', 'revoked');

    create table organization_invites (
      id uuid primary key default uuidv7(),
      organization_id uuid not null references organizations(id) on delete cascade,
      email varchar(255) not null,
      invited_by_user_id uuid not null references users(id),
      role organization_member_role not null,
      status organization_invite_status not null default 'pending',
      expires_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index organization_invites_organization_id_idx on organization_invites(organization_id);
    create index organization_invites_email_idx on organization_invites(email);
    create index organization_invites_status_idx on organization_invites(status);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop table if exists organization_invites;
    drop type if exists organization_invite_status;
  `.execute(db);
}
