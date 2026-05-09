import { type VariableEt } from "./variables";

export type ProjectEt = {
  id: string;
  slug: string;
  name: string;
  description: string;
  globals: Array<VariableEt> | null;
  constants: Array<VariableEt> | null;
  created_at: Date;
  updated_at: Date;
};
