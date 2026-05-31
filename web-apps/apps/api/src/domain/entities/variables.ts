type ArrayVariable = {
  name: string;
  type: "array";
  value: string[] | number[] | boolean[];
};

type StringVariable = {
  name: string;
  type: "string";
  value: string;
};

type NumberVariable = {
  name: string;
  type: "number";
  value: number;
};

type BooleanVariable = {
  name: string;
  type: "boolean";
  value: boolean;
};

type ObjectVariable = {
  name: string;
  type: "object";
  value: Record<string, any>;
};

export type VariableEt =
  | ArrayVariable
  | StringVariable
  | NumberVariable
  | BooleanVariable
  | ObjectVariable;
