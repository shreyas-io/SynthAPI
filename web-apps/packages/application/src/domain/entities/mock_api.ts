import { VariableEt } from "./variables";

export type MockApiEt = {
  id: string;
  project_id: string;
  method: string;
  path: string;
  name: string;
  description: string | null;
  variables: Array<VariableEt> | null;
  created_at: Date;
  updated_at: Date;
};
