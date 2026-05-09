import { sql, type Kysely } from "kysely";

const defaultResponseId = "0196f3b0-0000-7000-8000-000000000208";
const mockApiId = "0196f3b0-0000-7000-8000-000000000103";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    update mock_api_responses
    set is_default = false
    where mock_api_id = ${mockApiId}
  `.execute(db);

  await sql`
    update mock_api_responses
    set is_default = true
    where id = ${defaultResponseId}
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    update mock_api_responses
    set is_default = false
    where id = ${defaultResponseId}
  `.execute(db);
}
