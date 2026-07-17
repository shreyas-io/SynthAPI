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
    url.searchParams.set("sslmode", "require");
  }

  return url.toString().replace("http:", "postgresql:");
};
