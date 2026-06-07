import { type VariableEt } from "./variables";

export type ProjectEt = {
  id: string;
  organization_id: string;
  created_by_user_id: string;
  slug: string;
  name: string;
  description: string;
  globals: Array<VariableEt> | null;
  constants: Array<VariableEt> | null;
  deleted_at: Date | null;
  deleted_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  created_by?: {
    display_name: string | null;
    avatar_url: string | null;
  };
};
