import { AppContext } from "../server";

export const getPostgresConnString = (ctx: AppContext) => {
  // We use "http://" here because the Node.js URL class does not properly
  // serialize username and password for non-special schemes like "postgresql:"
  const url = new URL("http://localhost");
  url.username = ctx.env.DB_USER;
  url.password = ctx.env.DB_PASS;
  url.hostname = ctx.env.DB_HOST;
  url.port = ctx.env.DB_PORT.toString();
  url.pathname = ctx.env.DB_NAME;

  if (ctx.env.ENV === "production") {
    // pg-connection-string treats "require" as verify-full by default, so we
    // use the non-standard "no-verify" mode to require SSL without validating
    // the server certificate (matching the main Kysely pool config).
    url.searchParams.set("sslmode", "no-verify");
  }

  return url.toString().replace("http:", "postgresql:");
};
