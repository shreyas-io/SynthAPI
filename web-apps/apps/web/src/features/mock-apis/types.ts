import type { Variable } from "../projects/types";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type MockApi = {
  id: string;
  project_id: string;
  method: HttpMethod;
  path: string;
  name: string;
  description: string | null;
  variables?: Variable[] | null;
  created_at: string;
};

export type MockApiInput = {
  project_id: string;
  method: HttpMethod;
  path: string;
  name: string;
  description: string | null;
  variables?: Variable[];
};
