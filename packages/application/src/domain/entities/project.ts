export type ProjectArrayVariable = {
  name: string;
  type: "array";
  value: string[] | number[] | boolean[];
};

export type ProjectStringVariable = {
  name: string;
  type: "string";
  value: string;
};

export type ProjectNumberVariable = {
  name: string;
  type: "number";
  value: number;
};

export type ProjectBooleanVariable = {
  name: string;
  type: "boolean";
  value: boolean;
};

export type ProjectObjectVariable = {
  name: string;
  type: "object";
  value: Record<string, any>;
};

export type ProjectVariable =
  | ProjectArrayVariable
  | ProjectStringVariable
  | ProjectNumberVariable
  | ProjectBooleanVariable
  | ProjectObjectVariable;

export type Project = {
  id: string;
  name: string;
  description: string;
  globals: ProjectVariable[];
  constants: ProjectVariable[];
  created_at: Date;
  updated_at: Date;
};

export type ProjectListItem = Pick<Project, "id" | "name" | "description">;

export type CreateProjectInput = Pick<
  Project,
  "name" | "description" | "globals" | "constants"
>;

export type UpdateProjectInput = CreateProjectInput;
