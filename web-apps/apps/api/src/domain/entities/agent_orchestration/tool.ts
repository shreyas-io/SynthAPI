type StringParameters = {
  type: "string";
  description: string;
};

type NumberParameters = {
  type: "number";
  description: string;
};

type BooleanParameters = {
  type: "boolean";
  description: string;
};

type AnyParameters = {
  type: string;
  description: string;
};

type ArrayParameters = {
  type: "array";
  description: string;
  items: ToolParameter;
};

type ObjectParameters = {
  type: "object";
  description: string;
  properties: Record<string, ToolParameter>;
  required: Array<string>;
};

type ToolParameter =
  | ObjectParameters
  | StringParameters
  | NumberParameters
  | BooleanParameters
  | ArrayParameters
  | AnyParameters;

import type { ToolKey } from "./tool_keys";

export type ToolDefinition = {
  name: ToolKey;
  description: string;
  input_schema: ObjectParameters;
};
