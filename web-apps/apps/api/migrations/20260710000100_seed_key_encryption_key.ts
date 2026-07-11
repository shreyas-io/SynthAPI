import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db
    .insertInto("key_encryption_keys")
    .values({
      key_name: "ENCRYPTION_KEY_07_26",
    })
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db
    .deleteFrom("key_encryption_keys")
    .where("key_name", "=", "ENCRYPTION_KEY_07_26")
    .execute();
}
