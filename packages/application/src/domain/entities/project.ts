type ProjectArrayVariable = {
  name: string;
  type: "array";
  value: string[] | number[] | boolean[];
};

type ProjectStringVariable = {
  name: string;
  type: "string";
  value: string;
};

type ProjectNumberVariable = {
  name: string;
  type: "number";
  value: number;
};

type ProjectBooleanVariable = {
  name: string;
  type: "boolean";
  value: boolean;
};

type ProjectObjectVariable = {
  name: string;
  type: "object";
  value: Record<string, any>;
};

export type ProjectVariableEt =
  | ProjectArrayVariable
  | ProjectStringVariable
  | ProjectNumberVariable
  | ProjectBooleanVariable
  | ProjectObjectVariable;

export type ProjectEt = {
  id: string;
  name: string;
  description: string;
  globals: ProjectVariableEt[];
  constants: ProjectVariableEt[];
  created_at: Date;
  updated_at: Date;
};
