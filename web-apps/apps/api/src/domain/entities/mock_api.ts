import { VariableEt } from "./variables";

export type MockApiEt = {
  id: string;
  project_id: string;
  method: string;
  path: string;
  name: string;
  description: string | null;
  variables: Array<VariableEt> | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
