import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_apis drop constraint if exists mock_apis_project_method_path_unique;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table mock_apis add constraint mock_apis_project_method_path_unique unique (project_id, method, path);
  `.execute(db);
}
