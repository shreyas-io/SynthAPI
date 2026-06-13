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

export type ListResponse<T> = {
  total: number;
  records: T[];
};
