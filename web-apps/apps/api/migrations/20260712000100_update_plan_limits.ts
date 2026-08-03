import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add missing columns if they don't exist yet
  await sql`
    ALTER TABLE plan_types ADD COLUMN IF NOT EXISTS max_projects integer NOT NULL DEFAULT 3;
  `.execute(db);

  await sql`
    ALTER TABLE plan_types ADD COLUMN IF NOT EXISTS rate_limit_req_per_sec integer NOT NULL DEFAULT 10;
  `.execute(db);

  // Update 'basic' plan
  await sql`
    UPDATE plan_types 
    SET 
      default_ai_credits = 0,
      max_org_members = 1,
      max_projects = 3,
      max_request_logs = 1000,
      rate_limit_req_per_sec = 10
    WHERE key = 'basic';
  `.execute(db);

  // Update 'plus' plan
  await sql`
    UPDATE plan_types 
    SET 
      default_ai_credits = 5000,
      max_org_members = 10,
      max_projects = 100,
      max_request_logs = 25000,
      rate_limit_req_per_sec = 100
    WHERE key = 'plus';
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert to old defaults
  await sql`
    UPDATE plan_types 
    SET 
      default_ai_credits = 0,
      max_org_members = 1,
      max_request_logs = 1000,
      max_projects = 3,
      rate_limit_req_per_sec = 10
    WHERE key = 'basic';
  `.execute(db);

  await sql`
    UPDATE plan_types 
    SET 
      default_ai_credits = 1000,
      max_org_members = 10,
      max_request_logs = 25000,
      max_projects = 10,
      rate_limit_req_per_sec = 10
    WHERE key = 'plus';
  `.execute(db);
}
