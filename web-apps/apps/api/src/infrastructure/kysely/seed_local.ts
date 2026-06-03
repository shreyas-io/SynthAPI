import { getSecrets } from "../../config/secrets";
import { createDatabaseClient } from "./index";

const secrets = await getSecrets();
const database = createDatabaseClient(secrets);

try {
  await database.checkHealth();
} finally {
  await database.destroy();
}
