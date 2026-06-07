import argon2 from "argon2";

import { getSecrets } from "../../config/secrets";
import { createApiGatewayDatabase } from "./index";

const username = "test";
const password = "password";

const secrets = await getSecrets();
const database = createApiGatewayDatabase(secrets);

try {
  const existing = await database.db
    .selectFrom("users")
    .select("id")
    .where("username", "=", username)
    .executeTakeFirst();

  if (!existing) {
    await database.db
      .insertInto("users")
      .values({
        username,
        password_hash: await argon2.hash(password, { type: argon2.argon2id }),
      })
      .execute();
  }

} finally {
  await database.destroy();
}
