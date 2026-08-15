import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table plan_ai_usage_prices (
      id uuid primary key default uuidv7(),
      plan_type_id uuid not null unique references plan_types(id) on delete cascade,
      credits_per_usd double precision not null,
      min_credit_charge double precision not null,
      web_search_cost_usd double precision not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `.execute(db);

  await sql`
    create trigger plan_ai_usage_prices_set_updated_at
    before update on plan_ai_usage_prices
    for each row execute function set_updated_at();
  `.execute(db);

  await sql`
    insert into plan_ai_usage_prices (plan_type_id, credits_per_usd, min_credit_charge, web_search_cost_usd)
    select id, 4000, 0.01, 0.008
    from plan_types;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists plan_ai_usage_prices_set_updated_at on plan_ai_usage_prices;
  `.execute(db);

  await sql`
    drop table if exists plan_ai_usage_prices;
  `.execute(db);
}
