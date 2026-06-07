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
