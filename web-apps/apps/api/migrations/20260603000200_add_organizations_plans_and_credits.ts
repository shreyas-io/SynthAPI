import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  const ignoreExists = async (promise: Promise<any>) => {
    try { await promise; }
    catch (e: any) {
      if (e.code !== '42710' && e.code !== '42P07' && e.code !== '42701') throw e;
    }
  };

  await ignoreExists(sql`create type organization_member_role as enum ('owner', 'admin', 'member');`.execute(db));
  await ignoreExists(sql`create type organization_membership_status as enum ('active', 'stale');`.execute(db));
  await ignoreExists(sql`create type plan_subscription_status as enum ('active', 'cancelled', 'expired');`.execute(db));
  await ignoreExists(sql`create type organization_credit_grant_type as enum ('ai_credits');`.execute(db));

  await ignoreExists(sql`
    create table if not exists organizations (
      id uuid primary key default uuidv7(),
      name varchar(255) not null,
      created_by_user_id uuid not null references users(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `.execute(db));

  await ignoreExists(sql`
    create table if not exists plan_types (
      id uuid primary key default uuidv7(),
      key varchar(64) not null unique,
      name varchar(255) not null,
      max_org_members int not null,
      default_ai_credits int not null,
      credit_grant_duration_days int not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `.execute(db));

  await ignoreExists(sql`
    create table if not exists organization_memberships (
      id uuid primary key default uuidv7(),
      organization_id uuid not null references organizations(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      role organization_member_role not null,
      status organization_membership_status not null,
      stale_reason varchar(255),
      staled_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint organization_memberships_member_unique unique (organization_id, user_id),
      constraint organization_memberships_owner_active_check check (role <> 'owner' or status = 'active')
    );
  `.execute(db));

  await ignoreExists(sql`
    create table if not exists organization_plan_subscriptions (
      id uuid primary key default uuidv7(),
      organization_id uuid not null references organizations(id) on delete cascade,
      plan_type_id uuid not null references plan_types(id),
      status plan_subscription_status not null,
      starts_at timestamptz not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `.execute(db));

  await ignoreExists(sql`
    create unique index if not exists organization_plan_subscriptions_one_active_idx
    on organization_plan_subscriptions(organization_id)
    where status = 'active';
  `.execute(db));

  await ignoreExists(sql`
    create table if not exists organization_credit_grants (
      id uuid primary key default uuidv7(),
      organization_id uuid not null references organizations(id) on delete cascade,
      grant_type organization_credit_grant_type not null,
      amount int not null,
      source_subscription_id uuid not null references organization_plan_subscriptions(id) on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now(),
      constraint organization_credit_grants_amount_check check (amount >= 0)
    );
  `.execute(db));

  await ignoreExists(sql`
    create table if not exists organization_credit_usages (
      id uuid primary key default uuidv7(),
      organization_id uuid not null references organizations(id) on delete cascade,
      credit_grant_id uuid not null references organization_credit_grants(id) on delete cascade,
      amount int not null,
      source_id uuid,
      created_at timestamptz not null default now(),
      constraint organization_credit_usages_amount_check check (amount > 0)
    );
  `.execute(db));

  await ignoreExists(sql`alter table users add column default_organization_id uuid references organizations(id);`.execute(db));
  await ignoreExists(sql`alter table projects add column organization_id uuid references organizations(id);`.execute(db));

  await ignoreExists(sql`create index if not exists organizations_created_by_user_id_idx on organizations(created_by_user_id);`.execute(db));
  await ignoreExists(sql`create index if not exists organization_memberships_user_id_idx on organization_memberships(user_id);`.execute(db));
  await ignoreExists(sql`create index if not exists organization_memberships_status_idx on organization_memberships(organization_id, status);`.execute(db));
  await ignoreExists(sql`create index if not exists organization_plan_subscriptions_plan_type_id_idx on organization_plan_subscriptions(plan_type_id);`.execute(db));
  await ignoreExists(sql`create index if not exists organization_plan_subscriptions_expires_at_idx on organization_plan_subscriptions(expires_at);`.execute(db));
  await ignoreExists(sql`create index if not exists organization_credit_grants_org_type_expiry_idx on organization_credit_grants(organization_id, grant_type, expires_at);`.execute(db));
  await ignoreExists(sql`create index if not exists organization_credit_grants_subscription_idx on organization_credit_grants(source_subscription_id);`.execute(db));
  await ignoreExists(sql`create index if not exists organization_credit_usages_grant_idx on organization_credit_usages(credit_grant_id);`.execute(db));
  await ignoreExists(sql`create index if not exists organization_credit_usages_org_created_idx on organization_credit_usages(organization_id, created_at);`.execute(db));
  await ignoreExists(sql`create index if not exists projects_organization_id_idx on projects(organization_id);`.execute(db));

  await ignoreExists(sql`
    create trigger organizations_set_updated_at
    before update on organizations
    for each row
    execute function set_updated_at();
  `.execute(db));

  await ignoreExists(sql`
    create trigger plan_types_set_updated_at
    before update on plan_types
    for each row
    execute function set_updated_at();
  `.execute(db));

  await ignoreExists(sql`
    create trigger organization_memberships_set_updated_at
    before update on organization_memberships
    for each row
    execute function set_updated_at();
  `.execute(db));

  await ignoreExists(sql`
    create trigger organization_plan_subscriptions_set_updated_at
    before update on organization_plan_subscriptions
    for each row
    execute function set_updated_at();
  `.execute(db));

  await ignoreExists(sql`
    insert into plan_types (key, name, max_org_members, default_ai_credits, credit_grant_duration_days)
    values
      ('basic', 'Basic', 1, 0, 3650),
      ('plus', 'Plus', 10, 1000, 30)
    on conflict do nothing;
  `.execute(db));

  await ignoreExists(sql`
    insert into organizations (id, name, created_by_user_id)
    select uuidv7(), coalesce(nullif(users.display_name, ''), users.email, 'Default organization'), users.id
    from users
    on conflict do nothing;
  `.execute(db));

  await sql`
    update users
    set default_organization_id = organizations.id
    from organizations
    where organizations.created_by_user_id = users.id
      and users.default_organization_id is null;
  `.execute(db);

  await sql`
    insert into organization_memberships (organization_id, user_id, role, status)
    select users.default_organization_id, users.id, 'owner', 'active'
    from users
    where users.default_organization_id is not null
    on conflict do nothing;
  `.execute(db);

  await sql`

    with plus_plan as (
      select id, default_ai_credits, credit_grant_duration_days
      from plan_types
      where key = 'plus'
    ),
    inserted_subscriptions as (
      insert into organization_plan_subscriptions (
        organization_id,
        plan_type_id,
        status,
        starts_at,
        expires_at
      )
      select
        organizations.id,
        plus_plan.id,
        'active',
        now(),
        now() + (plus_plan.credit_grant_duration_days * interval '1 day')
      from organizations
      cross join plus_plan
      on conflict (organization_id) where status = 'active' do nothing
      returning id, organization_id, plan_type_id, expires_at
    )
    insert into organization_credit_grants (
      organization_id,
      grant_type,
      amount,
      source_subscription_id,
      expires_at
    )
    select
      inserted_subscriptions.organization_id,
      'ai_credits',
      plus_plan.default_ai_credits,
      inserted_subscriptions.id,
      inserted_subscriptions.expires_at
    from inserted_subscriptions
    join plus_plan on plus_plan.id = inserted_subscriptions.plan_type_id;
  `.execute(db);

  await sql`
    update projects
    set organization_id = (
      select users.default_organization_id
      from users
      where users.default_organization_id is not null
      order by users.created_at asc
      limit 1
    )
    where organization_id is null;
  `.execute(db);

  await sql`
    alter table projects
    alter column organization_id set not null;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table projects
    drop column if exists organization_id;

    alter table users
    drop column if exists default_organization_id;

    drop trigger if exists organization_plan_subscriptions_set_updated_at on organization_plan_subscriptions;
    drop trigger if exists organization_memberships_set_updated_at on organization_memberships;
    drop trigger if exists plan_types_set_updated_at on plan_types;
    drop trigger if exists organizations_set_updated_at on organizations;

    drop table if exists organization_credit_usages;
    drop table if exists organization_credit_grants;
    drop table if exists organization_plan_subscriptions;
    drop table if exists organization_memberships;
    drop table if exists plan_types;
    drop table if exists organizations;

    drop type if exists organization_credit_grant_type;
    drop type if exists plan_subscription_status;
    drop type if exists organization_membership_status;
    drop type if exists organization_member_role;
  `.execute(db);
}
