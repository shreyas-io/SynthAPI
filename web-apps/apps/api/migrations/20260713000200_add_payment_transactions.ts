import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create type payment_status as enum ('pending', 'completed', 'failed');

    create table payment_transactions (
      id uuid primary key default uuidv7(),
      organization_id uuid not null references organizations(id) on delete cascade,
      razorpay_transaction_id varchar(255),
      lemonsqueezy_transaction_id varchar(255),
      purchase_type varchar(255) not null,
      plan_type_id uuid references plan_types(id),
      amount int not null,
      currency varchar(10) not null default 'USD',
      status payment_status not null default 'pending',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create unique index payment_transactions_rzp_idx on payment_transactions(razorpay_transaction_id) where razorpay_transaction_id is not null;
    create unique index payment_transactions_ls_idx on payment_transactions(lemonsqueezy_transaction_id) where lemonsqueezy_transaction_id is not null;

    create trigger payment_transactions_set_updated_at
    before update on payment_transactions
    for each row
    execute function set_updated_at();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop trigger if exists payment_transactions_set_updated_at on payment_transactions;
    drop table if exists payment_transactions;
    drop type if exists payment_status;
  `.execute(db);
}
