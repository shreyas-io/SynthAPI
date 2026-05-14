import argon2 from "argon2";

import { getSecrets } from "../../config/secrets";
import { createApiGatewayDatabase } from "./index";

const username = process.env["LOCAL_TEST_USER_USERNAME"];
const password = process.env["LOCAL_TEST_USER_PASSWORD"];

if (!username || !password) {
  throw new Error("LOCAL_TEST_USER_USERNAME and LOCAL_TEST_USER_PASSWORD are required.");
}

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
