import { apiBaseUrl } from "./env";

export type HealthResponse = {
  status: "ok";
  timestamp: string;
};

export type GreetingResponse = {
  message: string;
  target: string;
};

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const getBootstrapData = async () => {
  const [health, greeting] = await Promise.all([
    getJson<HealthResponse>("/health"),
    getJson<GreetingResponse>("/greeting"),
  ]);

  return { health, greeting };
};
