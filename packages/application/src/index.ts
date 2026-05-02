import z from "zod";

const environment = z.object({
  REDIS_HOST: z.string(),
  REDIS_PASS: z.string(),
  DB_NAME: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
});

type Env = z.infer<typeof environment>;

export type ApplicationDependencies = {
  environment: Env;
};

export type AppContext = ApplicationDependencies;

export const createApplication = (app: ApplicationDependencies) => {
  const env = environment.parse(app.environment);

  return {
    getHealth() {
      return {
        status: "ok",
        timestamp: new Date().toISOString,
      };
    },
  };
};
