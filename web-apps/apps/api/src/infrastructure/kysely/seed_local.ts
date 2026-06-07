import { getSecrets } from "../../config/secrets";
import { createApiGatewayDatabase } from "./index";

const secrets = await getSecrets();
const database = createApiGatewayDatabase(secrets);

try {
  await database.checkHealth();
} finally {
  await database.destroy();
}
