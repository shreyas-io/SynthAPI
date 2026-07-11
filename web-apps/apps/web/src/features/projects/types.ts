export type Variable = {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  value: unknown;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  globals?: Variable[] | null;
  constants?: Variable[] | null;
  deleted_at: string | null;
  deleted_by_user_id?: string | null;
  deleted_by?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  created_at?: string;
  created_by?: {
    display_name: string | null;
    avatar_url: string | null;
  };
};

export type ProjectInput = {
  name: string;
  description: string;
  organization_id?: string;
  globals?: Variable[];
  constants?: Variable[];
};

export type ProjectApiKey = {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  key_suffix: string;
  created_by_user_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatedProjectApiKey = ProjectApiKey & {
  api_key: string;
};

export type ListResponse<T> = {
  total: number;
  records: T[];
};

export type RequestLog = {
  id: string;
  project_id: string;
  mock_api_id: string | null;
  method: string;
  url: string;
  request_headers: unknown;
  request_body: unknown | null;
  response_status: number;
  response_headers: unknown;
  response_body: unknown | null;
  created_at: string;
};
